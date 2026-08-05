/**
 *  created by yaojun on 2026/8/5
 *
 *  连线层：SVG 贝塞尔曲线绘制页面内所有组件连线。
 *
 *  设计要点：
 *  - 连线数据只存引用（properties.connections = [{ id, anchor, targetId, targetAnchor }]），
 *    端点坐标在渲染时由组件 transform 实时计算 —— 组件拖动/缩放/Stage 缩放/滚动时连线自动跟随，无需同步逻辑
 *  - 坐标累加父容器：block/group 子组件的 transform 是相对坐标，锚点需沿 parent 链累加
 *  - 目标组件不存在的连线（悬空引用）渲染时过滤
 *
 *  两种使用模式：
 *  - 编辑器：监听 controllers_change（数据变化）/ component_drag（拖动）刷新
 *  - 预览：传 items prop 静态渲染（只读）
 */
import React from 'react';
import Event from '../Base/Event';
import { component_drag, component_inactive, controllers_change, link_remove, link_style_change } from '../util/actions';

export const ANCHORS = ['left', 'top', 'right', 'bottom'];

/** 锚点方向向量 */
export const anchorDir = (anchor) => {
  switch (anchor) {
    case 'left':
      return [-1, 0];
    case 'right':
      return [1, 0];
    case 'top':
      return [0, -1];
    case 'bottom':
      return [0, 1];
    default:
      return [0, 0];
  }
};

/** 沿 parent 链累加得到画布绝对坐标（block/group 子组件 transform 为相对坐标） */
export const absolutePos = (item) => {
  let pos = { x: 0, y: 0 };
  while (item) {
    let t = item.transform || {};
    pos.x += t.x || 0;
    pos.y += t.y || 0;
    item = item.parent;
  }
  return pos;
};

/** 由绝对坐标 + transform + 锚点方向计算锚点画布坐标；offset 为沿锚点方向的外移量
 *  （控制点圆显示在组件边缘外侧，避免与 ViewResizable 边中点 resize 手柄重叠）。
 *  旋转组件：先算本地锚点（含外移），再绕组件中心旋转 —— 锚点/连线端点跟随组件实际边缘
 *  （组件容器 CSS transform: rotate 默认以中心为原点） */
