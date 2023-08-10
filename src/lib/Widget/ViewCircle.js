/**
 *  created by yaojun on 2019/2/21
 *
 */

import React from 'react';
import ViewController from './ViewController';
import { Dom } from '../util/helper';
import { initialCoverageIndex } from '../global';
import Draggable from '../Draggable';
import { component_properties_change, component_stroke_change } from '../util/actions';
import Event from '../Base/Event';

export default class ViewCircle extends ViewController {
  initProperties() {
    let dom = Dom.of(this.refs.container);

    //  初始化层级，最后挂载的元素都在最上面
    if (this.properties.zIndex === -1) {
      this.properties.zIndex = initialCoverageIndex();
    }
    dom.zIndex(this.properties.zIndex);
    dom.showHide(!this.properties.settings.isHide);

    let { array, offset } = this.properties.circle;
    this.dashAngle = Math.round(Math.abs(offset / array) * 360);
  }

  setColor(key, value) {
    Dom.of(this.refs.line).css('stroke', value);
  }

  offsetRatio = 0;

  dashAngle = 0;

  setTransform(x, y, w, h, r) {
    super.setTransform(x, y, w, h, r);
    let { line, center, dash } = this.refs;
    line.setAttribute('cx', w / 2);
    line.setAttribute('r', (w - 2 - this.properties.border.width) / 2);
    line.setAttribute('cy', w / 2);

    let d = (w - this.properties.border.width) * Math.PI;
    this.properties.circle.array = d;
    this.properties.circle.offset = d * this.offsetRatio;
    line.setAttribute('stroke-dasharray', d);
    line.setAttribute('stroke-dashoffset', d * this.offsetRatio);
  }

  _setDasharrayPosition = (angle, radius) => {
    let { x, y } = this._getDasharrayPosition(angle, radius);
    this.refs.dash.setAttribute('cx', x);
    this.refs.dash.setAttribute('cy', y);
  };

  _getDasharrayPosition = (angle, radius) => {
    let { width, height } = this.properties.transform;
    let rad = (-angle / 180) * Math.PI;
    let x = Math.cos(rad) * radius + width / 2;
    let y = -Math.sin(rad) * radius + height / 2;
    return { x, y };
  };

  componentDidMount() {
    super.componentDidMount();
    let { center, dash } = this.refs;
    let {
      border: { width: strokeWidth },
      circle: { array, offset },
    } = this.properties;
    this.offsetRatio = offset / array;
    new Draggable(center, {
      onDragStart: () => {
        strokeWidth = this.properties.border.width;
      },
      onDragMove: ({ deltaX }) => {
        let w = this.properties.transform.width;
        strokeWidth += deltaX;
        if (strokeWidth > w / 2) strokeWidth = w / 2;
        if (strokeWidth < 0) strokeWidth = 0;
        center.setAttribute('cx', strokeWidth + 10);
        let r = (w - strokeWidth) / 2;
        let line = this.refs.line,
          d = 2 * r * Math.PI;
        line.setAttribute('stroke-width', strokeWidth);
        line.setAttribute('r', r);
        line.setAttribute('stroke-dasharray', d);
        line.setAttribute('stroke-dashoffset', d * this.offsetRatio);

        array = d;
        offset = d * this.offsetRatio;
      },
      onDragEnd: () => {
        Event.dispatch(component_properties_change, {
          target: this,
          key: ['circle', 'border'],
          value: [Object.assign({}, this.properties.circle, { offset, array }), Object.assign({}, this.properties.border, { width: strokeWidth })],
        });
        Event.dispatch(component_stroke_change, strokeWidth);
      },
    });

    let cx,
      cy,
      rotation = this.dashAngle,
      currentAngle = 0,
      angle = 0;
    new Draggable(dash, {
      onDragStart: (_, e) => {
        let { width, height } = this.properties.transform;
        let { left, top } = this.refs.container.getBoundingClientRect();
        cx = left + width / 2;
        cy = top + height / 2;
        angle = (Math.atan2(e.pageY - cy, e.pageX - cx) * 180) / Math.PI;
        array = this.properties.circle.array;
      },
      onDragMove: (_, e) => {
        let { width, height } = this.properties.transform;
        let current = (Math.atan2(e.pageY - cy, e.pageX - cx) * 180) / Math.PI;
        currentAngle = current - angle;
        let r = currentAngle + rotation;
        r = r % 360;
        r = r < 0 ? r + 360 : r;
        let radius = (width - strokeWidth * 2) / 2 - 10;
        this._setDasharrayPosition(r, radius);
        offset = array - (r / 360) * array;
        this.offsetRatio = offset / array;
        this.refs.line.setAttribute('stroke-dashoffset', offset);
      },
      onDragEnd: () => {
        rotation += currentAngle;
        this.dashAngle = rotation;
        Event.dispatch(component_properties_change, {
          target: this,
          key: 'circle',
          value: Object.assign({}, this.properties.circle, { offset }),
        });
      },
    });
  }

  renderContent() {
    let {
      circle: { array, offset },
      border: { width: sw, color },
      transform: { width, height },
    } = this.properties;
    let { x, y } = this._getDasharrayPosition(360 - this.dashAngle, (width - sw * 2) / 2 - 10);
    return (
      <svg style={{ width: '100%', height: '100%' }} xmlns={'http://www.w3.org/2000/svg'} data-uid={this.properties.id} className={'view-bubble'}>
        <circle strokeDasharray={array} strokeDashoffset={offset} cx={width / 2} cy={height / 2} r={(width - sw) / 2} ref={'line'} style={{ stroke: color, fill: 'none' }} strokeWidth={sw} />
        <circle ref={'dash'} className={'component-control-dot'} r={4} cx={x} cy={y} />
        <circle ref={'center'} className={'component-control-dot'} r={4} cx={sw + 10} cy={height / 2} />
      </svg>
    );
  }
}
