/**
 *  created by yaojun on 2019/2/21
 *  直线（draw.io 风格）：无 resize/rotate 手柄，选中时显示两端编辑圆点，
 *  拖动端点同时改变长度和角度（固定另一端，端点绕固定端伸缩旋转）。
 *  端点 mousedown 用原生 capture（同锚点/ViewPath 控制点模式）：Draggable 容器冒泡拦截，
 *  合成事件收不到；拖动中直改 DOM（setTransform + 端点圆点 cx），松手走 component_properties_change 落库
 */

import React from 'react';
import ViewController from './ViewController';
import { Dom } from '../util/helper';
import { initialCoverageIndex, pointToWorkspaceCoords } from '../global';
import Event from '../Base/Event';
import { component_active, component_drag, component_dragend, component_inactive, component_properties_change } from '../util/actions';
import { getFirstResponder } from '../global/instance';

export default class ViewLine extends ViewController {
  // 选中态变化强制重渲染：端点编辑圆点的显示跟随 firstResponder（active 显示 / inactive 隐藏）。
  // 必须调 super：基类 componentWillMount 初始化 this.properties（覆写不调会崩在 componentDidMount）
  componentWillMount() {
    super.componentWillMount();
    Event.listen(component_active, this.handleSelectChange);
    Event.listen(component_inactive, this.handleSelectChange);
    Event.listen(component_drag, this.handleComponentDrag);
    Event.listen(component_dragend, this.handleComponentDragEnd);
  }

  handleSelectChange = () => this.forceUpdate();

  // 组件拖拽移动中隐藏端点圆点（松手恢复）；端点自身的拖动（_endDrag）不派发 component_drag，不受影响
  handleComponentDrag = (target, options = {}) => {
    if (options.from === 'Draggable' && !this._dragging) {
      this._dragging = true;
      this.forceUpdate();
    }
  };

  handleComponentDragEnd = () => {
    if (this._dragging) {
      this._dragging = false;
      this.forceUpdate();
    }
  };

  initProperties() {
    let { width } = this.properties.transform;
    let g = Dom.of(this.refs.g);
    let dom = Dom.of(this.refs.container);
    g.background(this.properties.bg);
    dom.width(width);

    //  初始化层级，最后挂载的元素都在最上面
    if (this.properties.zIndex === -1) {
      this.properties.zIndex = initialCoverageIndex();
    }
    dom.zIndex(this.properties.zIndex);
    dom.showHide(!this.properties.settings.isHide);
  }

  setTransform(x, y, w, h, r) {
    super.setTransform(x, y, w, h, r);
    this.refs.g.setAttribute('d', `M0 3 L${w} 3`);
  }

  setColor(key, value) {
    Dom.of(this.refs.g).attr('stroke', value);
  }

  /** 两端世界坐标（容器 rotate 中心 = 50% 50% → (x+w/2, y+h/2)） */
  _endpoints() {
    let { x, y, width, height, rotation } = this.properties.transform;
    let rad = (rotation * Math.PI) / 180;
    let dx = (Math.cos(rad) * width) / 2;
    let dy = (Math.sin(rad) * width) / 2;
    let cx = x + width / 2;
    let cy = y + height / 2;
    return {
      a: { x: cx - dx, y: cy - dy },
      b: { x: cx + dx, y: cy + dy },
    };
  }

  // 端点 DOM 引用（原生 capture 监听挂载点 + 拖动中直改位置）
  _endDoms = {};
  _endEls = {};

  _setEndDom = (key, el) => {
    this._endEls[key] = el;
    if (this._endDoms[key] === el) return;
    if (this._endDoms[key]) this._endDoms[key].removeEventListener('mousedown', this._handleEndMouseDown, true);
    this._endDoms[key] = el;
    if (el) el.addEventListener('mousedown', this._handleEndMouseDown, true);
  };

  _handleEndMouseDown = (e) => {
    // capture 拦截：阻止组件拖拽（Draggable 容器冒泡）/画布框选
    e.stopPropagation();
    e.preventDefault();
    let end = e.currentTarget.dataset.lineEnd;
    if (!end) return;
    this._endDrag = { end, ...this._endpoints() };
    document.addEventListener('mousemove', this._handleEndMove);
    document.addEventListener('mouseup', this._handleEndUp);
  };