export const anchorPoint = (m, anchor, offset = 0) => {
  let t = m.transform || {};
  let x = m.x || 0;
  let y = m.y || 0;
  let w = t.width || 0;
  let h = t.height || 0;
  let rotation = t.rotation || 0;
  let cx = x + w / 2;
  let cy = y + h / 2;
  let p;
  switch (anchor) {
    case 'left':
      p = { x: -w / 2, y: 0 };
      break;
    case 'right':
      p = { x: w / 2, y: 0 };
      break;
    case 'top':
      p = { x: 0, y: -h / 2 };
      break;
    case 'bottom':
      p = { x: 0, y: h / 2 };
      break;
    default:
      p = { x: 0, y: 0 };
  }
  if (offset) {
    let [dx, dy] = anchorDir(anchor);
    // 外移方向随组件旋转
    p = { x: p.x + dx * offset, y: p.y + dy * offset };
  }
  if (rotation) {
    let rad = (rotation * Math.PI) / 180;
    let cos = Math.cos(rad);
    let sin = Math.sin(rad);
    p = { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
  }
  return { x: cx + p.x, y: cy + p.y };
};

// 锚点控制点相对组件边缘的外移量（画布坐标，与缩放无关；足够大以便点击且不与 resize 手柄重叠）
export const ANCHOR_OFFSET = 16;

/**
 * 三次贝塞尔控制点（标准连接图做法）：
 * 控制点按锚点轴系定向 —— left/right 锚点控制点沿 x 方向，top/bottom 沿 y 方向，
 * 方向取"连接方向"（指向/背离对方），长度 = 该方向距离的一半（最小 40px）。
 * 这样曲线终点切线恒等于连接方向：终点切线 = p1 - c2 即指向目标组件，不会回折
 */
const isHorizontalAnchor = (anchor) => anchor === 'left' || anchor === 'right';

export const linkControls = (p0, p1) => {
  let dx = p1.x - p0.x;
  let dy = p1.y - p0.y;
  let c1, c2;
  if (isHorizontalAnchor(p0.anchor)) {
    c1 = { x: p0.x + Math.sign(dx || 1) * Math.max(40, Math.abs(dx) * 0.5), y: p0.y };
  } else {
    c1 = { x: p0.x, y: p0.y + Math.sign(dy || 1) * Math.max(40, Math.abs(dy) * 0.5) };
  }
  if (isHorizontalAnchor(p1.anchor)) {
    c2 = { x: p1.x - Math.sign(dx || 1) * Math.max(40, Math.abs(dx) * 0.5), y: p1.y };
  } else {
    c2 = { x: p1.x, y: p1.y - Math.sign(dy || 1) * Math.max(40, Math.abs(dy) * 0.5) };
  }
  return { c1, c2 };
};

export const linkPath = (p0, p1) => {
  let { c1, c2 } = linkControls(p0, p1);
  return `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p1.x} ${p1.y}`;
};

/* ---------------- 直角曲线（正交折线 + 倒角圆角） ---------------- */

/** 中间拐点坐标约束（候选点法，取满足全部约束的最近者）：
 *  - target/source 各自的约束：side = ±1 表示必须在该 bbox 的锚点一侧外侧（锚点侧，
 *    防止沿锚点轴的第一/最后一段横穿组件）；side = 0 表示双向避开该 bbox（不能落在范围内）
 *  - 锚点侧判定：left/top 锚点 → ≤ lo-M；right/bottom → ≥ hi-M。
 *    不能用"连接方向"（目标在哪边）—— left 锚点从左侧进入，连接方向反而是 +1
 *  - 两端约束冲突（组件贴边/重叠，空隙不存在）时放弃起点侧约束，保终点侧（用户要求：不穿越目标）
 *  - 不能"逐步推出"—— 推出一个 bbox 时可能又落回另一个 bbox 内 */
const adjustMid = (v, target, source, axis) => {
  const MARGIN = 8;
  const range = (c) => {
    let b = c.box;
    if (!b) return null;
    let lo = axis === 'x' ? b.x : b.y;
    let hi = lo + (axis === 'x' ? b.width : b.height);
    return [lo, hi];
  };
  const okSide = (c, side, r) => {
    if (!r) return true;
    let [lo, hi] = r;
    return side > 0 ? c >= hi + MARGIN : side < 0 ? c <= lo - MARGIN : !(c > lo - MARGIN && c < hi + MARGIN);
  };
  let r0 = range(source);
  let r1 = range(target);
  let ok = (c) => okSide(c, source.side, r0) && okSide(c, target.side, r1);
  if (ok(v)) return v;
  // 候选点：target/source 各自的锚点侧边界或 bbox 两侧边界
  let cands = [];
  [target, source].forEach((c) => {
    if (!c.box) return;
    let [lo, hi] = axis === 'x' ? [c.box.x, c.box.x + c.box.width] : [c.box.y, c.box.y + c.box.height];
    if (c.side > 0) cands.push(hi + MARGIN);
    else if (c.side < 0) cands.push(lo - MARGIN);
    else cands.push(lo - MARGIN, hi + MARGIN);
  });
  cands = cands.filter(ok);
  if (!cands.length && target.box) {
    // 冲突（组件贴边/重叠）：放弃起点约束，只保目标侧（最后一段不穿越目标组件）
    let c = target.side > 0 ? r1[1] + MARGIN : target.side < 0 ? r1[0] - MARGIN : null;
    if (c !== null && okSide(c, target.side, r1)) cands.push(c);
  }
  if (!cands.length) return v; // 无解：保持原值
  cands.sort((a, b) => Math.abs(a - v) - Math.abs(b - v));
  return cands[0];
};

/** 约束描述：{ side, box }，side=±1 锚点侧外 / 0 双向避开 */
const sideOf = (anchor) => (anchor === 'left' || anchor === 'top' ? -1 : 1);

/** 把坐标推出两端 bbox（side=0 双向避开）：候选点 = 各 bbox 边界外 MARGIN，
 *  取最近合法值，避免"推出一个 bbox 又落入另一个" */
const pushOutOfBoxes = (v, b0, b1, axis) => {
  const MARGIN = 8;
  let boxes = [b0, b1].filter(Boolean);
  const inside = (c) =>
    boxes.some((b) => {
      let lo = axis === 'x' ? b.x : b.y;
      let hi = lo + (axis === 'x' ? b.width : b.height);
      return c > lo - MARGIN && c < hi + MARGIN;
    });
  if (!inside(v)) return v;
  let cands = [];
  boxes.forEach((b) => {
    let lo = axis === 'x' ? b.x : b.y;
    let hi = lo + (axis === 'x' ? b.width : b.height);
    cands.push(lo - MARGIN, hi + MARGIN);
  });
  cands = cands.filter((c) => !inside(c));
  if (!cands.length) return v; // 完全重叠，无法避免
  cands.sort((a, b) => Math.abs(a - v) - Math.abs(b - v));
  return cands[0];
};

/** 线段与 bbox 相交判定（水平段 y 固定 / 垂直段 x 固定） */
const segHitsBox = (x0, y0, x1, y1, b) => {
  if (!b) return false;
  if (y0 === y1) {
    if (y0 < b.y || y0 > b.y + b.height) return false;
    let lo = Math.min(x0, x1);
    let hi = Math.max(x0, x1);
    return hi > b.x && lo < b.x + b.width;
  }
  if (x0 === x1) {
    if (x0 < b.x || x0 > b.x + b.width) return false;
    let lo = Math.min(y0, y1);
    let hi = Math.max(y0, y1);
    return hi > b.y && lo < b.y + b.height;
  }
  return false;
};

/** 正交折线点序列：起点沿其锚点轴系（水平/垂直）延伸，中间走中点过渡到终点锚点轴系；连续重复点去重。
 *  拐点坐标由两端组件 bbox 约束：终点侧必须位于目标 bbox 锚点一侧外侧（最后一段不穿越目标组件），
 *  中间段避开起点 bbox（不穿越起点组件）。
 *  第一段沿锚点轴的水平/垂直线若横穿目标组件（起点与目标在另一轴方向重叠，如 A 连 B 右侧），
 *  在目标的空隙处加折弯点，沿目标边缘绕行（"沿着边缘回头链接"） */
const orthoPoints = (p0, p1) => {
  const MARGIN = 8;
  let h0 = isHorizontalAnchor(p0.anchor);
  let h1 = isHorizontalAnchor(p1.anchor);
  let b0 = p0.box;
  let b1 = p1.box;
  let mx = (p0.x + p1.x) / 2;
  let my = (p0.y + p1.y) / 2;
  let pts;
  if (h0 && h1) {
    // 两端水平：mx 起点锚点侧（第一段沿水平轴不穿起点）+ 终点锚点侧（最后一段不穿目标）
    if (b0 && b1) mx = adjustMid(mx, { side: sideOf(p1.anchor), box: b1 }, { side: sideOf(p0.anchor), box: b0 }, 'x');
    pts = [p0, { x: mx, y: p0.y }, { x: mx, y: p1.y }, p1];
    // 第一段水平线横穿目标（起点与目标 y 重叠、拐点在目标另一侧）→ 在目标 y 空隙折弯绕行
    if (b1 && segHitsBox(p0.x, p0.y, mx, p0.y, b1) && !(p0.x > b1.x && p0.x < b1.x + b1.width)) {
      let ySafe = Math.abs(p0.y - (b1.y - MARGIN)) < Math.abs(p0.y - (b1.y + b1.height + MARGIN)) ? b1.y - MARGIN : b1.y + b1.height + MARGIN;
      pts = [p0, { x: p0.x, y: ySafe }, { x: mx, y: ySafe }, ...pts.slice(2)];
    }
  } else if (!h0 && !h1) {
    // 两端垂直：my 起点锚点侧 + 终点锚点侧
    if (b0 && b1) my = adjustMid(my, { side: sideOf(p1.anchor), box: b1 }, { side: sideOf(p0.anchor), box: b0 }, 'y');
    pts = [p0, { x: p0.x, y: my }, { x: p1.x, y: my }, p1];
    // 第一段垂直线横穿目标 → 在目标 x 空隙折弯绕行
    if (b1 && segHitsBox(p0.x, p0.y, p0.x, my, b1) && !(p0.y > b1.y && p0.y < b1.y + b1.height)) {
      let xSafe = Math.abs(p0.x - (b1.x - MARGIN)) < Math.abs(p0.x - (b1.x + b1.width + MARGIN)) ? b1.x - MARGIN : b1.x + b1.width + MARGIN;
      pts = [p0, { x: xSafe, y: p0.y }, { x: xSafe, y: my }, ...pts.slice(2)];
    }
  } else if (h0) {
    // 起点水平、终点垂直：mx 起点锚点侧 + 终点双向避开（竖段 x 不落目标 bbox）；
    // my 终点锚点侧（最后垂直段）+ 起点双向避开（水平过渡段不穿起点）
    if (b0 && b1) {
      mx = adjustMid(mx, { side: 0, box: b1 }, { side: sideOf(p0.anchor), box: b0 }, 'x');
      my = adjustMid(my, { side: sideOf(p1.anchor), box: b1 }, { side: 0, box: b0 }, 'y');
    }
    pts = [p0, { x: mx, y: p0.y }, { x: mx, y: my }, { x: p1.x, y: my }, p1];
    // 第一段水平线横穿目标 → 在目标 y 空隙折弯绕行
    if (b1 && segHitsBox(p0.x, p0.y, mx, p0.y, b1) && !(p0.x > b1.x && p0.x < b1.x + b1.width)) {
      let ySafe = Math.abs(p0.y - (b1.y - MARGIN)) < Math.abs(p0.y - (b1.y + b1.height + MARGIN)) ? b1.y - MARGIN : b1.y + b1.height + MARGIN;
      pts = [p0, { x: p0.x, y: ySafe }, { x: mx, y: ySafe }, ...pts.slice(2)];
    }
  } else {
    // 起点垂直、终点水平：my 起点双向避开 + 终点双向避开（水平过渡段不穿两端）；
    // mx 终点锚点侧（最后水平段）+ 起点双向避开（竖段不穿起点）
    if (b0 && b1) {
      my = adjustMid(my, { side: 0, box: b1 }, { side: 0, box: b0 }, 'y');
      mx = adjustMid(mx, { side: sideOf(p1.anchor), box: b1 }, { side: 0, box: b0 }, 'x');
    }
    pts = [p0, { x: p0.x, y: my }, { x: mx, y: my }, { x: mx, y: p1.y }, p1];
    // 第一段垂直线横穿目标 → 在目标 x 空隙折弯绕行
    if (b1 && segHitsBox(p0.x, p0.y, p0.x, my, b1) && !(p0.y > b1.y && p0.y < b1.y + b1.height)) {
      let xSafe = Math.abs(p0.x - (b1.x - MARGIN)) < Math.abs(p0.x - (b1.x + b1.width + MARGIN)) ? b1.x - MARGIN : b1.x + b1.width + MARGIN;
      pts = [p0, { x: xSafe, y: p0.y }, { x: xSafe, y: my }, ...pts.slice(2)];
    }
  }
  let out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    let a = out[out.length - 1];
    let b = pts[i];
    if (Math.abs(a.x - b.x) > 0.01 || Math.abs(a.y - b.y) > 0.01) out.push(b);
  }
  return out;
};

