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
import { component_active, component_drag, component_dragend, component_inactive, component_resize_end, controllers_change, link_remove, link_style_change } from '../util/actions';
import { getFirstResponder } from '../global/instance';

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

/** 沿 parent 链累加得到画布绝对坐标。
 *  坐标体系：group/master 为嵌套容器（子项 transform 相对容器，需累加）；
 *  block 为扁平渲染（BlockView 用 Fragment 直接把 items 挂画布根，子项 transform 是绝对坐标，
 *  与 block 自身的 transform 无关）→ parent 链上的 block 不参与累加（自身第一层总是累加） */
export const absolutePos = (item) => {
  let pos = { x: 0, y: 0 };
  let first = true;
  while (item) {
    let t = item.transform || {};
    if (first || item.type !== 'block') {
      pos.x += t.x || 0;
      pos.y += t.y || 0;
    }
    first = false;
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

// 锚点控制点相对组件边缘的外移量（画布坐标，与缩放无关）。
// 0 = 贴边：锚点/连线端点在组件边上（draw.io 风格）；首尾段路由豁免端点自身（见 pathClear exempt）
export const ANCHOR_OFFSET = 0;

// 起点米字标记颜色（浅一档蓝，装饰性指示出发位置，不随选中/hover 变色）
const STAR_COLOR = '#91caff';

/**
 * 三次贝塞尔控制点（标准连接图做法）：
 * 控制点按锚点轴系定向 —— left/right 锚点控制点沿 x 方向，top/bottom 沿 y 方向，
 * 方向取各自锚点的外法线（anchorDir）：
 *  - 起点控制点放起点锚点外侧 → 起点切线 = 外法线，曲线从组件内向外出发
 *  - 终点控制点放终点锚点外侧 → 终点切线 = 内法线（指向组件内部），箭头朝向目标组件
 * 长度 = 该方向距离的一半（最小 40px）。
 * 不能用"全局连接方向"（dx/dy 符号）：目标锚点在起点"背后"时（如 A.right 连 B.left、
 * B 在 A 下方左侧，dx < 0），两端控制点都会翻到组件内侧 —— 起点切线反向（线从 A 左侧
 * 冒出来）、终点切线背离目标（箭头背对 B），即"首尾不连"（曾踩坑）
 */
const isHorizontalAnchor = (anchor) => anchor === 'left' || anchor === 'right';

/** 控制点外延方向：锚点外法线在该轴的分量（left → -x、right → +x、top → -y、bottom → +y）；
 *  无锚点（拖线未吸附，终点跟随鼠标）回退全局方向，保持预览跟手 */
const ctrlDir = (anchor, axis, dv) => (anchor ? anchorDir(anchor)[axis === 'x' ? 0 : 1] : Math.sign(dv || 1));

export const linkControls = (p0, p1) => {
  let dx = p1.x - p0.x;
  let dy = p1.y - p0.y;
  let c1, c2;
  if (isHorizontalAnchor(p0.anchor)) {
    c1 = { x: p0.x + ctrlDir(p0.anchor, 'x', dx) * Math.max(40, Math.abs(dx) * 0.5), y: p0.y };
  } else {
    c1 = { x: p0.x, y: p0.y + ctrlDir(p0.anchor, 'y', dy) * Math.max(40, Math.abs(dy) * 0.5) };
  }
  if (isHorizontalAnchor(p1.anchor)) {
    c2 = { x: p1.x + ctrlDir(p1.anchor, 'x', dx) * Math.max(40, Math.abs(dx) * 0.5), y: p1.y };
  } else {
    c2 = { x: p1.x, y: p1.y + ctrlDir(p1.anchor, 'y', dy) * Math.max(40, Math.abs(dy) * 0.5) };
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

/* ---------------- 全局避障路由（不穿越任何组件 bbox，含端点组件自身） ----------------
 * 策略（抛弃"最少直角"限制，按结构定义形态，拐角数自然增长）：
 * 1. 直线（0 拐角）：两端锚点共线 + 不穿任何组件 + 尾段够画箭头
 * 2. 同轴 Z 形（2 拐角，默认形态）：[p0, 中间段, p1]，中间段坐标候选枚举，
 *    强制"首段 ≥16px（脖子）、尾段 ≥13px（箭头尾段）"——除直线外最少两个直角，线有首有脖有尾
 * 3. 同轴 3 拐角（2 拐角无解时补位）：[p0, 轴伸出, 垂直段, 平行段, 垂直段, 轴进入 p1]，
 *    三变量截断枚举，同样带首尾段长度约束。2 拐角要求首 16 + 尾 13 的间距空间，
 *    近距堆叠/遮挡走廊时无解，直接跳 A* 又常因尾段无法外推而失败 → 回退不避障的 cornerPath 穿越组件
 * 4. 异轴 3 拐角：H,V,H,V（或 V,H,V,H），同样带首尾段长度约束
 * 5. A* 网格路由兜底（任意拐角，复杂遮挡）：首尾段沿锚点轴伸出后中间任意绕行；
 *    结果首尾段轴向修正（axialSplice）：网格中心与锚点不对齐 → 首尾段斜线，箭头错位
 * 端点组件旋转时（锚点轴已非轴对齐，约束失效）→ 返回 null，调用方回退 cornerPath */
const MARGIN = 8;
const MAX_CAND = 12;
const START_MIN = 16; // 首段最小长度（脖子）
const TAIL_MIN = 13; // 尾段最小长度（箭头 8 + 可见尾 5）

/** 折线整体避障：每段 vs 每个障碍物（膨胀 MARGIN，路径与组件保持间距）。
 *  exempt0/exempt1：端点组件 box 引用（引用相等比较）——锚点贴边后 p0/p1 在组件边上，
 *  落在自身膨胀 bbox 内，首/尾段从边上出发/进入是合法形态，跳过自身组件判定；
 *  其余障碍（含两端组件）仍逐段判定（中间段不能穿越任何组件）。
 *  首/尾段的方向合法性由调用方 axOk 显式校验（豁免后不再依赖 pathClear 隐式淘汰） */
const pathClear = (pts, obstacles, exempt0, exempt1) => {
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1],
      b = pts[i];
    let first = i === 1,
      last = i === pts.length - 1;
    for (let o of obstacles) {
      if ((first && o === exempt0) || (last && o === exempt1)) continue;
      if (segHitsBox(a.x, a.y, b.x, b.y, { x: o.x - MARGIN, y: o.y - MARGIN, width: o.width + 2 * MARGIN, height: o.height + 2 * MARGIN })) return false;
    }
  }
  return true;
};

/** 端点轴向合法性：向量 prev→cur 与锚点外法线点积 ≥ 0。
 *  - 首段：dot(p0→pts[1], 外法线) ≥ 0 —— 首段沿锚点轴向外（贴边后反向候选必穿组件）
 *  - 尾段：dot(p1→pts[last-1], 外法线) ≥ 0 —— 倒数第二点在锚点外侧，尾段沿锚点轴进入组件
 *  - 段方向垂直锚点轴（如 right 锚点垂直线段沿组件边）点积为 0，天然安全 */
const axOk = (prev, cur, dir) => (cur.x - prev.x) * dir[0] + (cur.y - prev.y) * dir[1] >= 0;

/** 候选坐标：所有障碍物边界 ±(MARGIN+1) + 额外值（锚点坐标）。
 *  +1 余量：pathClear 的膨胀判定是闭区间（segHitsBox 边界也算命中），
 *  候选恰好落在 ±MARGIN 上会贴膨胀边界被误杀 → 绕行路径无解回退 cornerPath（曾踩坑） */
const candidatesOnAxis = (obstacles, axis, extras) => {
  let set = new Set(extras);
  obstacles.forEach((o) => {
    let lo = axis === 'x' ? o.x : o.y;
    let hi = lo + (axis === 'x' ? o.width : o.height);
    set.add(lo - MARGIN - 1);
    set.add(hi + MARGIN + 1);
  });
  return [...set];
};

/** 到最优区间 [a,b] 的距离（区间内为 0），同级取最短 → 近最优区间者优先 */
const rankToInterval = (v, a, b) => {
  let lo = Math.min(a, b),
    hi = Math.max(a, b);
  return v < lo ? lo - v : v > hi ? hi - v : 0;
};

/** 连续重复点去重（退化折线） */
const dedupePts = (pts) => {
  let out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i].x - out[out.length - 1].x) > 0.01 || Math.abs(pts[i].y - out[out.length - 1].y) > 0.01) out.push(pts[i]);
  }
  return out;
};