  _handleEndMove = (e) => {
    let drag = this._endDrag;
    if (!drag) return;
    let { x: wx, y: wy } = pointToWorkspaceCoords(e);
    let { height } = this.properties.transform;
    // 固定另一端，被拖端点绕固定端伸缩旋转（长度 + 角度一次成型）
    let fixed = drag.end === 'b' ? drag.a : drag.b;
    let vx = wx - fixed.x,
      vy = wy - fixed.y;
    let len = Math.max(Math.hypot(vx, vy), 1);
    let rot = (Math.atan2(vy, vx) * 180) / Math.PI;
    let cx = (fixed.x + wx) / 2,
      cy = (fixed.y + wy) / 2;
    this.setTransform(cx - len / 2, cy - height / 2, len, height, rot);
    // 拖动中 React 不重渲染：直改端点圆点位置（终点 cx 随长度变）
    if (this._endEls.b) this._endEls.b.setAttribute('cx', len);
  };

  _handleEndUp = () => {
    document.removeEventListener('mousemove', this._handleEndMove);
    document.removeEventListener('mouseup', this._handleEndUp);
    if (!this._endDrag) return;
    this._endDrag = null;
    // 标准属性变更链路：落库 + 撤销 + PATHES 重建
    let t = this.properties.transform;
    Event.dispatch(component_properties_change, {
      target: this,
      key: 'transform',
      value: { x: t.x, y: t.y, width: t.width, height: t.height, rotation: t.rotation },
    });
  };

  componentWillUnmount() {
    Event.destroy(component_active, this.handleSelectChange);
    Event.destroy(component_inactive, this.handleSelectChange);
    Event.destroy(component_drag, this.handleComponentDrag);
    Event.destroy(component_dragend, this.handleComponentDragEnd);
    if (this._endDrag) {
      document.removeEventListener('mousemove', this._handleEndMove);
      document.removeEventListener('mouseup', this._handleEndUp);
    }
    for (let k in this._endDoms) {
      let el = this._endDoms[k];
      if (el) el.removeEventListener('mousedown', this._handleEndMouseDown, true);
    }
    super.componentWillUnmount();
  }

  render() {
    // 防御：forceUpdate 可能在 properties 尚未挂载时触发（选中事件先于 props 传入）
    let t = this.properties && this.properties.transform;
    if (!t) return null;
    let { x, y, rotation, width, height } = t;
    let {
      border: { color, style },
    } = this.properties;
    let strokeDash = {};
    if (style == 'dashed') {
      strokeDash.strokeDasharray = 3;
      strokeDash.strokeDashoffset = 3;
    } else if (style == 'dotted') {
      strokeDash.strokeDasharray = 1;
      strokeDash.strokeDashoffset = 1;
    }
    // 选中时显示两端编辑圆点（拖动改变长度/角度，替代 resize/rotate 手柄）；组件拖拽移动中隐藏
    let first = getFirstResponder();
    let selected = !!(first && first.properties && first.properties.id === this.properties.id) && !this._dragging;
    return (
      <div
        data-uid={this.properties.id}
        style={{
          width,
          height,
          left: x,
          top: y,
          transform: `rotate(${rotation}deg)`,
        }}
        className={'view-line'}
        ref={'container'}
      >
        <svg style={{ height: 6, top: -2, position: 'absolute', width: '100%', overflow: 'visible' }}>
          <path {...strokeDash} stroke={color} strokeWidth={1} y={2} d={`M0 3 L${width} 3`} ref={'g'} />
          {selected ? (
            <g>
              <circle ref={(el) => this._setEndDom('a', el)} data-line-end={'a'} cx={0} cy={3} r={5} fill={'#ffffff'} stroke={'#1890ff'} strokeWidth={1.5} style={{ cursor: 'crosshair' }} />
              <circle ref={(el) => this._setEndDom('b', el)} data-line-end={'b'} cx={width} cy={3} r={5} fill={'#ffffff'} stroke={'#1890ff'} strokeWidth={1.5} style={{ cursor: 'crosshair' }} />
            </g>
          ) : null}
        </svg>
      </div>
    );
  }
}
