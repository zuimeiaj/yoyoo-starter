/**
 *  created by yaojun on 2026/8/4
 *  SVG Path 组件（钢笔工具绘制生成）
 *  双击进入编辑模式：显示锚点 + 贝塞尔手柄控制点，拖动调整曲线。
 *  控制点交互用组件自身原生事件（capture mousedown 拦截 + document 级拖动），不用 Draggable。
 *
 *  注意命名冲突（踩坑）：基类 ViewController.componentDidMount 里
 *    this._drag = new Draggable(container, { onDragMove: this._handleDragMove, ... })
 *  —— this._drag 存 Draggable 实例、this._handleDragMove 是组件拖拽回调，
 *  子类覆写这两个名字会让组件拖拽失效并抛错。故控制点状态用 _cpDrag、方法用 _handleControlPoint*。
 */
import React from 'react';
import ViewController from './ViewController';
import { Dom, buildPathD, arcTopPoint } from '../util/helper';
import { initialCoverageIndex, pointToWorkspaceCoords } from '../global';
import Event from '../Base/Event';
import { setCurrentEditor } from '../global/instance';
import {
  component_edit_mode,
  component_close_edit_mode,
  component_properties_change,
  component_show_resizer,
} from '../util/actions';
import './ViewPath.scss';

export default class ViewPath extends ViewController {
  constructor(props) {
    super(props);
    this._editing = false;
    this._cpDrag = null; // 控制点拖动状态 { index, type, startPoints }
    this._dragPoints = null; // 拖动中的锚点副本（渲染层优先读它）
  }

  initProperties() {
    let dom = Dom.of(this.refs.container);
    // 初始化层级，最后挂载的元素都在最上面（不调 super：path 无容器边框/背景）
    if (this.properties.zIndex === -1) {
      this.properties.zIndex = initialCoverageIndex();
    }
    dom.zIndex(this.properties.zIndex);
    dom.showHide(!this.properties.settings.isHide);
  }

  _getPoints() {
    let path = this.properties.path;
    return (path && path.points) || [];
  }

  _buildD(points) {
    let path = this.properties.path || {};
    return buildPathD(points || this._dragPoints || this._getPoints(), path.closed);
  }

  setColor(key, value) {
    if (key == 'border') key = 'stroke';
    else if (key == 'bg') key = 'fill';
    Dom.of(this.refs.line).css(key, value);
  }

  setTransform(x, y, w, h, r) {
    let t = this.properties.transform;
    let oldW = t.width;
    let oldH = t.height;
    super.setTransform(x, y, w, h, r);
    // 缩放时按比例缩放全部锚点与手柄（resize 专用钩子，ViewResizable 调用）
    if ((w !== oldW || h !== oldH) && oldW && oldH) {
      let sx = w / oldW;
      let sy = h / oldH;
      this._getPoints().forEach((p) => {
        p.x *= sx;
        p.y *= sy;
        p.inX *= sx;
        p.inY *= sy;
        p.outX *= sx;
        p.outY *= sy;
        if (p.arc) p.arc *= sy; // 拱高随垂直缩放（近似）
      });
    }
    if (this.refs.line) this.refs.line.setAttribute('d', this._buildD());
  }

  componentDidMount() {
    super.componentDidMount();
    this.refs.container.tabIndex = -1;
    this.refs.container.addEventListener('mousedown', this._handleContainerMouseDown, true);
    this.refs.container.addEventListener('keydown', this._handleContainerKeyDown, false);
  }

  componentWillUnmount() {
    if (this._cpDrag) this._removeControlPointListeners();
    this.refs.container.removeEventListener('mousedown', this._handleContainerMouseDown, true);
    this.refs.container.removeEventListener('keydown', this._handleContainerKeyDown, false);
    if (this._editing) setCurrentEditor(null);
    super.componentWillUnmount();
  }

  // ==================== 编辑模式 ====================

  onDBClick(e) {
    if (this._parent && this._parent.isLockChildren) {
      super.onDBClick(e);
      return;
    }
    e.stopPropagation();
    setCurrentEditor(this);
    this._editing = true;
    let container = this.refs.container;
    container.setAttribute('data-event', 'ignore');
    container.focus();
    Event.dispatch(component_edit_mode);
    this.forceUpdate();
  }

