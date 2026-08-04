import Event from '../Base/Event';
import { selection_group } from './actions';
import { isMac } from './platform';
import { getFirstResponder, setFirstResponder } from '../global/instance';
import { IMAGE_MODE_FILL } from '../ui/Image';
import { initialCoverageIndex, pointToWorkspaceCoords } from '../global';
import { parseOjbect } from '../properties/types';
import Matrix from './Matrix';
import qs from 'query-string';

export const getQuery = () => {
  return qs.parse(location.search);
};
export const equalObject = (obj1, obj2) => {
  for (let key in obj1) {
    if (obj1.hasOwnProperty(key)) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
  }
  return true;
};
export const waitForSenconds = (s) => {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
};
/**
 * 由锚点数组生成 SVG path d 串（ViewPath 与 PenTool 预览共用，避免两处漂移）
 * 每个锚点 {x, y, inX, inY, outX, outY, arc}：
 *   in/out 为相对锚点的贝塞尔控制点偏移（全零为直线段）
 *   arc 为带符号拱高（上一锚点到本锚点之间为圆弧段，A 命令；undefined/null 为贝塞尔段）
 * @param {Array} points 局部坐标锚点
 * @param {Boolean} closed 是否闭合
 */
export const buildPathD = (points, closed = false) => {
  if (!points || points.length < 1) return '';
  const round = (n) => Math.round(n);
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    let prev = points[i - 1];
    let cur = points[i];
    if (cur.arc) {
      let arc = buildArcSegment(prev, cur, cur.arc);
      if (arc) {
        d += ' ' + arc;
        continue;
      }
    }
    let hasHandles = prev.outX !== 0 || prev.outY !== 0 || cur.inX !== 0 || cur.inY !== 0;
    if (hasHandles) {
      d += ` C${round(prev.x + prev.outX)} ${round(prev.y + prev.outY)},${round(cur.x + cur.inX)} ${round(cur.y + cur.inY)},${round(cur.x)} ${round(cur.y)}`;
    } else {
      d += ` L${round(cur.x)} ${round(cur.y)}`;
    }
  }
  if (closed) d += ' Z';
  return d;
};

/**
 * 两点 + 带符号拱高 → SVG 圆弧段（A 命令）
 * 弦为 prev→cur，拱顶在弦中点沿法向（-uy, ux）偏移 h 处；|h| > 弦长/2 为优弧（large-arc）
 * @param {{x:number,y:number}} prev 起点
 * @param {{x:number,y:number}} cur 终点
 * @param {number} h 带符号拱高（0 或空返回 null 表示直线段）
 * @returns {string|null} 形如 `Ar r 0 large sweep x y`，或 null
 */
export const buildArcSegment = (prev, cur, h) => {
  const dx = cur.x - prev.x;
  const dy = cur.y - prev.y;
  const d = Math.hypot(dx, dy);
  if (!d || !h) return null;
  const hh = Math.abs(h);
  // 半径：r = (d²/4 + h²) / (2|h|)；圆心在弦中点沿 -n 方向偏移 k = (d²/4 - h²)/(2h)
  const r = (d * d / 4 + hh * hh) / (2 * hh);
  const nx = -dy / d;
  const ny = dx / d;
  const midX = (prev.x + cur.x) / 2;
  const midY = (prev.y + cur.y) / 2;
  const k = (d * d / 4 - hh * hh) / (2 * hh);
  const sign = h > 0 ? 1 : -1;
  const ox = midX - sign * k * nx;
  const oy = midY - sign * k * ny;
  const a1x = prev.x - ox;
  const a1y = prev.y - oy;
  const a2x = cur.x - ox;
  const a2y = cur.y - oy;
  const tx = midX + sign * hh * nx;
  const ty = midY + sign * hh * ny;
  const atx = tx - ox;
  const aty = ty - oy;
  // 以起点角为基准，判断拱顶 T 与终点 P2 的相对绕向，弧必须经过 T：
  // t1 = 起点→拱顶的夹角，t2 = 起点→终点的夹角（同方向量度）
  let theta1 = Math.atan2(a1y, a1x);
  let t1 = (Math.atan2(aty, atx) - theta1 + 2 * Math.PI) % (2 * Math.PI);
  let t2 = (Math.atan2(a2y, a2x) - theta1 + 2 * Math.PI) % (2 * Math.PI);
  let sweep, extent;
  if (t1 < t2) {
    sweep = 0; // 逆时针（y 向下坐标系）
    extent = t2;
  } else {
    sweep = 1; // 顺时针
    extent = 2 * Math.PI - t2;
  }
  const large = extent > Math.PI ? 1 : 0;
  const round = (n) => Math.round(n);
  return `A${round(r)} ${round(r)} 0 ${large} ${sweep} ${round(cur.x)} ${round(cur.y)}`;
};

