/**
 *  created by yaojun on 2018/12/7
 *
 */
import React, { Fragment } from 'react';
import Event from '../Base/Event';
import {
  component_active,
  component_drag,
  component_dragend,
  component_properties_change,
  component_resize_end,
  component_snap_change,
  component_snap_change_end,
  controllers_ready,
  editor_scroll_change,
  guide_ready,
} from '../util/actions';
import './Snapline.scss';
import config from '../util/preference';
import NoZoomTransform from '../Base/NoZoomTransform';
import { Dom } from '../util/helper';
import { getGroupId } from '../global/selection';
import { getScreeTransform } from '../global';

let P = config.autoAlign;
export default class Snapline extends NoZoomTransform {
  constructor() {
    super();
    /**
     * 将页面所有组件转为数组
     * @type {Array<{x:number,y:number,width:number,height:number}>}
     */
    this.arrayItems = [];
    /**
     *
     * 已匹配到的数据
     * @type {Array<{x:number,y:number,width:number,height:number,rotation:number}>}
     */
    this.matched = [];
    /**
     *
     * @type {ViewController}
     */
    this.target = null;
    /**
     *
     * @type {Array<Line>}
     */
    this.guide = null;
    /**
     *
     * @type {Array<ViewProperties>}
     */
    this.controller = null;
    /**
     *
     * @type {Dom}
     */
    this.htline = null;
    /**
     *
     * @type {Dom}
     */
    this.hcline = null;
    /**
     *
     * @type {Dom}
     */
    this.hbline = null;
    /**
     *
     * @type {Dom}
     */
    this.vlline = null;
    /**
     *
     * @type {Dom}
     */
    this.vcline = null;
    /**
     *
     * @type {Dom}
     */
    this.vrline = null;
    /**
     * 间距标注（Figma 风格距离数字）
     * @type {Dom}
     */
    this.hlabel = null;
    this.vlabel = null;
    Event.listen(guide_ready, this.onGuideReady);
    Event.listen(controllers_ready, this.onControllersReady);
    Event.listen(component_active, this.onComponentActive);
    Event.listen(component_drag, this.onComponentDrag);
    Event.listen(component_dragend, this.onComponentDragEnd);
    Event.listen(component_resize_end, this.onComponentDragEnd);
  }

  componentDidMount() {
    this.htline = Dom.of(this.refs.ht);
    this.hcline = Dom.of(this.refs.hc);
    this.hbline = Dom.of(this.refs.hb);
    this.vlline = Dom.of(this.refs.vl);
    this.vcline = Dom.of(this.refs.vc);
    this.vrline = Dom.of(this.refs.vr);
    this.hlabel = Dom.of(this.refs.hlabel);
    this.vlabel = Dom.of(this.refs.vlabel);
    this.hline = Dom.of(this.refs.hline);
    this.vline = Dom.of(this.refs.vline);
    this.setLineSize();
  }

  // ==================== 间距标注（Figma 风格） ====================

  // 水平间距标注：连接线从 t1 右缘连到 t2 左缘，数字在间隙中心
  // skipLine：中心对齐（hc）时 hcline 已画在同一 y 上，跳过独立连接线让数字直接骑在辅助线上
  showHDist = (t1, t2, dx, skipLine = false) => {
    let scale = getScreeTransform().scale;
    let cx = (t1.x + t1.width + t2.x) / 2; // 间隙中点 x（工作区）
    let cy = (t1.y + t1.height / 2 + t2.y + t2.height / 2) / 2; // 两组件垂直中心中点
    this.refs.hlabel.innerHTML = Math.round(Math.abs(dx));
    this.hlabel.left(cx * scale).top(cy * scale).show();
    if (skipLine) {
      this.hline.hide();
    } else {
      // 连接线：从 t1 右缘到 t2 左缘（间隙宽度），位于两组件垂直中心
      this.hline
        .left((t1.x + t1.width) * scale)
        .top(cy * scale)
        .width(Math.abs(dx) * scale)
        .show();
    }
  };