/** 候选排序 + 截断（控制枚举量，最多 MAX_CAND 个）：
 * 1) 近最优区间 [a,b] 者优先（同档长度更短）；2) 同等级内居中者优先 ——
 * 无障碍时 Z 形中间竖线优先落中点（标准 Z 形），而非锚点坐标导致竖线贴端点 */
const ranked = (cands, a, b, filter) => {
  let list = cands.filter(filter || (() => true));
  let center = (a + b) / 2;
  list.sort((x, y) => {
    let dx = rankToInterval(x, a, b) - rankToInterval(y, a, b);
    return dx !== 0 ? dx : Math.abs(x - center) - Math.abs(y - center);
  });
  return list.slice(0, MAX_CAND);
};

/* ---------------- 贴边惩罚：路径与组件边缘平行擦过且距离 < EDGE_TOL 视为"挤"，
 * 计入质量（长度 + EDGE_PENALTY × 贴边段数）。纯最短路径会贴着组件 8px 走，
 * 视觉很挤；惩罚让"稍推远一点"或"多一个直角绕开"的干净路径胜出 ---------------- */
const EDGE_TOL = 24; // 贴边判定阈值（> 避障 MARGIN，避障已保证 ≥8px，8~24px 之间为"挤"）
const EDGE_PENALTY = 80; // 一条贴边段的质量代价（≈ 多绕半程的价格）

/** 正交段与矩形边缘平行擦过且距离 < EDGE_TOL → 贴边（1 段计数） */
const segEdgeClose = (a, b, o) => {
  if (a.y === b.y) {
    let lo = Math.min(a.x, b.x),
      hi = Math.max(a.x, b.x);
    if (hi <= o.x || lo >= o.x + o.width) return 0;
    if (a.y < o.y && o.y - a.y < EDGE_TOL) return 1;
    if (a.y > o.y + o.height && a.y - (o.y + o.height) < EDGE_TOL) return 1;
  } else if (a.x === b.x) {
    let lo = Math.min(a.y, b.y),
      hi = Math.max(a.y, b.y);
    if (hi <= o.y || lo >= o.y + o.height) return 0;
    if (a.x < o.x && o.x - a.x < EDGE_TOL) return 1;
    if (a.x > o.x + o.width && a.x - (o.x + o.width) < EDGE_TOL) return 1;
  }
  return 0;
};

const pathQuality = (pts, obstacles) => {
  let len = 0,
    close = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1],
      b = pts[i];
    len += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    for (let o of obstacles) close += segEdgeClose(a, b, o);
  }
  return len + EDGE_PENALTY * close;
};

/** 箭头尾段：最后一段（进入目标组件的线段）长度 ≥ 箭头(8) + 最小可见尾段(5)，
 * 否则箭头底边悬空（超出线段起点）或贴拐点，视觉奇怪 */
const hasArrowTail = (pts) => {
  if (pts.length < 2) return false;
  let a = pts[pts.length - 2];
  let b = pts[pts.length - 1];
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) >= 13;
};