/**
 * 弧段的拱顶点（局部坐标）——ViewPath 编辑模式控制点位置用，与 buildArcSegment 同一几何
 * @param {{x:number,y:number}} prev
 * @param {{x:number,y:number}} cur
 * @param {number} h 带符号拱高
 * @returns {{x:number,y:number}}
 */
export const arcTopPoint = (prev, cur, h) => {
  const dx = cur.x - prev.x;
  const dy = cur.y - prev.y;
  const d = Math.hypot(dx, dy);
  if (!d || !h) return { x: (prev.x + cur.x) / 2, y: (prev.y + cur.y) / 2 };
  const sign = h > 0 ? 1 : -1;
  return {
    x: (prev.x + cur.x) / 2 + sign * Math.abs(h) * (-dy / d),
    y: (prev.y + cur.y) / 2 + sign * Math.abs(h) * (dx / d),
  };
};
export const getZooms = (n, bounce = 1) => {
  let result = [];
  for (let i = 0; i < n; i++) {
    result[i] = 100 / (100 + i * 10 * bounce);
  }
  return result;
};
export const uuid = (prefix = '') => {
  return (
    prefix +
    Math.random()
      .toString()
      .slice(2) +
    Math.random()
      .toString()
      .slice(2)
  ).slice(0, 16);
};
export const deg2rad = (deg) => {
  return (Math.PI / 180) * deg;
};
export const rad2deg = (rad) => {
  return (rad * 180) / Math.PI;
};
export const ctrlkey = (key) => {
  return (isMac() ? '⌘' : 'ctrl') + key.toUpperCase();
};
export const DEFAULT_IMG =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNTUwMzgwNzcwNzU3IiBjbGFzcz0iaWNvbiIgc3R5bGU9IiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjI1MTYwIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiPjxkZWZzPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+PC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTk5Ni42OTMzMzMgNzg3LjI4NTMzMyA3MzguNDc0NjY3IDQ3MS4yMTA2NjdjLTQuNjA4LTUuODAyNjY3LTExLjYwNTMzMy05LjIxNi0xOC45NDQtOS4zODY2NjctNy4zMzg2NjctMC4xNzA2NjctMTQuNTA2NjY3IDIuNzMwNjY3LTE5LjQ1NiA4LjAyMTMzM2wtMTMyLjI2NjY2NyAxNDAuOEwzNzguNzA5MzMzIDMwOC45MDY2NjdjLTQuNjA4LTcuNTA5MzMzLTEyLjgtMTEuOTQ2NjY3LTIxLjY3NDY2Ny0xMS45NDY2NjctOC44NzQ2NjcgMC0xNy4wNjY2NjcgNC42MDgtMjEuNjc0NjY3IDExLjk0NjY2N0wyNS40MjkzMzMgODAzLjY2OTMzM2MtNy41MDkzMzMgMTEuOTQ2NjY3LTMuOTI1MzMzIDI3LjgxODY2NyA4LjAyMTMzMyAzNS4zMjggMTEuOTQ2NjY3IDcuNTA5MzMzIDI3LjgxODY2NyAzLjkyNTMzMyAzNS4zMjgtOC4wMjEzMzNsMjg4LjI1Ni00NjAuMTE3MzMzIDI4OC4yNTYgNDYwLjExNzMzM2M3LjUwOTMzMyAxMS45NDY2NjcgMjMuMjEwNjY3IDE1LjUzMDY2NyAzNS4zMjggOC4wMjEzMzMgMTEuOTQ2NjY3LTcuNTA5MzMzIDE1LjUzMDY2Ny0yMy4yMTA2NjcgOC4wMjEzMzMtMzUuMzI4bC05Mi44NDI2NjctMTQ4LjEzODY2NyAxMjEuNTE0NjY3LTEyOS4xOTQ2NjcgMjM5Ljc4NjY2NyAyOTMuMzc2YzguODc0NjY3IDEwLjkyMjY2NyAyNS4wODggMTIuNjI5MzMzIDM2LjAxMDY2NyAzLjU4NEMxMDA0LjAzMiA4MTQuNDIxMzMzIDEwMDUuNTY4IDc5OC4yMDggOTk2LjY5MzMzMyA3ODcuMjg1MzMzeiIgcC1pZD0iMjUxNjEiIGZpbGw9IiM4YThhOGEiPjwvcGF0aD48cGF0aCBkPSJNODQ0LjggNDI5LjU2OGMxLjcwNjY2NyAwIDMuMjQyNjY3IDAgNC45NDkzMzMtMC4xNzA2NjcgNjYuOTAxMzMzLTIuNzMwNjY3IDExOS4yOTYtNTcuNjg1MzMzIDExOS4yOTYtMTI0LjA3NDY2NyAwLTEuNzA2NjY3IDAtMy4yNDI2NjctMC4xNzA2NjctNC45NDkzMzMtMi43MzA2NjctNjYuOTAxMzMzLTU3LjY4NTMzMy0xMTkuMjk2LTEyNC4wNzQ2NjctMTE5LjI5Ni0xLjcwNjY2NyAwLTMuMjQyNjY3IDAtNC45NDkzMzMgMC4xNzA2NjctNjYuOTAxMzMzIDIuNzMwNjY3LTExOS4yOTYgNTcuNjg1MzMzLTExOS4yOTYgMTI0LjA3NDY2NyAwIDEuNzA2NjY3IDAgMy40MTMzMzMgMC4xNzA2NjcgNC45NDkzMzNDNzIzLjI4NTMzMyAzNzcuMTczMzMzIDc3OC40MTA2NjcgNDI5LjU2OCA4NDQuOCA0MjkuNTY4ek04NDEuODk4NjY3IDIzMi40NDhsMi45MDEzMzMgMGMzOC45MTIgMCA3MS4zMzg2NjcgMzAuODkwNjY3IDcyLjg3NDY2NyA3MC4xNDQgMCAwIDAgMi45MDEzMzMgMCAyLjkwMTMzMyAwIDM4LjkxMi0zMC43MiA3MS4zMzg2NjctNzAuMTQ0IDcyLjg3NDY2N2wtMi45MDEzMzMgMC4xNzA2NjdjLTM4LjkxMiAwLTcxLjMzODY2Ny0zMC44OTA2NjctNzIuODc0NjY3LTcwLjE0NGwwLTIuOTAxMzMzQzc3MS43NTQ2NjcgMjY2LjQxMDY2NyA4MDIuNjQ1MzMzIDIzMy45ODQgODQxLjg5ODY2NyAyMzIuNDQ4eiIgcC1pZD0iMjUxNjIiIGZpbGw9IiM4YThhOGEiPjwvcGF0aD48L3N2Zz4=';
export const ANIMATIONS = [
  { label: '弹跳', key: 'bounce' },
  { label: '闪现', key: 'flash' },
  {
    label: '跳动',
    key: 'pulse',
  },
  { label: '橡皮筋', key: 'rubberBand' },
  { label: '抖动', key: 'shake' },
  {
    label: '摇摆',
    key: 'swing',
  },
  { label: '蹦嚓嘿', key: 'tada' },
  { label: '摇晃', key: 'wobble' },
  { label: '扭曲', key: 'jello' },
  {
    label: '心动',
    key: 'heartBeat',
  },
  {
    label: '弹入',
    key: 'bounceIn',
  },
  { label: '下弹入', key: 'bounceInDown' },
  { label: '左弹入', key: 'bounceInLeft' },
  {
    label: '右弹入',
    key: 'bounceInRight',
  },
  { label: '上弹入', key: 'bounceInUp' },
  { label: '弹出', key: 'bounceOut' },
  {
    label: '下弹出',
    key: 'bounceOutDown',
  },
  { label: '左弹出', key: 'bounceOutLeft' },
  { label: '右弹出', key: 'bounceOutRight' },
  {
    label: '上弹出',
    key: 'bounceOutUp',
  },
  { label: '淡入', key: 'fadeIn' },
  { label: '下淡入', key: 'fadeInDown' },
  {
    label: '下淡入',
    key: 'fadeInDownBig',
  },
  { label: '左淡入', key: 'fadeInLeft' },
  { label: '左淡入2', key: 'fadeInLeftBig' },
  {
    label: '右淡入',
    key: 'fadeInRight',
  },
  { label: '右淡入2', key: 'fadeInRightBig' },
  { label: '上淡入', key: 'fadeInUp' },
  {
    label: '上淡入2',
    key: 'fadeInUpBig',
  },
  { label: '淡出', key: 'fadeOut' },
  { label: '下淡出', key: 'fadeOutDown' },
  {
    label: '下淡出2',
    key: 'fadeOutDownBig',
  },
  { label: '左淡出', key: 'fadeOutLeft' },
  { label: '左淡出2', key: 'fadeOutLeftBig' },
  {
    label: '又淡出',
    key: 'fadeOutRight',
  },
  { label: '右淡出2', key: 'fadeOutRightBig' },
  { label: '上淡出', key: 'fadeOutUp' },
  {
    label: '上淡出2',
    key: 'fadeOutUpBig',
  },
  { label: '翻转', key: 'flip' },
  { label: '垂直转入', key: 'flipInX' },
  { label: '水平转入', key: 'flipInY' },
  {
    label: '垂直转出',
    key: 'flipOutX',
  },
  { label: '水平转出', key: 'flipOutY' },
  { label: '动感', key: 'lightSpeedIn' },
  {
    label: '动感出',
    key: 'lightSpeedOut',
  },
  { label: '旋入', key: 'rotateIn' },
  { label: '左下旋入', key: 'rotateInDownLeft' },
  {
    label: '右下旋入',
    key: 'rotateInDownRight',
  },
  { label: '左上旋入', key: 'rotateInUpLeft' },
  { label: '右上旋入', key: 'rotateInUpRight' },
  {
    label: '旋出',
    key: 'rotateOut',
  },
  { label: '左下旋出', key: 'rotateOutDownLeft' },
  { label: '右下旋出', key: 'rotateOutDownRight' },
  {
    label: '左上旋出',
    key: 'rotateOutUpLeft',
  },
  { label: '右上旋出', key: 'rotateOutUpRight' },
  { label: '上滑入', key: 'slideInUp' },
  {
    label: '下滑入',
    key: 'slideInDown',
  },
  { label: '左滑入', key: 'slideInLeft' },
  { label: '右滑入', key: 'slideInRight' },
  {
    label: '滑出',
    key: 'slideOutUp',
  },
  { label: '下滑出', key: 'slideOutDown' },
  { label: '左滑出', key: 'slideOutLeft' },
  {
    label: '右滑出',
    key: 'slideOutRight',
  },
  { label: '放大', key: 'zoomIn' },
  { label: '下放大', key: 'zoomInDown' },
  {
    label: '左放大',
    key: 'zoomInLeft',
  },
  { label: '右放大', key: 'zoomInRight' },
  { label: '上放大', key: 'zoomInUp' },
  {
    label: '缩小',
    key: 'zoomOut',
  },
  { label: '下缩小', key: 'zoomOutDown' },
  { label: '左缩小', key: 'zoomOutLeft' },
  {
    label: '右缩小',
    key: 'zoomOutRight',
  },
  { label: '上缩小', key: 'zoomOutUp' },
  { label: '掉落', key: 'hinge' },
  {
    label: '欧耶',
    key: 'jackInTheBox',
  },
  { label: '转入', key: 'rollIn' },
  { label: '转出', key: 'rollOut' },
];
export const getDropView = (e, data) => {
  let { x, y } = pointToWorkspaceCoords(e);
  let view = null;
  if (data.type === 'AdvanceComponent') {
    // 高级组件，通过工具制作
    view = parseOjbect(data.data, true);
    // Mouse point
    view.transform.x = x;
    view.transform.y = y;
    view.zIndex = initialCoverageIndex();
  } else {
    // 预制组件，基础组件，基础图标
    let send = {
      type: data.type,
      id: uuid('sb_'),
      transform: {
        x,
        y,
        width: data.width || 100,
        height: data.height || 100,
        rotation: 0,
      },
    };
    view = parseOjbect(send, true);
    // Icon
    if (data.type == 'icon') {
      view.icon = {
        data: data.data,
        content: data.fontContent,
      };
      view.transform.width = view.transform.height = 20;
    } else if (data.type === 'image') {
      view.image = {
        fill: IMAGE_MODE_FILL,
        source: data.data || DEFAULT_IMG,
      };
    }
  }
  return view;
};
/**
 *
 * @param target {ViewProperties}
 */