  // 垂直间距标注：连接线从 t1 底缘连到 t2 顶缘，数字在间隙中心
  // skipLine：中心对齐（vc）时 vcline 已画在同一 x 上，跳过独立连接线让数字直接骑在辅助线上
  showVDist = (t1, t2, dy, skipLine = false) => {
    let scale = getScreeTransform().scale;
    let cy = (t1.y + t1.height + t2.y) / 2; // 间隙中点 y（工作区）
    let cx = (t1.x + t1.width / 2 + t2.x + t2.width / 2) / 2; // 两组件水平中心中点
    this.refs.vlabel.innerHTML = Math.round(Math.abs(dy));
    this.vlabel.left(cx * scale).top(cy * scale).show();
    if (skipLine) {
      this.vline.hide();
    } else {
      // 连接线：从 t1 底缘到 t2 顶缘（间隙高度），位于两组件水平中心
      this.vline
        .left(cx * scale)
        .top((t1.y + t1.height) * scale)
        .height(Math.abs(dy) * scale)
        .show();
    }
  };

  hideDist = () => {
    this.hlabel.hide();
    this.vlabel.hide();
    this.hline.hide();
    this.vline.hide();
  };

  // 相邻间隙检测（Figma 风格间距标注，与吸附解耦）：
  // 与目标在垂直/水平方向重叠的组件，若间隙在 DIST_MAX 内则显示间距数字
  // 互斥规则（避免与辅助线重复）：
  //  - gap < 吸附阈值 P：同一对组件处于吸附中，只显示辅助线，不显示间距数字
  //  - 中心对齐（slots.hc/vc === t1）：数字骑在中心辅助线上，跳过独立连接线
  checkDistances = (t2, slots) => {
    let items = this.arrayItems;
    let DIST_MAX = 60; // 显示间距标注的最大间隙（px）
    for (let i = 0, j = items.length; i < j; i++) {
      let t1 = items[i];
      // 垂直重叠 → 水平间隙（t1 在左或右）
      if (t1.y < t2.y + t2.height && t1.y + t1.height > t2.y) {
        let gap = t2.x - (t1.x + t1.width);
        if (gap >= P && gap <= DIST_MAX) {
          this.showHDist(t1, t2, gap, slots.hc === t1);
          return;
        }
        gap = t1.x - (t2.x + t2.width);
        if (gap >= P && gap <= DIST_MAX) {
          this.showHDist(t2, t1, gap, slots.hc === t1);
          return;
        }
      }
      // 水平重叠 → 垂直间隙（t1 在上或下）
      if (t1.x < t2.x + t2.width && t1.x + t1.width > t2.x) {
        let gap = t2.y - (t1.y + t1.height);
        if (gap >= P && gap <= DIST_MAX) {
          this.showVDist(t1, t2, gap, slots.vc === t1);
          return;
        }
        gap = t1.y - (t2.y + t2.height);
        if (gap >= P && gap <= DIST_MAX) {
          this.showVDist(t2, t1, gap, slots.vc === t1);
          return;
        }
      }
    }
  };

  setLineSize = (scale = 1) => {
    let view = config.viewport;
    Dom.of(this.refs.g1).width(view.width * scale);
    Dom.of(this.refs.g2).height(view.height * scale);
  };
  onControllersReady = (c) => {
    this.controller = c;
  };
  onComponentActive = (t) => {
    this.target = t;
    P = config.autoAlign;
    this.setBoundingRect();
    let arrayItems = [];

    function treeToArray(items) {
      let targetId = t.properties.id;
      for (let i = 0, j = items.length; i < j; i += 1) {
        let item = items[i];
        //  去掉自己，和自己的子元素
        if (getGroupId()[item.id]) continue;
        if (targetId === item.id) continue;
        if (item.settings.isHide) continue;
        if (item.type === 'block') {
          treeToArray(item.items);
        } else {
          // 用未旋转边缘（getOffsetRect）：辅助线贴组件真实边缘，
          // 旋转组件用 getOffsetTransform 会得到膨胀包围盒导致线离组件有空隙
          let rect = item.view.getOffsetRect();
          let t = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          t._originTransform = rect;
          arrayItems.push(t);
        }
      }
    }

    treeToArray(this.controller.state.items);
    this.arrayItems = arrayItems;
  };
  // 组件间对齐线：定位在对齐位置（拖动组件的边缘/中心），长度只覆盖两组件范围（不贯穿全屏）；
  // 画布对齐（无 t1）保持贯穿
  showHTLine = (t, t1) => {
    let line = this.htline;
    let scale = getScreeTransform().scale;
    line.top(t.y * scale); // 水平对齐线：y = 拖动组件顶缘
    if (t1) {
      let left = Math.min(t1.x, t.x) * scale;
      let right = Math.max(t1.x + t1.width, t.x + t.width) * scale;
      line.left(left).width(right - left).show();
    } else {
      line.left(0).width(config.viewport.width * scale).show();
    }
  };
  showHBLine = (t, t1) => {
    let line = this.hbline;
    let scale = getScreeTransform().scale;
    line.top(t.y * scale + t.height * scale); // y = 拖动组件底缘
    if (t1) {
      let left = Math.min(t1.x, t.x) * scale;
      let right = Math.max(t1.x + t1.width, t.x + t.width) * scale;
      line.left(left).width(right - left).show();
    } else {
      line.left(0).width(config.viewport.width * scale).show();
    }
  };