/** 轴候选：障碍边界 ±MARGIN + 两端坐标 + 中点 + 锚点沿锚点轴外推值
 *  （首段 16px 脖子端点 / 尾段 13px 箭头尾端点）—— 保证"有首有脖有尾"的形态有候选，
 *  中间段不能贴着锚点。端点组件在 obstacles 内，反向候选自然被 pathClear 淘汰 */
const axisCands = (obstacles, axis, p0, p1) => {
  let a = p0[axis],
    b = p1[axis];
  let d0 = anchorDir(p0.anchor),
    d1 = anchorDir(p1.anchor);
  let e0 = a + (axis === 'x' ? d0[0] : d0[1]) * START_MIN;
  let e1 = b + (axis === 'x' ? d1[0] : d1[1]) * TAIL_MIN;
  return ranked(candidatesOnAxis(obstacles, axis, [a, b, (a + b) / 2, e0, e1]), a, b);
};

/** 从 from 沿 dir 伸出线段，返回"不穿任何障碍"的最长端点（从 targetLen 往回 2px 步进）；
 *  首段保证脖子长度、尾段保证箭头可画，且端点落在自由区（A* 起点/终点需自由） */
const extendFrom = (from, dir, targetLen, obstacles, exempt) => {
  for (let l = targetLen; l >= 0; l -= 2) {
    // dir 是 anchorDir 数组 [dx, dy]（曾误用 dir.x → NaN，A* 兜底全部失败回退 cornerPath）
    let pt = { x: from.x + dir[0] * l, y: from.y + dir[1] * l };
    if (pathClear([from, pt], obstacles, exempt)) return pt;
  }
  return from;
};

/** A* 网格路由（复杂遮挡兜底，任意拐角）：网格 8px，搜索区域 = 两端点 bbox 外扩 PAD，
 *  带拐角惩罚抑制锯齿；结果平滑去共线。区域超上限放弃（回退 cornerPath） */
const astarRoute = (a0, a1, obstacles) => {
  const CELL = 8,
    PAD = 300,
    TURN = 2,
    CAP = 500000;
  let x0 = Math.max(0, Math.min(a0.x, a1.x) - PAD);
  let y0 = Math.max(0, Math.min(a0.y, a1.y) - PAD);
  let x1 = Math.min(20000, Math.max(a0.x, a1.x) + PAD);
  let y1 = Math.min(20000, Math.max(a0.y, a1.y) + PAD);
  let gw = Math.ceil((x1 - x0) / CELL),
    gh = Math.ceil((y1 - y0) / CELL);
  if (gw * gh > CAP || gw < 1 || gh < 1) return null;
  let gi = (x, y) => y * gw + x;
  // 障碍格：任何膨胀 bbox 覆盖的格
  let blocked = new Uint8Array(gw * gh);
  obstacles.forEach((o) => {
    let bx = o.x - MARGIN,
      by = o.y - MARGIN,
      bw = o.width + 2 * MARGIN,
      bh = o.height + 2 * MARGIN;
    let c0 = Math.max(0, Math.floor((bx - x0) / CELL)),
      c1 = Math.min(gw - 1, Math.floor((bx + bw - x0) / CELL));
    let r0 = Math.max(0, Math.floor((by - y0) / CELL)),
      r1 = Math.min(gh - 1, Math.floor((by + bh - y0) / CELL));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) blocked[gi(c, r)] = 1;
  });
  const inb = (x, y) => x >= 0 && y >= 0 && x < gw && y < gh && !blocked[gi(x, y)];
  const nearest = (gx, gy) => {
    if (inb(gx, gy)) return { x: gx, y: gy };
    for (let r = 1; r < Math.max(gw, gh); r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          let x = gx + dx,
            y = gy + dy;
          if (inb(x, y)) return { x, y };
        }
      }
    }
    return null;
  };
  let sgx = Math.max(0, Math.min(gw - 1, Math.floor((a0.x - x0) / CELL)));
  let sgy = Math.max(0, Math.min(gh - 1, Math.floor((a0.y - y0) / CELL)));
  let tgx = Math.max(0, Math.min(gw - 1, Math.floor((a1.x - x0) / CELL)));
  let tgy = Math.max(0, Math.min(gh - 1, Math.floor((a1.y - y0) / CELL)));
  let s = nearest(sgx, sgy),
    t = nearest(tgx, tgy);
  if (!s || !t) return null;
  // Dijkstra（状态 = 格 × 进入方向，转向付 TURN 代价）
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  let dist = new Float64Array(gw * gh * 4).fill(Infinity);
  let prev = new Int32Array(gw * gh * 4).fill(-1);
  const push = (arr, item) => {
    let i = arr.length;
    arr.push(item);
    while (i > 0) {
      let p = (i - 1) >> 1;
      if (arr[p][0] <= arr[i][0]) break;
      [arr[p], arr[i]] = [arr[i], arr[p]];
      i = p;
    }
  };
  const pop = (arr) => {
    let top = arr[0];
    let last = arr.pop();
    if (arr.length) {
      arr[0] = last;
      let i = 0;
      for (;;) {
        let l = i * 2 + 1,
          r = l + 1,
          m = i;
        if (l < arr.length && arr[l][0] < arr[m][0]) m = l;
        if (r < arr.length && arr[r][0] < arr[m][0]) m = r;
        if (m === i) break;
        [arr[m], arr[i]] = [arr[i], arr[m]];
        i = m;
      }
    }
    return top;
  };
  let heap = [];
  for (let d = 0; d < 4; d++) {
    dist[gi(s.x, s.y) * 4 + d] = 0;
    push(heap, [0, s.x, s.y, d]);
  }
  let found = null;
  while (heap.length) {
    let [d, x, y, dir] = pop(heap);
    let key = gi(x, y) * 4 + dir;
    if (d > dist[key]) continue;
    if (x === t.x && y === t.y) {
      found = [x, y, dir];
      break;
    }
    for (let nd = 0; nd < 4; nd++) {
      let nx = x + DIRS[nd][0],
        ny = y + DIRS[nd][1];
      if (!inb(nx, ny)) continue;
      let ndist = d + 1 + (nd !== dir ? TURN : 0);
      let nkey = gi(nx, ny) * 4 + nd;
      if (ndist < dist[nkey]) {
        dist[nkey] = ndist;
        prev[nkey] = key;
        push(heap, [ndist, nx, ny, nd]);
      }
    }
  }
  if (!found) return null;
  // 回溯格点链（终点状态 → 起点状态）
  let chain = [];
  let cur = gi(found[0], found[1]) * 4 + found[2];
  while (cur !== -1) {
    chain.push([Math.floor((cur / 4) % gw), Math.floor(cur / 4 / gw)]);
    cur = prev[cur];
  }
  chain.reverse();
  // 坐标 + 去共线
  let out = [];
  for (let [gx, gy] of chain) {
    let pt = { x: x0 + gx * CELL + CELL / 2, y: y0 + gy * CELL + CELL / 2 };
    if (out.length && out[out.length - 1].x === pt.x && out[out.length - 1].y === pt.y) continue;
    out.push(pt);
  }
  let simp = [out[0]];
  for (let i = 1; i < out.length - 1; i++) {
    let a = simp[simp.length - 1],
      b = out[i],
      c = out[i + 1];
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) continue;
    simp.push(b);
  }
  if (out.length > 1) simp.push(out[out.length - 1]);
  return simp;
};