  setEditorBlur() {
    // 幂等：component_inactive 与显式退出（Enter/Esc）双路径都会调
    if (!this._editing) return;
    this._editing = false;
    this._cancelControlPointDrag();
    let container = this.refs.container;
    if (container) container.removeAttribute('data-event');
    Event.dispatch(component_close_edit_mode);
    this.forceUpdate();
  }

  _handleContainerMouseDown = (e) => {
    if (!this._editing) return; // 非编辑态放行，交给 Draggable 选中/拖拽
    e.stopPropagation();
    if (e.button !== 0) return; // 右键放行 contextmenu
    e.preventDefault();
    let el = e.target.closest('[data-path-handle]');
    if (!el) return; // 点路径本体/空白：保持编辑态
    let index = +el.dataset.index;
    let type = el.dataset.pathHandle;
    if (type === 'line') return; // 手柄连线不拦截（理论上 pointer-events:none 不会命中）
    let points = this._getPoints();
    // Alt+拖贝塞尔手柄 → 该段转为圆弧段（弧控制点拖动）
    // 注意段方向：in 手柄属于"上一段"（i-1→i，即 points[i].arc）；out 手柄属于"下一段"（i→i+1，即 points[i+1].arc）
    if (e.altKey && (type === 'out' || type === 'in')) {
      if (type === 'out') {
        if (index + 1 >= points.length) return; // 最后锚点无下一段
        index = index + 1;
      } else if (index === 0) {
        return; // 第一锚点无上一段
      }
      type = 'arc';
    }
    let startPoints = points.map((p) => ({ ...p }));
    this._cpDrag = { index, type, startPoints };
    this._dragPoints = startPoints;
    document.addEventListener('mousemove', this._handleControlPointMove);
    document.addEventListener('mouseup', this._handleControlPointUp);
    this.forceUpdate();
  };

  _handleControlPointMove = (e) => {
    let drag = this._cpDrag;
    if (!drag) return;
    let { x: wx, y: wy } = pointToWorkspaceCoords(e);
    // getOffsetRect 累加父级偏移与旋转：嵌套在 group/block 内时局部坐标 = 工作区逆旋转
    let off = this.getOffsetRect();
    let a = (off.rotation / 180) * Math.PI;
    let cos = Math.cos(a);
    let sin = Math.sin(a);
    let rx = wx - (off.x + off.width / 2);
    let ry = wy - (off.y + off.height / 2);
    let lx = off.width / 2 + cos * rx - sin * ry;
    let ly = off.height / 2 + sin * rx + cos * ry;
    let pt = drag.startPoints[drag.index];
    if (drag.type === 'anchor') {
      pt.x = lx;
      pt.y = ly;
    } else if (drag.type === 'out') {
      pt.outX = lx - pt.x;
      pt.outY = ly - pt.y;
      pt.inX = -pt.outX; // 对称镜像，平滑角
      pt.inY = -pt.outY;
    } else if (drag.type === 'in') {
      pt.inX = lx - pt.x;
      pt.inY = ly - pt.y;
      pt.outX = -pt.inX;
      pt.outY = -pt.inY;
    } else if (drag.type === 'arc') {
      // 弧控制点：拱高 = 鼠标到弦的带符号垂直距离（与 buildArcSegment 同一几何）
      let prev = drag.startPoints[drag.index - 1] || { x: 0, y: 0 };
      let dx = pt.x - prev.x;
      let dy = pt.y - prev.y;
      let d = Math.hypot(dx, dy);
      if (d) {
        let nx = -dy / d;
        let ny = dx / d;
        let midX = (prev.x + pt.x) / 2;
        let midY = (prev.y + pt.y) / 2;
        pt.arc = (lx - midX) * nx + (ly - midY) * ny;
      }
    }
    if (this.refs.line) this.refs.line.setAttribute('d', this._buildD());
    this.forceUpdate();
  };