  showHCLine(t, t1) {
    let line = this.hcline;
    let scale = getScreeTransform().scale;
    line.top(t.y * scale + (t.height * scale) / 2); // y = 拖动组件垂直中心
    if (t1) {
      let left = Math.min(t1.x, t.x) * scale;
      let right = Math.max(t1.x + t1.width, t.x + t.width) * scale;
      line.left(left).width(right - left).show();
    } else {
      line.left(0).width(config.viewport.width * scale).show();
    }
  }

  showVCLine(t, t1) {
    let line = this.vcline;
    let scale = getScreeTransform().scale;
    line.left(t.x * scale + (t.width * scale) / 2); // 垂直对齐线：x = 拖动组件水平中心
    if (t1) {
      let top = Math.min(t1.y, t.y) * scale;
      let bottom = Math.max(t1.y + t1.height, t.y + t.height) * scale;
      line.top(top).height(bottom - top).show();
    } else {
      line.top(0).height(config.viewport.height * scale).show();
    }
  }

  showVLLine(t, t1) {
    let line = this.vlline;
    let scale = getScreeTransform().scale;
    line.left(t.x * scale); // x = 拖动组件左缘
    if (t1) {
      let top = Math.min(t1.y, t.y) * scale;
      let bottom = Math.max(t1.y + t1.height, t.y + t.height) * scale;
      line.top(top).height(bottom - top).show();
    } else {
      line.top(0).height(config.viewport.height * scale).show();
    }
  }

  showVRLine(t, t1) {
    let line = this.vrline;
    let scale = getScreeTransform().scale;
    line.left(t.x * scale + t.width * scale); // x = 拖动组件右缘
    if (t1) {
      let top = Math.min(t1.y, t.y) * scale;
      let bottom = Math.max(t1.y + t1.height, t.y + t.height) * scale;
      line.top(top).height(bottom - top).show();
    } else {
      line.top(0).height(config.viewport.height * scale).show();
    }
  }