/** A* 结果首尾段轴向修正：A* 端点取"含外推点的网格中心"，与锚点（任意坐标）不对齐 →
 *  首/尾段是斜线，而箭头恒按锚点轴方向画（linkArrowUnit corner 分支），斜尾与箭头错位；
 *  外推点被障碍覆盖时 nearest() 还可能吸附到离轴/组件内侧的格子（首段反向冒出）。
 *  修正：沿锚点轴补过渡拐点（轴向段 + 垂直段），从近到远尝试中间点（近处轴向段短，
 *  最可能不穿障碍），新增段验证 pathClear；全部失败保留原斜段（组件重叠等极端场景，可接受） */
const axialSplice = (pts, p0, p1, obstacles) => {
  let h0 = isHorizontalAnchor(p0.anchor);
  let h1 = isHorizontalAnchor(p1.anchor);
  // 首段：把第 k 个中间点投影到 p0 锚点轴（水平锚点 y = p0.y / 垂直锚点 x = p0.x），
  // 投影点与 m 之间的过渡段垂直于锚点轴；失败则试更远的中间点
  let head = [p0];
  let cut = 1; // 未消费的中间点从 pts[cut] 开始
  for (let k = 1; k < pts.length - 1; k++) {
    let m = pts[k];
    let n = h0 ? { x: m.x, y: p0.y } : { x: p0.x, y: m.y };
    // 投影点必须在 p0 锚点外侧（方向校验，贴边豁免后防反向）；首段豁免 p0 自身 box
    if (axOk(p0, n, anchorDir(p0.anchor)) && pathClear([p0, n, m], obstacles, p0.box)) {
      head.push(n, m);
      cut = k + 1;
      break;
    }
  }
  if (cut === 1) {
    head.push(pts[1]);
    cut = 2;
  }
  // 尾段（对称）：从尾部往前找可投影点，尾段沿 p1 锚点轴进入
  let tail = [];
  let end = pts.length - 1; // 中间段 = pts[cut..end-1]
  for (let k = pts.length - 2; k >= cut; k--) {
    let m = pts[k];
    let n = h1 ? { x: m.x, y: p1.y } : { x: p1.x, y: m.y };
    // 投影点必须在 p1 锚点外侧（从外侧进入组件）；尾段豁免 p1 自身 box
    if (axOk(p1, n, anchorDir(p1.anchor)) && pathClear([m, n, p1], obstacles, null, p1.box)) {
      tail.push(m, n, p1);
      end = k;
      break;
    }
  }
  if (!tail.length) {
    // 全部失败：保留原尾段（斜线），仅当轴向过渡可行时补拐点
    let m = pts[pts.length - 2];
    let n = h1 ? { x: m.x, y: p1.y } : { x: p1.x, y: m.y };
    tail.push(m);
    if (axOk(p1, n, anchorDir(p1.anchor)) && pathClear([m, n, p1], obstacles, null, p1.box)) tail.push(n);
    tail.push(p1);
    end = pts.length - 2;
  }
  return dedupePts(head.concat(pts.slice(cut, end), tail));
};