/** 圆角折线：拐角处用半径 r 的圆弧过渡（Q 二次贝塞尔，拐点为控制点即圆角） */
const roundedPolylinePath = (pts, r) => {
  if (pts.length < 3) {
    let last = pts[pts.length - 1];
    return `M ${pts[0].x} ${pts[0].y} L ${last.x} ${last.y}`;
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    let prev = pts[i - 1];
    let cur = pts[i];
    let next = pts[i + 1];
    let len1 = Math.hypot(cur.x - prev.x, cur.y - prev.y) || 1;
    let len2 = Math.hypot(next.x - cur.x, next.y - cur.y) || 1;
    let rr = Math.min(r, len1 * 0.5, len2 * 0.5);
    let a = { x: cur.x - ((cur.x - prev.x) / len1) * rr, y: cur.y - ((cur.y - prev.y) / len1) * rr };
    let b = { x: cur.x + ((next.x - cur.x) / len2) * rr, y: cur.y + ((next.y - cur.y) / len2) * rr };
    d += ` L ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y}`;
  }
  let last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
};

/** 直角曲线 path：正交折线 + 倒角（半径 10px 画布坐标） */
export const cornerPath = (p0, p1, radius = 10) => roundedPolylinePath(orthoPoints(p0, p1), radius);

/** 终点箭头（三角形）：已建立连线沿终点切线（新控制点方案下切线 = 连接方向）；
 *  直角样式沿终点锚点轴系（最后一段方向）；拖线中鼠标点无锚点语义，直接用起点到终点方向（跟随鼠标） */