  hideAllLines = () => {
    ['ht', 'hc', 'hb', 'vl', 'vc', 'vr'].forEach((k) => this[k + 'line'].hide());
  };
  onComponentDrag = (target, options = {}) => {
    this.hideDist(); // 每帧先隐藏间距标注，匹配到再显示
    // 程序化变换（对齐/属性修改/Snapline 自身回显）路径：清除残留辅助线
    if (options.hideGuides || options.from === 'Snapline') {
      this.hideAllLines();
      return;
    }
    // Refresh current position
    this.setBoundingRect();
    // 未旋转边缘：与 arrayItems 同一坐标系，线贴组件真实边缘
    let t2 = this.target.getOffsetRect();
    let slots = this.checkComponentDistance(t2);
    let cmatched = this.alignParent();
    // 6 个方向（snap index 0-5 = ht,hc,hb,vl,vc,vr，与既有 Highlight 映射保持一致）
    let order = ['ht', 'hc', 'hb', 'vl', 'vc', 'vr'];
    let showFns = {
      vl: (a, b) => this.showVLLine(a, b),
      vc: (a, b) => this.showVCLine(a, b),
      vr: (a, b) => this.showVRLine(a, b),
      ht: (a, b) => this.showHTLine(a, b),
      hc: (a, b) => this.showHCLine(a, b),
      hb: (a, b) => this.showHBLine(a, b),
    };
    // 先全部隐藏（组件间短线段 ↔ 画布贯穿线切换时不残留）
    this.hideAllLines();
    // 逐方向渲染：组件匹配优先（两组件范围），画布对齐兜底（贯穿线）
    for (let i = 0; i < order.length; i++) {
      let k = order[i];
      let t1 = slots[k];
      if (t1) {
        showFns[k](t2, t1);
        Event.dispatch(component_snap_change, t1._originTransform, i);
      } else if (cmatched[i] !== undefined) {
        showFns[k](t2);
      } else {
        Event.dispatch(component_snap_change_end, i);
      }
    }
    this.checkDistances(t2, slots); // 相邻间隙间距标注（与吸附独立，传 slots 判断中心对齐骑线）
    this.matched = slots;
    this.cmatched = cmatched;
  };
  /**
   *
   * @return {number} 0=h,1=v
   */
  alignParent = () => {
    let vw = config.viewport.width;
    let vh = config.viewport.height;
    let x = 0;
    let parent = this.target.properties.parent;
    let t = this.target.getCurrentTransform();
    if (parent) {
      vw = parent.transform.width;
      vh = parent.transform.height;
    }
    let matched = [];
    let dx = 0 - t.x,
      dx2 = vw / 2 - (t.x + t.width / 2),
      dx3 = vw - (t.x + t.width);
    if (Math.abs(dx) < P) matched[0] = dx; // Left
    else if (Math.abs(dx2) < P) matched[1] = dx2; // Center
    else if (Math.abs(dx3) < P) matched[2] = dx3; // Right
    dx = 0 - t.y;
    dx2 = vh / 2 - (t.y + t.height / 2);
    dx3 = vh - (t.y + t.height);
    if (Math.abs(dx) < P) matched[3] = dx; // Top
    else if (Math.abs(dx2) < P) matched[4] = dx2; // Middle
    else if (Math.abs(dx3) < P) matched[5] = dx3; // Bottom
    return matched;
  };
  /**
   * 返回匹配的 元素（slots 收集模式：6 个方向各自独立找最近匹配，可同时显示多条辅助线）
   * @return {{vl:*, vc:*, vr:*, ht:*, hc:*, hb:*}}
   */
  checkComponentDistance = (t2) => {
    let slots = { vl: null, vc: null, vr: null, ht: null, hc: null, hb: null };
    let items = this.arrayItems;
    for (let i = 0, j = items.length; i < j; i++) {
      let t1 = items[i];
      this.matchVL(t1, t2, slots);
      this.matchVC(t1, t2, slots);
      this.matchVR(t1, t2, slots);
      this.matchHT(t1, t2, slots);
      this.matchHC(t1, t2, slots);
      this.matchHB(t1, t2, slots);
    }
    return slots;
  };
  // 每个 match 只记录最近匹配到 slots，不再直接渲染（渲染统一在 onComponentDrag 逐方向处理）
  matchVL = (t1, t2, slots) => {
    // 先清空该方向旧标志，防止跨帧残留导致 dragend 使用过期 diff 吸附
    t1._alignType_v_left = null;
    t1._alignDiff_v_left = null;
    t1._alignType_v_right_left = null;
    t1._alignDiff_v_right_left = null;
    let dx = t1.x - t2.x,
      dx2 = t1.x + t1.width - t2.x;
    if (Math.abs(dx) < P) {
      t1._alignType_v_left = true;
      t1._alignDiff_v_left = dx;
      if (!slots.vl || Math.abs(dx) < Math.abs(slots.vl._alignDiff_v_left)) slots.vl = t1;
    } else if (Math.abs(dx2) < P) {
      t1._alignType_v_right_left = true;
      t1._alignDiff_v_right_left = dx2;
      if (!slots.vl || Math.abs(dx2) < Math.abs(slots.vl._alignDiff_v_right_left)) slots.vl = t1;
    }
  };
  matchVC = (t1, t2, slots) => {
    t1._alignType_v_center = null;
    t1._alignDiff_v_center = null;
    let dx = t1.x + t1.width / 2 - (t2.x + t2.width / 2);
    if (Math.abs(dx) < P) {
      t1._alignType_v_center = true;
      t1._alignDiff_v_center = dx;
      if (!slots.vc || Math.abs(dx) < Math.abs(slots.vc._alignDiff_v_center)) slots.vc = t1;
    }
  };
  matchVR = (t1, t2, slots) => {
    t1._alignType_v_right = null;
    t1._alignDiff_v_right = null;
    t1._alignType_v_left_right = null;
    t1._alignDiff_v_left_right = null;
    let dx = t1.x + t1.width - (t2.x + t2.width),
      dx2 = t1.x - (t2.x + t2.width);
    if (Math.abs(dx) < P) {
      t1._alignType_v_right = true;
      t1._alignDiff_v_right = dx;
      if (!slots.vr || Math.abs(dx) < Math.abs(slots.vr._alignDiff_v_right)) slots.vr = t1;
    } else if (Math.abs(dx2) < P) {
      t1._alignType_v_left_right = true;
      t1._alignDiff_v_left_right = dx2;
      if (!slots.vr || Math.abs(dx2) < Math.abs(slots.vr._alignDiff_v_left_right)) slots.vr = t1;
    }
  };
  matchHT = (t1, t2, slots) => {
    t1._alignType_h_top = null;
    t1._alignDiff_h_top = null;
    t1._alignType_h_bottom_top = null;
    t1._alignDiff_h_bottom_top = null;
    let dx = t1.y - t2.y,
      dx2 = t1.height + t1.y - t2.y;
    if (Math.abs(dx) < P) {
      t1._alignType_h_top = true;
      t1._alignDiff_h_top = dx;
      if (!slots.ht || Math.abs(dx) < Math.abs(slots.ht._alignDiff_h_top)) slots.ht = t1;
    } else if (Math.abs(dx2) < P) {
      t1._alignType_h_bottom_top = true;
      t1._alignDiff_h_bottom_top = dx2;
      if (!slots.ht || Math.abs(dx2) < Math.abs(slots.ht._alignDiff_h_bottom_top)) slots.ht = t1;
    }
  };
  matchHC = (t1, t2, slots) => {
    t1._alignType_h_center = null;
    t1._alignDiff_h_center = null;
    let dx = t1.y + t1.height / 2 - (t2.y + t2.height / 2);
    if (Math.abs(dx) < P) {
      t1._alignType_h_center = true;
      t1._alignDiff_h_center = dx;
      if (!slots.hc || Math.abs(dx) < Math.abs(slots.hc._alignDiff_h_center)) slots.hc = t1;
    }
  };
  matchHB = (t1, t2, slots) => {
    t1._alignType_h_bottom = null;
    t1._alignDiff_h_bottom = null;
    t1._alignType_h_top_bottom = null;
    t1._alignDiff_h_top_bottom = null;
    let dx = t1.y + t1.height - (t2.y + t2.height),
      dx2 = t1.y - (t2.y + t2.height);
    if (Math.abs(dx) < P) {
      t1._alignType_h_bottom = true;
      t1._alignDiff_h_bottom = dx;
      if (!slots.hb || Math.abs(dx) < Math.abs(slots.hb._alignDiff_h_bottom)) slots.hb = t1;
    } else if (Math.abs(dx2) < P) {
      t1._alignType_h_top_bottom = true;
      t1._alignDiff_h_top_bottom = dx2;
      if (!slots.hb || Math.abs(dx2) < Math.abs(slots.hb._alignDiff_h_top_bottom)) slots.hb = t1;
    }
  };
  checkGuidesDistance = () => {};
  onComponentDragEnd = () => {
    this.htline.hide();
    this.hcline.hide();
    this.hbline.hide();
    this.vlline.hide();
    this.vrline.hide();
    this.vcline.hide();
    this.hideDist();
    let matched = this.matched;
    let cmatched = this.cmatched;
    if (!matched) return;
    if (!cmatched) return;
    let ht = matched.ht,
      hc = matched.hc,
      hb = matched.hb;
    let vl = matched.vl,
      vc = matched.vc,
      vr = matched.vr;
    // 组件间匹配的 diff 在绝对坐标中算出（拖拽帧用 getOffsetRect 计算），
    // properties.transform 是父级相对坐标 —— 嵌套组件（group 子元素）需换算回去；顶层组件 offX/offY 为 0，行为不变
    let t2 = this.target.properties.transform;
    let absT2 = this.target.getOffsetRect();
    let offX = absT2.x - t2.x;
    let offY = absT2.y - t2.y;
    let x, y;
    if (ht) {
      if (ht._alignType_h_top) {
        y = absT2.y + ht._alignDiff_h_top - offY;
      } else if (ht._alignType_h_bottom_top) {
        y = absT2.y + ht._alignDiff_h_bottom_top - offY;
      }
    }
    if (hc) {
      y = absT2.y + hc._alignDiff_h_center - offY;
    }
    if (hb) {
      if (hb._alignType_h_bottom) {
        y = absT2.y + hb._alignDiff_h_bottom - offY;
      } else if (hb._alignType_h_top_bottom) {
        y = absT2.y + hb._alignDiff_h_top_bottom - offY;
      }
    }
    if (vl) {
      if (vl._alignType_v_left) {
        x = absT2.x + vl._alignDiff_v_left - offX;
      } else if (vl._alignType_v_right_left) {
        x = absT2.x + vl._alignDiff_v_right_left - offX;
      }
    }
    if (vc) {
      x = absT2.x + vc._alignDiff_v_center - offX;
    }
    if (vr) {
      if (vr._alignType_v_right) {
        x = absT2.x + vr._alignDiff_v_right - offX;
      } else if (vr._alignType_v_left_right) {
        x = absT2.x + vr._alignDiff_v_left_right - offX;
      }
    }
    if (cmatched[0] !== void 0) {
      // left of parent
      x = t2.x + cmatched[0];
    } else if (cmatched[1] !== void 0) {
      x = t2.x + cmatched[1];
    } else if (cmatched[2] !== void 0) {
      x = t2.x + cmatched[2];
    }
    if (cmatched[3] !== void 0) {
      y = t2.y + cmatched[3];
    } else if (cmatched[4] !== void 0) {
      y = t2.y + cmatched[4];
    } else if (cmatched[5] !== void 0) {
      y = t2.y + cmatched[5];
    }
    let transform = Object.assign({}, t2);
    let align = false;
    if (x !== void 0) {
      transform.x = x;
      align = true;
    }
    if (y !== void 0) {
      align = true;
      transform.y = y;
    }
    //if (ht && hb && ht === hb && ht.rotation === transform.rotation) {
    //    transform.height = hb.height
    //}
    //if (vl && vr && vl === vr && vl.rotation === transform.rotation) {
    //    transform.width = vr.width
    //}
    if (align) {
      let values = {};
      if (this.target.properties.isTemporaryGroup) {
        this.target.getItems().forEach((item) => {
          let x = transform.x + item._xPercent * transform.width;
          let y = transform.y + item._yPercent * transform.height;
          let w = item._wPercent * transform.width;
          let h = item._hPercent * transform.height;
          values[item.id] = { x, y, width: w, height: h, rotation: item.transform.rotation };
        });
      } else {
        values = transform;
      }
      Event.dispatch(component_properties_change, {
        target: this.target,
        key: 'transform',
        value: values,
        from: 'Snapline',
      });
    }
    // 清理全部匹配标志（不只最终匹配项：中间帧匹配过、后被更近组件顶掉的项也会残留，导致下次拖拽错误吸附）
    this.arrayItems.forEach((item) => {
      for (let key in item) {
        if (key.startsWith('_align')) {
          item[key] = null;
        }
      }
    });
    this.matched = [];
    this.cmatched = [];
    Event.dispatch(component_snap_change_end);
  };
  onGuideReady = (guide) => {
    this.guide = guide;
  };