export const orthoRoute = (p0, p1, obstacles = []) => {
  // 端点组件旋转：锚点轴已非轴对齐，路由约束失效 → 无解回退
  if ((p0.box && p0.box.rotation) || (p1.box && p1.box.rotation)) return null;
  let h0 = isHorizontalAnchor(p0.anchor);
  let h1 = isHorizontalAnchor(p1.anchor);
  // 直线（0 拐角）：共线 + 尾段够画箭头 + 首尾段轴向合法 + 不穿任何组件（首尾段豁免端点自身）。
  // 线方向必须与两端锚点轴一致（水平共线 → 两端水平锚点；垂直共线 → 两端垂直锚点）：
  // 否则 trimPathEnd 把线终点裁剪到箭头底边（沿锚点轴回退 8px），水平线 + top 锚点会裁出斜尾段（曾踩坑）
  if (
    (p0.x === p1.x || p0.y === p1.y) &&
    ((p0.y === p1.y && h0 && h1) || (p0.x === p1.x && !h0 && !h1)) &&
    hasArrowTail([p0, p1]) &&
    axOk(p0, p1, anchorDir(p0.anchor)) &&
    axOk(p1, p0, anchorDir(p1.anchor)) &&
    pathClear([p0, p1], obstacles, p0.box, p1.box)
  ) {
    return [p0, p1];
  }
  let best = null,
    bestQ = Infinity;
  const tryPts = (pts) => {
    // 首尾段轴向校验（贴边豁免端点后显式保证方向：首段沿外法线、尾段沿锚点轴进入）
    if (!axOk(p0, pts[1], anchorDir(p0.anchor))) return;
    if (pts.length > 2 && !axOk(p1, pts[pts.length - 2], anchorDir(p1.anchor))) return;
    if (!pathClear(pts, obstacles, p0.box, p1.box)) return;
    let q = pathQuality(pts, obstacles);
    if (q < bestQ) {
      bestQ = q;
      best = pts;
    }
  };
  if (h0 === h1) {
    // 同轴 2 拐角 Z 形（默认形态，除直线外最少两个直角）：
    // [p0, 中间段, p1]，中间段垂直于两端轴；候选含锚点外推值（脖子/箭头尾段），
    // 首段 ≥START_MIN、尾段 ≥TAIL_MIN，反向候选由 tryPts 的 axOk 方向校验淘汰
    let vari = h0 ? 'x' : 'y';
    let a = p0[vari],
      b = p1[vari];
    let cands = axisCands(obstacles, vari, p0, p1);
    for (let c of cands) {
      if (Math.abs(c - a) < START_MIN || Math.abs(c - b) < TAIL_MIN) continue;
      tryPts(h0 ? [p0, { x: c, y: p0.y }, { x: c, y: p1.y }, p1] : [p0, { x: p0.x, y: c }, { x: p1.x, y: c }, p1]);
    }
    // 同轴 3 拐角（2 拐角无解时补位：近距堆叠/遮挡走廊 —— 2 拐角要求首 16 + 尾 13 的间距空间，
    // 间距不足时无解，直接跳 A* 又常因尾段无法外推而失败 → 回退不避障的 cornerPath 穿越组件）。
    // [p0, 轴伸出, 垂直段, 平行段, 垂直段, 轴进入 p1]（水平锚点）/ 对称形状（垂直锚点），
    // 三变量（两端伸出位 + 中间段位）截断枚举，同样带首尾段长度约束；反向候选由 axOk 方向校验淘汰
    if (!best) {
      let candsX = axisCands(obstacles, 'x', p0, p1);
      let candsY = axisCands(obstacles, 'y', p0, p1);
      if (h0) {
        for (let x1 of candsX) {
          if (Math.abs(x1 - p0.x) < START_MIN) continue;
          for (let x2 of candsX) {
            if (Math.abs(x2 - p1.x) < TAIL_MIN) continue;
            for (let y of candsY) {
              tryPts([p0, { x: x1, y: p0.y }, { x: x1, y }, { x: x2, y }, { x: x2, y: p1.y }, p1]);
            }
          }
        }
      } else {
        for (let y1 of candsY) {
          if (Math.abs(y1 - p0.y) < START_MIN) continue;
          for (let y2 of candsY) {
            if (Math.abs(y2 - p1.y) < TAIL_MIN) continue;
            for (let x of candsX) {
              tryPts([p0, { x: p0.x, y: y1 }, { x, y: y1 }, { x, y: y2 }, { x: p1.x, y: y2 }, p1]);
            }
          }
        }
      }
    }
  } else {
    // 异轴 3 拐角：H,V,H,V（或 V,H,V,H），双变量截断枚举，同样带首尾段长度约束
    let candsX = axisCands(obstacles, 'x', p0, p1);
    let candsY = axisCands(obstacles, 'y', p0, p1);
    for (let x of candsX) {
      for (let y of candsY) {
        let seg0 = h0 ? Math.abs(x - p0.x) : Math.abs(y - p0.y); // 首段长（沿起点锚点轴）
        let seg1 = h0 ? Math.abs(y - p1.y) : Math.abs(x - p1.x); // 尾段长（沿终点锚点轴）
        if (seg0 < START_MIN || seg1 < TAIL_MIN) continue;
        tryPts(h0 ? [p0, { x, y: p0.y }, { x, y }, { x: p1.x, y }, p1] : [p0, { x: p0.x, y }, { x, y }, { x, y: p1.y }, p1]);
      }
    }
  }
  if (best) return dedupePts(best);
  // A* 兜底（复杂遮挡，任意拐角）：首段/尾段沿锚点轴伸出（保证方向与"脖/尾"），中间任意绕行；
  // 锚点贴边后外推起点在自身膨胀 bbox 内，extendFrom 豁免端点自身 box
  let a0 = extendFrom(p0, anchorDir(p0.anchor), 24, obstacles, p0.box);
  let a1 = extendFrom(p1, anchorDir(p1.anchor), 16, obstacles, p1.box);
  if (Math.abs(a1.x - p1.x) + Math.abs(a1.y - p1.y) < TAIL_MIN) return null; // 尾段不足，箭头无法画
  let mid = astarRoute(a0, a1, obstacles);
  if (!mid) return null;
  // 首尾段轴向修正：A* 网格中心点与锚点不对齐 → 首尾段斜线，箭头（按锚点轴）错位
  return axialSplice([p0, ...mid, p1], p0, p1, obstacles);
};

/** 避障直角 path 入口：有解用避障折线 + 圆角，无解回退 cornerPath（两端约束，至少不穿起终点） */
export const routePath = (p0, p1, obstacles, radius = 10) => {
  let pts = orthoRoute(p0, p1, obstacles);
  if (!pts) return cornerPath(p0, p1, radius);
  return roundedPolylinePath(pts, radius);
};

/** 箭头方向单位向量（linkArrowPath / 线终点裁剪共用，保证一致）：
 *  - corner 样式：沿终点锚点轴系，方向恒指向组件内部 —— left → +x、right → -x、top → +y、bottom → -y
 *    （orthoRoute/orthoPoints 均保证最后一段沿锚点轴进入；不能用连接方向，起点在目标另一侧时会背对组件）
 *  - 曲线样式：终点切线（控制点沿各自锚点外法线 → 终点切线恒指向组件内部，与 corner 一致）
 *  - 拖线中（p1 无锚点）：直接用起点到终点方向（跟随鼠标） */