export const activeAfterMounting = (target) => {
  setTimeout(() => {
    if (Array.isArray(target)) {
      Event.dispatch(
        selection_group,
        target.map((item) => item.view)
      );
    } else {
      setFirstResponder(target.view);
    }
  }, 20);
};
export const randomId = (prefix = '') => {
  return (
    prefix +
    '_' +
    Math.random()
      .toString()
      .slice(2)
  );
};

export class Dom {
  /**
   *
   * @param dom {HTMLElement | Selector}
   */
  constructor(dom, context) {
    if (typeof dom === 'string') {
      context = context || document;
      this.dom = context.querySelector(dom);
    } else {
      /**
       *
       * @type {HTMLElement}
       */
      this.dom = dom;
    }
    /**
     *
     * @type {CSSStyleDeclaration}
     */
    this.style = this.dom.style;
  }

  /**
   *
   * @param {HtmlElement}
   * @return {Dom}
   */
  static of(d) {
    return new Dom(d);
  }

  className(name) {
    this.dom.setAttribute('class', name);
    return;
  }

  attr(key, value) {
    this.dom.setAttribute(key, value);
    return this;
  }

  data(key) {
    return this.dom.dataset[key];
  }

  /**
   *
   * @param w
   * @return {Dom}
   */
  width(w) {
    this.style.width = this.getUnit(w);
    return this;
  }

