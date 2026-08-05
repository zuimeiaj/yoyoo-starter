/**
 *  created by yaojun on 2019/2/21
 *
 */

import React from 'react';
import ViewController from './ViewController';
import { Dom } from '../util/helper';
import { initialCoverageIndex, pointToWorkspaceCoords } from '../global';
import Draggable from '../Draggable';
import Event from '../Base/Event';
import { component_properties_change } from '../util/actions';

// 气泡三角控制点：可绕主体一周（四边任意位置）
const BUBBLE_R = 10; // 主体圆角半径（也是三角尖端伸出主体的距离）
const BUBBLE_TS = 10; // 三角半宽（缺口半宽）

/**
 * Bubble
 */
export default class ViewPolygon extends ViewController {
  initProperties() {
    let dom = Dom.of(this.refs.container);

    //  初始化层级，最后挂载的元素都在最上面
    if (this.properties.zIndex === -1) {
      this.properties.zIndex = initialCoverageIndex();
    }
    dom.zIndex(this.properties.zIndex);
    dom.showHide(!this.properties.settings.isHide);
  }

  /**
   * 三角位置（沿内矩形周线 [r,r]→[w-r,h-r] 的像素弧长，0 = 顶边左端，顺时针）
   * 兼容旧数据：bubble.left 是旧版底部三角中心 x
   * 新组件（无 pos 无 left）：按当前实际尺寸兜底为底部中间
   */
  _getPos = () => {
    let b = this.properties.bubble;
    if (b.pos !== undefined && b.pos !== null) return b.pos;
    let { width: w, height: h } = this.properties.transform;
    let Pw = w - 2 * BUBBLE_R,
      Ph = h - 2 * BUBBLE_R;
    if (b.left !== undefined && b.left !== null) {
      // 旧底部三角中心 (left+10, h)，映射到 bottom 段
      return Pw + Ph + (w - BUBBLE_R - (b.left + BUBBLE_TS));
    }
    // 新组件默认底部中间（bottom 段中点）
    return Pw + Ph + Pw / 2;
  };

  /**
   * pos → 所在边 + 内矩形周线上的锚点（三角缺口中心，缺口在内矩形边线上）
   * @return {{edge:'top'|'right'|'bottom'|'left', ix:number, iy:number}}
   */
  _getTipAndEdge = (pos) => {
    let { width: w, height: h } = this.properties.transform;
    let r = BUBBLE_R;
    let Pw = w - 2 * r,
      Ph = h - 2 * r;
    let P = 2 * Pw + 2 * Ph;
    let p = ((pos % P) + P) % P; // 归一化到 [0, P)
    let edge, ix, iy;
    if (p < Pw) {
      edge = 'top';
      ix = r + p;
      iy = r;
    } else if (p < Pw + Ph) {
      edge = 'right';
      ix = w - r;
      iy = r + (p - Pw);
    } else if (p < 2 * Pw + Ph) {
      edge = 'bottom';
      ix = w - r - (p - Pw - Ph);
      iy = h - r;
    } else {
      edge = 'left';
      ix = r;
      iy = h - r - (p - 2 * Pw - Ph);
    }
    return { edge, ix, iy };
  };

  /**
   * 圆角矩形主体 + 四边任意位置的三角缺口（顺时针，左上圆角 (r,0) 起）
   */
  _getPath = (pos) => {
    let { width: w, height: h } = this.properties.transform;
    let r = BUBBLE_R,
      ts = BUBBLE_TS;
    let { edge, ix, iy } = this._getTipAndEdge(pos);
    let d = `M ${r} 0`;
    if (edge === 'top') d += ` L ${ix - ts} 0 L ${ix} ${-r} L ${ix + ts} 0`;
    d += ` L ${w - r} 0 Q ${w} 0 ${w} ${r}`;
    if (edge === 'right') d += ` L ${w} ${iy - ts} L ${w + r} ${iy} L ${w} ${iy + ts}`;
    d += ` L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h}`;
    if (edge === 'bottom') d += ` L ${ix + ts} ${h} L ${ix} ${h + r} L ${ix - ts} ${h}`;
    d += ` L ${r} ${h} Q ${0} ${h} ${0} ${h - r}`;
    if (edge === 'left') d += ` L ${0} ${iy + ts} L ${-r} ${iy} L ${0} ${iy - ts}`;
    d += ` L ${0} ${r} Q ${0} ${0} ${r} 0 Z`;
    return d;
  };