export const linkArrowUnit = (p0, p1, style) => {
  let dx, dy;
  if (style === 'corner' && p1.anchor) {
    if (isHorizontalAnchor(p1.anchor)) {
      dx = p1.anchor === 'left' ? 1 : -1;
      dy = 0;
    } else {
      dx = 0;
      dy = p1.anchor === 'top' ? 1 : -1;
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
  return { x: dx / len, y: dy / len };
};

/** 终点箭头（三角形）：顶点在 p1（目标锚点），底边中心在 p1 沿箭头方向往回 size 处。
 *  线 path 终点裁剪到该底边中心（见 render trimPathEnd）—— 线从三角底部传入 */
export const linkArrowPath = (p0, p1, size = 8, style = 'curve') => {
  let u = linkArrowUnit(p0, p1, style);
  let bx = p1.x - u.x * size; // 底边中心（顶点后方）
  let by = p1.y - u.y * size;
  let px = -u.y * size * 0.55; // 垂直底边的半宽
  let py = u.x * size * 0.55;
  return `M ${p1.x} ${p1.y} L ${bx + px} ${by + py} L ${bx - px} ${by - py} Z`;
};

/** 线 path 终点裁剪到指定点（箭头底边中心）：把 d 末尾的坐标对替换。
 *  兼容 corner 的 `L x y` 与 curve 的 `C c1, c2, x y`（均以坐标对结尾） */
const trimPathEnd = (d, t) => {
  let m = d.match(/(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return d;
  return d.slice(0, m.index) + `${t.x} ${t.y}`;
};

/** 构建 id → 绝对坐标索引（含 transform），用于连线端点定位与锚点命中检测。
 *  block 为扁平渲染（子项 transform 是绝对坐标），其 items 不累加 block 自身，
 *  否则分组后连线端点 = block 包围盒 + 子项绝对坐标 → 双倍偏移全跑位 */
export const indexItems = (items) => {
  let map = {};
  let walk = (list, pos) => {
    list.forEach((item) => {
      let t = item.transform || {};
      let abs = { x: (pos ? pos.x : 0) + (t.x || 0), y: (pos ? pos.y : 0) + (t.y || 0), transform: t };
      map[item.id] = abs;
      if (item.items && item.items.length > 0) walk(item.items, item.type === 'block' ? null : abs);
    });
  };
  walk(items, null);
  return map;
};

/** 由绝对坐标 + transform 构造轴对齐 bbox（直角曲线拐点约束用，避开组件本体）。
 *  旋转组件取旋转后的外接矩形（路由避障按外接矩形判定，避免误穿越），rotation 字段保留供调用方检测 */
const boxOf = (m) => {
  let t = m.transform || {};
  let x = m.x,
    y = m.y,
    w = t.width || 0,
    h = t.height || 0,
    r = t.rotation || 0;
  if (!r) return { x, y, width: w, height: h, rotation: 0 };
  let rad = (r * Math.PI) / 180,
    c = Math.cos(rad),
    s = Math.sin(rad);
  let hw = Math.abs((w * c) / 2) + Math.abs((h * s) / 2);
  let hh = Math.abs((w * s) / 2) + Math.abs((h * c) / 2);
  return { x: x + w / 2 - hw, y: y + h / 2 - hh, width: hw * 2, height: hh * 2, rotation: r };
};

/** 收集整棵树的连线：每条含起点锚点绝对坐标 + 目标 id/锚点 + 避障障碍物；
 * 目标组件不存在时过滤（悬空引用）。障碍物 = 全部组件 bbox（含两端组件自身 ——
 * 中间段不能穿越任何组件；首尾段豁免端点自身（锚点贴边合法形态），方向由 axOk 校验） */
export const collectLinks = (items) => {
  let map = indexItems(items);
  let boxById = {};
  Object.keys(map).forEach((id) => (boxById[id] = boxOf(map[id])));
  let allBoxes = Object.keys(boxById).map((id) => boxById[id]);
  let links = [];
  let walk = (list) => {
    list.forEach((item) => {
      (item.connections || []).forEach((c) => {
        let from = map[item.id];
        let to = map[c.targetId];
        if (!from || !to) return; // 悬空引用（目标组件已删除）不渲染
        links.push({
          id: c.id,
          // 端点 id/锚点（拖动中增量刷新用：只有相关线重算，其他线静止）
          fromId: item.id,
          toId: c.targetId,
          fromAnchor: c.anchor,
          toAnchor: c.targetAnchor,
          from: Object.assign({ anchor: c.anchor, box: boxById[item.id] }, anchorPoint(from, c.anchor, ANCHOR_OFFSET)),
          to: Object.assign({ anchor: c.targetAnchor, box: boxById[c.targetId] }, anchorPoint(to, c.targetAnchor, ANCHOR_OFFSET)),
          obstacles: allBoxes,
        });
      });
      if (item.items && item.items.length > 0) walk(item.items);
    });
  };
  walk(items);
  return links;
};

export default class LinkLayer extends React.Component {
  state = { links: [], items: [], hoverId: null, selectedId: null, styleTick: 0, dragId: null };

  componentWillMount() {
    if (!this.props.items) {
      // 编辑器模式：数据/拖动驱动刷新
      Event.listen(controllers_change, this.handleItems);
      Event.listen(component_drag, this.refresh);
      // 拖动/缩放/旋转松手 → 切回全局避障路径（拖动中走简单路径保证跟手）
      Event.listen(component_dragend, this.onDragEnd);
      Event.listen(component_resize_end, this.onDragEnd);
      Event.listen(component_inactive, this.handleInactive);
      Event.listen(component_active, this.handleActive);
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
    Event.destroy(component_dragend, this.onDragEnd);
    Event.destroy(component_resize_end, this.onDragEnd);
    Event.destroy(component_inactive, this.handleInactive);
    Event.destroy(component_active, this.handleActive);
    Event.destroy(link_style_change, this.handleStyleChange);
    document.removeEventListener('keydown', this._handleKeyDown, true);
    for (let id in this._hotDoms) {
      let el = this._hotDoms[id];
      if (el) el.removeEventListener('mousedown', this._handleLineMouseDown, true);
    }
  }

  handleItems = (items) => {
    if (this.props.items) return; // 预览模式（props 驱动）不接收编辑器事件
    // 属性变更（移动/缩放/删除等落库）→ 重建连线（新对象，path 缓存自然失效）并清除拖动态
    let links = collectLinks(items);
    // 选中的线已被删除（如轻点锚点断开）→ 清掉失效的 selectedId/hoverId，避免残留态卡住后续删除
    let { selectedId, hoverId } = this.state;
    if (selectedId && !links.some((l) => l.id === selectedId)) selectedId = null;
    if (hoverId && !links.some((l) => l.id === hoverId)) hoverId = null;
    this.setState({ items, links, dragId: null, selectedId, hoverId });
  };

  // 拖动过程中 transform 变化：只重算**相关线**（起点/终点是拖动组件），其他线原样保留
  // （含 _p path 缓存 → 渲染零重算，视觉静止）。
  // 相关线走简单路径跟手（避障路由重算成本高，不逐帧跑）；程序化变换（Snapline/对齐）全量重建
  refresh = (target, options = {}) => {
    if (this.props.items) return;
    let from = options.from;
    if (from === 'Draggable' || from === 'Resizable' || from === 'Rotatable') {
      let id = target && target.properties ? target.properties.id : null;
      this.setState({ links: this.refreshRelated(this.state.links, id), dragId: id });
    } else {
      this.setState({ links: collectLinks(this.state.items), dragId: null });
    }
  };

  // 增量刷新相关线：仅重算 fromId/toId 命中拖动组件的线（坐标实时跟手），不相关线返回原对象
  refreshRelated = (links, dragId) => {
    let items = this.state.items;
    let map = indexItems(items);
    let boxById = {};
    Object.keys(map).forEach((id) => (boxById[id] = boxOf(map[id])));
    return links.map((l) => {
      if (l.fromId !== dragId && l.toId !== dragId) return l; // 不相关：原样（缓存生效，静止）
      let from = map[l.fromId],
        to = map[l.toId];
      if (!from || !to) return l;
      return {
        id: l.id,
        fromId: l.fromId,
        toId: l.toId,
        fromAnchor: l.fromAnchor,
        toAnchor: l.toAnchor,
        from: Object.assign({ anchor: l.fromAnchor, box: boxById[l.fromId] }, anchorPoint(from, l.fromAnchor, ANCHOR_OFFSET)),
        to: Object.assign({ anchor: l.toAnchor, box: boxById[l.toId] }, anchorPoint(to, l.toAnchor, ANCHOR_OFFSET)),
        obstacles: l.obstacles,
      };
    });
  };

  // 松手：清拖动态 + path 缓存 → 全部线切回全局避障路径（links 已是最后一帧的坐标）
  onDragEnd = () => {
    if (this.props.items) return;
    this.setState((state) => ({
      dragId: null,
      links: state.links.map((l) => {
        l._p = null;
        return l;
      }),
    }));
  };

  // 组件取消选中（点空白/切换选中）时取消连线选中
  handleInactive = () => this.setState({ selectedId: null });

  // 组件被选中（点击组件，走 setFirstResponder → component_active）时取消连线选中 ——
  // 组件选中与线段选中互斥，否则线段还红着时按 Delete 会删线而非组件
  handleActive = () => this.setState({ selectedId: null });

  // 样式切换：触发重渲染 + 清 path 缓存（样式值实时读 window.__linkStyle，不缓存 state，避免跨页陈旧值）
  handleStyleChange = () =>
    this.setState((state) => ({
      styleTick: state.styleTick + 1,
      links: state.links.map((l) => {
        l._p = null;
        return l;
      }),
    }));

  // 当前连线样式：props（预览）> window 全局（编辑器，HeaderLinkStyle 写 + 切页时 handlePageSelect 刷新）> 默认曲线
  getLinkStyle = () => this.props.linkStyle || window.__linkStyle || 'curve';

  // 当前线段颜色：props（预览）> window 全局（HeaderLinkStyle 写 + 切页刷新）> 默认黑（draw.io 风格）
  getLinkColor = () => this.props.linkColor || window.__linkColor || '#000000';

  // 当前线段粗细（px）：props（预览）> window 全局 > 默认 1
  getLinkWidth = () => this.props.linkWidth || window.__linkWidth || 1;

  // Delete/Backspace 删除连线（capture 拦截，阻断组件删除快捷键）
  // selected 优先：点击选中的线永远是删除目标；无选中线时 hover 可作为快捷删除目标（仅组件也未选中时）
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
    // selected 优先：点击选中的线永远是 Delete 的目标（hover 只是预览提示）。
    // hover 仅在组件也没有选中时作为快捷删除目标 —— 原实现 hover 无条件生效：
    // 选中组件后鼠标悬停在线段上，Delete 会误删线段而非组件（组件删除走 Events.js → KeyboradHandler）
    let targetId = selectedId || (!getFirstResponder() ? hoverId : null);
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

  // 热区 DOM 引用（原生 capture 监听挂载点，与 LinkAnchors.setAnchorDom 同模式）
  _hotDoms = {};

  setHotDom = (linkId, el) => {
    if (this._hotDoms[linkId] === el) return;
    if (this._hotDoms[linkId]) this._hotDoms[linkId].removeEventListener('mousedown', this._handleLineMouseDown, true);
    this._hotDoms[linkId] = el;
    if (el) el.addEventListener('mousedown', this._handleLineMouseDown, true);
  };

  /**
   * 原生 capture 阶段 mousedown（挂热区 path DOM）：
   * Selection 的 Draggable 挂在 #layout-editor-view 容器（冒泡 mousedown stopPropagation），
   * 事件到不了 document → React 合成 onMouseDown 永远不会触发（曾用合成事件，点击线段无高亮的根因）。
   * capture 先于容器冒泡监听执行，stopPropagation 后框选（selection_start）/ 画布选中清除全部收不到
   */
  _handleLineMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    let linkId = e.currentTarget.dataset.linkId;
    if (!linkId) return;
    // 点击线 = 明确的删除/选中意图：把焦点从输入框/编辑态移走。
    // 否则 SVG 线不可聚焦，焦点残留 INPUT → 按 Delete 时 e.target 是 INPUT，
    // _handleKeyDown 保护性跳过（防误删）→ 线删不掉（间歇性复现）
    let ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
      ae.blur();
    }
    // mousedown 即选中/取消（不依赖 click）：点击后的重渲染可能替换热区 DOM，
    // mousedown/mouseup 不在同一元素 → 浏览器不派发 click → 高亮只停留在 hover 期
    this.setState({ selectedId: this.state.selectedId === linkId ? null : linkId });
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
          // 必须高于组件层（组件 zIndex ≥ 1）：锚点贴边后线端/起点标记压在组件边缘上，zIndex 0 会被组件盖住
          zIndex: 100,
        }}
      >
        {links.map((l) => {
          // 相关线（起点/终点是拖动组件）：交互拖动中走简单路径（跟手，不缓存）；
          // 其他线走 path 缓存（_p，拖动/滚动中零重算 → 视觉静止），松手/数据变化/切样式时失效重算
          let moving = this.state.dragId && (l.fromId === this.state.dragId || l.toId === this.state.dragId);
          let d;
          if (moving) {
            d = linkStyle === 'corner' ? cornerPath(l.from, l.to, 10) : linkPath(l.from, l.to);
          } else {
            d = l._p || (l._p = linkStyle === 'corner' ? routePath(l.from, l.to, l.obstacles) : linkPath(l.from, l.to));
          }
          // 视觉分层：hover = 蓝色加深（提示可点，不改变选中状态）；selected = 红色（选中保持）。
          // 选中线 hover 时保持红色不切换，避免"点击没生效"的误判
          let selected = selectedId === l.id;
          let hovering = hoverId === l.id && !selected;
          // 线色/粗细可配置（HeaderLinkStyle）；选中红/hover 蓝为交互反馈色，不随配置；选中/hover 加粗 1px
          let stroke = selected ? '#ff7875' : hovering ? '#40a9ff' : this.getLinkColor();
          let strokeW = selected || hovering ? this.getLinkWidth() + 1 : this.getLinkWidth();
          // 线终点裁剪到箭头底边中心（顶点往回 8px），箭头从底边延伸到顶点 —— 线从三角底部传入；
          // 回退路径（orthoPoints）尾段方向可能背离组件，若不裁剪线会从箭头顶点方向插入，视觉反向
          let u = linkArrowUnit(l.from, l.to, linkStyle);
          let lineD = trimPathEnd(d, { x: l.to.x - u.x * 8, y: l.to.y - u.y * 8 });
          return (
            <g key={l.id}>
              {/* 渲染顺序：线最底 → 箭头/圆点盖住线端（线若画在箭头上会穿出三角形露成"尾巴"） */}
              {/* 可见线：hover 蓝加粗 / 选中红加粗；终点在箭头底边 */}
              <path d={lineD} fill="none" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
              {/* 起点米字（浅色 8 射线，指示出发位置；贴边后压在组件边缘上）+ 终点箭头（与线同色） */}
              <g stroke={STAR_COLOR} strokeWidth={1.5}>
                <line x1={l.from.x - 4.5} y1={l.from.y} x2={l.from.x + 4.5} y2={l.from.y} />
                <line x1={l.from.x} y1={l.from.y - 4.5} x2={l.from.x} y2={l.from.y + 4.5} />
                <line x1={l.from.x - 3.2} y1={l.from.y - 3.2} x2={l.from.x + 3.2} y2={l.from.y + 3.2} />
                <line x1={l.from.x - 3.2} y1={l.from.y + 3.2} x2={l.from.x + 3.2} y2={l.from.y - 3.2} />
              </g>
              <path d={linkArrowPath(l.from, l.to, 8, linkStyle)} fill={stroke} />
              {/* 透明热区（仅编辑器）：加粗 12px，仅线本体可点（capture mousedown 不清除选中）；预览只读不挂 */}
              {!this.props.items && (
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  strokeLinecap="round"
                  pointerEvents="visibleStroke"
                  style={{ cursor: 'pointer' }}
                  data-link-id={l.id}
                  ref={(el) => this.setHotDom(l.id, el)}
                  onMouseOver={() => {
                    this.setState({ hoverId: l.id });
                    // hover 线（变红）后按 Delete 是官方删除路径：同样把焦点从输入框/编辑态移走，
                    // 否则焦点残留 INPUT → _handleKeyDown 保护性跳过（hover 有值、selected 无值时删不掉）
                    let ae = document.activeElement;
                    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
                      ae.blur();
                    }
                  }}
                  onMouseOut={() => this.setState({ hoverId: null })}
                  // 仅阻止 click 冒泡：选中已在 mousedown 完成（不依赖 click 配对），
                  // 若不拦截，click 冒泡到 document 触发画布空白处理（component_inactive → selectedId 清空），
                  // 表现为"点击高亮但无法保持变红"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </g>
          );
        })}
      </svg>
    );
  }
}