  /**
   *
   * @param h
   * @return {Dom}
   */
  height(h) {
    this.style.height = this.getUnit(h);
    return this;
  }

  /**
   *
   * @param l
   * @return {Dom}
   */
  left(l) {
    this.style.left = this.getUnit(l);
    return this;
  }

  zIndex(index) {
    this.style.zIndex = index;
    return this;
  }

  /**
   *
   * @param t
   * @return {Dom}
   */
  top(t) {
    this.style.top = this.getUnit(t);
    return this;
  }

  text(v) {
    this.dom.innerText = v;
    return this;
  }

  /**
   *
   * @return {Dom}
   */
  show(s) {
    this.style.display = s || 'block';
    return this;
  }

  /**
   *
   * @return {Dom}
   */
  hide() {
    this.style.display = 'none';
    return this;
  }

  showHide(v) {
    this.style.display = v ? 'block' : 'none';
    return this;
  }

  getUnit(w) {
    return w.toString().endsWith('%') ? w : Math.floor(w) + 'px';
  }

  border({ width, color, style }) {
    this.style.border = `${width}px ${style} ${color}`;
    return this;
  }

  none() {
    this.style.overflow = 'none';
  }

  overflow(type) {
    this.style.overflow = type;
  }

  shadow({ type, offsetX, offsetY, spread, blur, color }) {
    let shadow = null;
    if (type === 'outset') {
      shadow = `${offsetX}px ${offsetY}px ${blur}px ${spread}px  ${color}`;
    } else {
      shadow = `${type} ${offsetX}px ${offsetY}px ${blur}px ${spread}px  ${color}`;
    }
    this.style.boxShadow = shadow;
    return this;
  }