  /**
   * 三角尖端（slider 控制点位置：主体外缘再伸出 r）
   */
  _getTip = (pos) => {
    let { width: w, height: h } = this.properties.transform;
    let { edge, ix, iy } = this._getTipAndEdge(pos);
    if (edge === 'top') return { x: ix, y: -BUBBLE_R };
    if (edge === 'right') return { x: w + BUBBLE_R, y: iy };
    if (edge === 'bottom') return { x: ix, y: h + BUBBLE_R };
    return { x: -BUBBLE_R, y: iy };
  };

  /**
   * 本地坐标 → 周线 pos：取到内矩形四边（边线）的最近投影，三角跟随鼠标贴边滑动
   */
  _posFromLocal = (lx, ly) => {
    let { width: w, height: h } = this.properties.transform;
    let r = BUBBLE_R;
    let Pw = w - 2 * r,
      Ph = h - 2 * r;
    let cands = [
      { d: Math.abs(ly - r), pos: Math.min(Math.max(lx - r, 0), Pw) }, // top
      { d: Math.abs(lx - (w - r)), pos: Pw + Math.min(Math.max(ly - r, 0), Ph) }, // right
      { d: Math.abs(ly - (h - r)), pos: Pw + Ph + Math.min(Math.max(w - r - lx, 0), Pw) }, // bottom
      { d: Math.abs(lx - r), pos: 2 * Pw + Ph + Math.min(Math.max(h - r - ly, 0), Ph) }, // left
    ];
    cands.sort((a, b) => a.d - b.d);
    return cands[0].pos;
  };

  // 同步 path + slider 位置到 DOM；拖拽中传当前 pos（props 未更新），其他场景读 props
  _applyPath = (pos) => {
    let p = pos !== undefined ? pos : this._getPos();
    this.refs.line.setAttribute('d', this._getPath(p));
    let tip = this._getTip(p);
    this.refs.slider.setAttribute('cx', tip.x);
    this.refs.slider.setAttribute('cy', tip.y);
  };

  setColor(key, value) {
    if (key == 'border') key = 'stroke';
    if (key == 'bg') key = 'fill';
    Dom.of(this.refs.line).css(key, value);
  }

  setTransform(x, y, w, h, r) {
    // resize 前先记旧周长：像素弧长随尺寸漂移（如 300×100 底边 pos=500，拉宽到 600 后会落到 top 段），
    // 按周长比例重映射让三角相对位置大致保持
    let t = this.properties.transform;
    let oldP = 2 * (t.width - 2 * BUBBLE_R) + 2 * (t.height - 2 * BUBBLE_R);
    super.setTransform(x, y, w, h, r);
    let b = this.properties.bubble;
    if (b.pos !== undefined && b.pos !== null && oldP > 0) {
      let nt = this.properties.transform;
      let newP = 2 * (nt.width - 2 * BUBBLE_R) + 2 * (nt.height - 2 * BUBBLE_R);
      if (newP !== oldP) {
        b.pos = (b.pos * newP) / oldP;
      }
    }
    this._applyPath();
  }

  componentDidMount() {
    super.componentDidMount();

    new Draggable(this.refs.slider, {
      onDragMove: (data, e) => {
        // 鼠标 → 工作区 → 组件本地坐标 → 映射到周线（三角可绕主体一圈）
        let { x, y } = pointToWorkspaceCoords(e);
        let rect = this.getOffsetRect();
        this._pos = this._posFromLocal(x - rect.x, y - rect.y);
        this._applyPath(this._pos);
      },
      onDragEnd: () => {
        Event.dispatch(component_properties_change, {
          target: this,
          key: 'bubble',
          value: Object.assign({}, this.properties.bubble, { pos: this._pos }),
        });
      },
    });
  }

  renderContent() {
    let {
      border: { width: sw, color, style },
      bg,
    } = this.properties;
    let pos = this._getPos();
    let tip = this._getTip(pos);
    let strokeDash = {};
    if (style == 'dashed') {
      strokeDash.strokeDasharray = sw * 3;
      strokeDash.strokeDashoffset = 3;
    } else if (style == 'dotted') {
      strokeDash.strokeDasharray = sw;
      strokeDash.strokeDashoffset = sw;
    }
    // overflow visible：三角尖端与 slider 控制点探出主体外缘 r，SVG 默认 hidden 会裁剪
    return (
      <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} xmlns={'http://www.w3.org/2000/svg'} data-uid={this.properties.id} className={'view-bubble'}>
        <path ref={'line'} d={this._getPath(pos)} {...strokeDash} style={{ stroke: color, fill: bg }} strokeWidth={sw} />
        <circle ref={'slider'} className={'component-control-dot'} r={4} cx={tip.x} cy={tip.y} />
      </svg>
    );
  }
}