export const linkArrowPath = (p0, p1, size = 8, style = 'curve') => {
  let dx, dy;
  if (style === 'corner') {
    // 直角样式最后一段沿终点锚点轴系（水平/垂直），方向取连接方向
    if (isHorizontalAnchor(p1.anchor)) {
      dx = Math.sign(p1.x - p0.x || 1);
      dy = 0;
    } else {
      dx = 0;
      dy = Math.sign(p1.y - p0.y || 1);
    }
  } else if (p1.anchor) {
    let { c2 } = linkControls(p0, p1);
    dx = p1.x - c2.x;
    dy = p1.y - c2.y;
  } else {
    dx = p1.x - p0.x;
    dy = p1.y - p0.y;
  }
  let len = Math.hypot(dx, dy) || 1;
  let ux = dx / len;
  let uy = dy / len;
  let bx = p1.x - ux * size; // 底边中心（顶点后方）
  let by = p1.y - uy * size;
  let px = -uy * size * 0.55; // 垂直底边的半宽
  let py = ux * size * 0.55;
  return `M ${p1.x} ${p1.y} L ${bx + px} ${by + py} L ${bx - px} ${by - py} Z`;
};

/** 构建 id → 绝对坐标索引（含 transform），用于连线端点定位与锚点命中检测 */
export const indexItems = (items) => {
  let map = {};
  let walk = (list, pos) => {
    list.forEach((item) => {
      let t = item.transform || {};
      let abs = { x: (pos ? pos.x : 0) + (t.x || 0), y: (pos ? pos.y : 0) + (t.y || 0), transform: t };
      map[item.id] = abs;
      if (item.items && item.items.length > 0) walk(item.items, abs);
    });
  };
  walk(items, null);
  return map;
};