  _handleControlPointUp = () => {
    let drag = this._cpDrag;
    if (!drag) return;
    this._removeControlPointListeners();
    // 与提交前锚点比对，无位移不提交
    let points = this._getPoints();
    let moved = drag.startPoints.some((p, i) => {
      let q = points[i];
      return p.x !== q.x || p.y !== q.y || p.inX !== q.inX || p.inY !== q.inY || p.outX !== q.outX || p.outY !== q.outY || p.arc !== q.arc;
    });
    this._cpDrag = null;
    this._dragPoints = null;
    if (!moved) return;
    let path = this.properties.path || {};
    Event.dispatch(component_properties_change, {
      target: this,
      key: ['path'],
      value: [{ points: drag.startPoints.map((p) => ({ ...p })), closed: !!path.closed }],
    });
    // 刷新 resize 手柄包围框（数组 key 不触发 pushState 的 transform 分支）
    Event.dispatch(component_show_resizer, this);
  };

  _cancelControlPointDrag() {
    if (!this._cpDrag) return;
    this._removeControlPointListeners();
    this._cpDrag = null;
    this._dragPoints = null;
    // properties 从未被修改，直接重置 d 即可
    if (this.refs.line) this.refs.line.setAttribute('d', this._buildD());
  }

  _removeControlPointListeners() {
    document.removeEventListener('mousemove', this._handleControlPointMove);
    document.removeEventListener('mouseup', this._handleControlPointUp);
  }

  _handleContainerKeyDown = (e) => {
    if (!this._editing) return;
    if (e.key === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      this.setEditorBlur();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      if (this._cpDrag) {
        this._cancelControlPointDrag();
      } else {
        this.setEditorBlur();
      }
    }
  };

  // ==================== 渲染 ====================

  renderContent() {
    let { width, height } = this.properties.transform;
    let { border, bg } = this.properties;
    let sw = border.width === 'none' ? 0 : border.width || 0;
    let strokeDash = {};
    if (border.style == 'dashed') {
      strokeDash.strokeDasharray = sw * 3;
      strokeDash.strokeDashoffset = 3;
    } else if (border.style == 'dotted') {
      strokeDash.strokeDasharray = sw;
      strokeDash.strokeDashoffset = sw;
    }
    let points = this._dragPoints || this._getPoints();
    let d = this._buildD(points);
    return (
      <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} xmlns={'http://www.w3.org/2000/svg'} data-uid={this.properties.id} className={'view-path'}>
        <path ref={'line'} d={d} {...strokeDash} strokeWidth={sw} style={{ stroke: border.color, fill: bg }} />
        {this._editing ? (
          <g className={'view-path-edit'}>
            {points.map((p, i) => {
              // 弧段锚点：无贝塞尔手柄，改在拱顶渲染弧控制点
              if (p.arc && i > 0) {
                let top = arcTopPoint(points[i - 1], p, p.arc);
                return (
                  <g key={i}>
                    <circle data-path-handle={'anchor'} data-index={i} className={'vp-anchor'} r={5} cx={p.x} cy={p.y} />
                    <circle data-path-handle={'arc'} data-index={i} className={'vp-arc'} r={5} cx={top.x} cy={top.y} />
                  </g>
                );
              }
              return (
                <g key={i}>
                  <circle data-path-handle={'anchor'} data-index={i} className={'vp-anchor'} r={5} cx={p.x} cy={p.y} />
                  <line data-path-handle={'line'} data-index={i} className={'vp-handle-line'} x1={p.x} y1={p.y} x2={p.x + p.outX} y2={p.y + p.outY} pointerEvents={'none'} />
                  <circle data-path-handle={'out'} data-index={i} className={'vp-handle'} r={4} cx={p.x + p.outX} cy={p.y + p.outY} />
                  <line data-path-handle={'line'} data-index={i} className={'vp-handle-line'} x1={p.x} y1={p.y} x2={p.x + p.inX} y2={p.y + p.inY} pointerEvents={'none'} />
                  <circle data-path-handle={'in'} data-index={i} className={'vp-handle'} r={4} cx={p.x + p.inX} cy={p.y + p.inY} />
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>
    );
  }
}