  componentWillUnmount() {
    Event.destroy(controllers_ready, this.onControllersReady);
    Event.destroy(guide_ready, this.onGuideReady);
    Event.destroy(component_active, this.onComponentActive);
    Event.destroy(component_drag, this.onComponentDrag);
    Event.destroy(component_dragend, this.onComponentDragEnd);
    Event.destroy(editor_scroll_change, this.handleScale);
    Event.destroy(component_resize_end, this.onComponentDragEnd);
  }

  /**
   * @override
   */
  setScale(scale) {
    super.setScale(scale);
    this.setLineSize(scale);
  }

  /**
   * @override
   */
  applyToDom = () => {};

  render() {
    return (
      <Fragment>
        <div ref={'g1'} id={'snapline-wrapper-h'}>
          <div className={'snapline snapline-h'} ref={'ht'}></div>
          {/*中心线*/}
          <div className={'snapline snapline-h'} ref={'hc'}></div>
          <div className={'snapline snapline-h'} ref={'hb'}></div>
        </div>
        <div ref={'g2'} className={'snapline-wrapper-v'}>
          <div className={'snapline snapline-v'} ref={'vl'}></div>
          {/*中心线*/}
          <div className={'snapline snapline-v'} ref={'vc'}></div>
          {/**/}
          <div className={'snapline snapline-v'} ref={'vr'}></div>
        </div>
        {/* 间距标注（Figma 风格：连接线 + 距离数字） */}
        <div ref={'hline'} className={'snapline-connect snapline-connect-h'}></div>
        <div ref={'vline'} className={'snapline-connect snapline-connect-v'}></div>
        <div ref={'hlabel'} className={'snapline-label'}></div>
        <div ref={'vlabel'} className={'snapline-label'}></div>
      </Fragment>
    );
  }
}