/** 由绝对坐标 + transform 构造轴对齐 bbox（直角曲线拐点约束用，避开组件本体） */
const boxOf = (m) => {
  let t = m.transform || {};
  return { x: m.x, y: m.y, width: t.width || 0, height: t.height || 0 };
};

/** 收集整棵树的连线：每条含起点锚点绝对坐标 + 目标 id/锚点；目标组件不存在时过滤（悬空引用） */
export const collectLinks = (items) => {
  let map = indexItems(items);
  let links = [];
  let walk = (list) => {
    list.forEach((item) => {
      (item.connections || []).forEach((c) => {
        let from = map[item.id];
        let to = map[c.targetId];
        if (!from || !to) return; // 悬空引用（目标组件已删除）不渲染
        links.push({
          id: c.id,
          from: Object.assign({ anchor: c.anchor, box: boxOf(from) }, anchorPoint(from, c.anchor, ANCHOR_OFFSET)),
          to: Object.assign({ anchor: c.targetAnchor, box: boxOf(to) }, anchorPoint(to, c.targetAnchor, ANCHOR_OFFSET)),
        });
      });
      if (item.items && item.items.length > 0) walk(item.items);
    });
  };
  walk(items);
  return links;
};

export default class LinkLayer extends React.Component {
  state = { links: [], items: [], hoverId: null, selectedId: null, styleTick: 0 };

  componentWillMount() {
    if (!this.props.items) {
      // 编辑器模式：数据/拖动驱动刷新
      Event.listen(controllers_change, this.handleItems);
      Event.listen(component_drag, this.refresh);
      Event.listen(component_inactive, this.handleInactive);
      Event.listen(link_style_change, this.handleStyleChange);
      // capture 阶段监听（挂 document，与 PenTool 同模式）：
      // Events.js 的 document keydown（冒泡）对所有键 stopPropagation，冒泡阶段收不到，必须 capture 抢在前面
      document.addEventListener('keydown', this._handleKeyDown, true);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.items) this.setState({ links: collectLinks(nextProps.items) });
  }

  componentWillUnmount() {
    Event.destroy(controllers_change, this.handleItems);
    Event.destroy(component_drag, this.refresh);
    Event.destroy(component_inactive, this.handleInactive);
    Event.destroy(link_style_change, this.handleStyleChange);
    document.removeEventListener('keydown', this._handleKeyDown, true);
  }