  borderRadius(r) {
    this.borderRadiusTopLeft(r);
    this.borderRadiusTopRight(r);
    this.borderRadiusBottomLeft(r);
    this.borderRadiusBottomRight(r);
    return this;
  }

  borderRadiusTopLeft(r) {
    this.style.borderTopLeftRadius = this.getUnit(r);
    return this;
  }

  css(key, value) {
    this.style[key] = value;
    return this;
  }

  borderRadiusTopRight(r) {
    this.style.borderTopRightRadius = this.getUnit(r);
    return this;
  }

  borderRadiusBottomLeft(r) {
    this.style.borderBottomLeftRadius = this.getUnit(r);
    return this;
  }

  borderRadiusBottomRight(r) {
    this.style.borderBottomRightRadius = this.getUnit(r);
    return this;
  }

  background(color) {
    this.style.background = color;
    return this;
  }

  fontSize(v) {
    this.style.fontSize = v + 'px';
    return this;
  }

  fontColor(v) {
    this.style.color = v;
    return this;
  }

  fontStyle(style = []) {
    if (style.indexOf('bold') > -1) {
      this.style.fontWeight = 'bold';
    } else {
      this.style.fontWeight = 'normal';
    }
    if (style.indexOf('italic') > -1) {
      this.style.fontStyle = 'italic';
    } else {
      this.style.fontStyle = 'normal';
    }
    return this;
  }