  handleItems = (items) => {
    if (this.props.items) return; // 预览模式（props 驱动）不接收编辑器事件
    this.setState({ items, links: collectLinks(items) });
  };

  // 拖动过程中 transform 变化：重建连线（坐标实时计算，结构不变时仅 path 变化）
  refresh = () => {
    if (this.props.items) return;
    this.setState({ links: collectLinks(this.state.items) });
  };

  // 组件取消选中（点空白/切换选中）时取消连线选中
  handleInactive = () => this.setState({ selectedId: null });

  // 样式切换：只触发重渲染（样式值实时读 window.__linkStyle，不缓存 state，避免跨页陈旧值）
  handleStyleChange = () => this.setState({ styleTick: this.state.styleTick + 1 });

  // 当前连线样式：props（预览）> window 全局（编辑器，HeaderLinkStyle 写 + 切页时 handlePageSelect 刷新）> 默认曲线
  getLinkStyle = () => this.props.linkStyle || window.__linkStyle || 'curve';

  // Delete/Backspace 删除连线（capture 拦截，阻断组件删除快捷键）
  // hover 优先（悬停中即可删），无悬停时删点击选中的线
  _handleKeyDown = (e) => {
    // 与 Events.js 的跳过逻辑保持一致：编辑态 DOM（data-event="ignore"）和表单输入不拦截，
    // 否则编辑文本/输入框时按 Backspace/Delete 会误删选中的连线，且 preventDefault 卡住输入
    let target = e.target;
    if (
      target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target.dataset && target.dataset.event === 'ignore' && !target.readOnly)
    ) {
      return;
    }
    let { selectedId, hoverId } = this.state;
    let targetId = hoverId || selectedId;
    if (!targetId) return;
    if (e.keyCode === 46 || e.keyCode === 8) {
      e.stopPropagation();
      e.preventDefault();
      this.removeLinkById(targetId);
      this.setState({ selectedId: null, hoverId: null });
    }
  };

  // 删除连线：派发 link_remove，EditorControllers 在树内定位删除（走标准 setState，持久化/PATHES/撤销完整）
  removeLinkById = (linkId) => {
    this.setState({ hoverId: null });
    Event.dispatch(link_remove, linkId);
  };

  render() {
    let { links, hoverId, selectedId } = this.state;
    if (!links || links.length === 0) return null;
    let linkStyle = this.getLinkStyle();
    return (
      <svg
        className={'link-layer'}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          // 固定大尺寸 viewport：editor-control-panel 无显式尺寸（内容全 absolute），100% 会解析为 0×0 导致线不可见
          width: 20000,
          height: 20000,
          overflow: 'visible',
          pointerEvents: 'none', // 整层不响应鼠标；下方热区 path 单独开启 pointer-events 供点击选择
          zIndex: 0,
        }}
      >
        {links.map((l) => {
          let d = linkStyle === 'corner' ? cornerPath(l.from, l.to, 10) : linkPath(l.from, l.to);
          let active = hoverId === l.id || selectedId === l.id; // hover 临时高亮 / 点击选中保持高亮
          return (
            <g key={l.id}>
              {/* 渲染顺序：线最底 → 箭头/圆点盖住线端（线若画在箭头上会穿出三角形露成"尾巴"） */}
              {/* 可见线：hover / 选中时高亮变红加粗 */}
              <path d={d} fill="none" stroke={active ? '#ff7875' : '#1890ff'} strokeWidth={active ? 3 : 2} strokeLinecap="round" />
              {/* 起点圆点 + 终点箭头（与线同色，选中时变红） */}
              <circle cx={l.from.x} cy={l.from.y} r={3.5} fill={active ? '#ff7875' : '#1890ff'} />
              <path d={linkArrowPath(l.from, l.to, 8, linkStyle)} fill={active ? '#ff7875' : '#1890ff'} />
              {/* 透明热区（仅编辑器）：加粗 12px，仅线本体可点（mousedown stopPropagation 不清除选中）；预览只读不挂 */}
              {!this.props.items && (
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  strokeLinecap="round"
                  pointerEvents="visibleStroke"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseOver={() => this.setState({ hoverId: l.id })}
                  onMouseOut={() => this.setState({ hoverId: null })}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 点击选中该线（再次点击取消），Delete 键删除
                    this.setState({ selectedId: selectedId === l.id ? null : l.id });
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
    );
  }
}