  decorator(d) {
    this.style.textDecoration = d || 'none';
    return this;
  }

  alignX(d) {
    this.style.justifyContent = d;
    return this;
  }

  alignY(d) {
    this.style.alignItems = d;
    return this;
  }

  lineHeight(h) {
    this.style.lineHeight = h;
    return this;
  }

  letterSpacing(s) {
    this.style.letterSpacing = s + 'px';
    return this;
  }
}

/**
 *  获取矩形的边界位置
 * @param x
 * @param y
 * @param width
 * @param height
 * @param rotation
 * @return {*}
 */
export const getClientBoundingRect = ({ x, y, width, height, rotation }) => {
  let a = (rotation * Math.PI) / 180;
  let wc = width / 2;
  let hc = height / 2;
  let deg = new Matrix([
    [Math.cos(a), Math.sin(a)],
    [-Math.sin(a), Math.cos(a)],
  ]);
  let rect = new Matrix([
    [-wc, hc],
    [wc, hc],
    [wc, -hc],
    [-wc, -hc],
  ]);
  //  四个顶点坐标
  let xarr = [];
  let yarr = [];
  let points = deg
    .dot(rect.T())
    .T()
    .valueOf()
    .map((item) => {
      let x1 = item[0] + wc + x;
      let y1 = -(item[1] - hc) + y;
      xarr.push(x1);
      yarr.push(y1);
      return { x: x1, y: y1 };
    });
  xarr = xarr.sort((a, b) => a - b);
  yarr = yarr.sort((a, b) => a - b);
  let x1 = xarr[0];
  let x2 = xarr[xarr.length - 1];
  let y1 = yarr[0];
  let y2 = yarr[yarr.length - 1];
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    origin: { x, y, width, height, rotation },
    rotation,
    points,
  };
};
export const isTemporaryGroup = () => {
  return getFirstResponder().properties.isTemporaryGroup;
};
const typeOf = (object) => {
  return Object.prototype.toString.call(object);
};
export const isPlainObject = (object) => {
  return typeOf(object) === '[object Object]';
};
export const isNumber = (data) => {
  return typeOf(data) === ['[object Number]'];
};
export const isString = (data) => {
  return typeOf(data) === ['[object String]'];
};
export const isBoolean = (data) => {
  return typeOf(data) === ['[object Boolean]'];
};
export const isNull = (data) => {
  return data === null;
};
export const isUndefined = (data) => {
  return data === void 0;
};
export const isArray = (arr) => {
  return Array.isArray(arr);
};
export const isEmpty = (data) => {
  return data === '' || data === void 0 || data === null;
};
export const isBaseType = (data) => {
  return isBoolean(data) || isNumber(data) || isString(data) || isNull(data);
};
export const cleanEmpty = (object) => {
  let result = {};
  for (let key in object) {
    if (object.hasOwnProperty(key)) {
      let value = object[key];
      if (value !== void 0 && value !== null && value !== '') {
        result[key] = value;
      }
    }
  }
  return result;
};
/**
 * 延时执行
 * @param s
 * @return {Promise<any>}
 */
export const waitForSeconds = (s) => {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
};
//当组件的props改变的时候于原数据合并
export const mergeProps = (oldValue, newValue) => {
  // 只处理对象 合并，其他直接返回
  if (isPlainObject(newValue)) {
    newValue = Object.assign({}, oldValue, newValue);
  }
  return newValue;
};
