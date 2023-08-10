/**
 *  created by yaojun on 2019/2/21
 *
 */

import React from 'react';
import ViewController from './ViewController';
import { Dom } from '../util/helper';
import { initialCoverageIndex } from '../global';
import Draggable from '../Draggable';
import Event from '../Base/Event';
import { component_properties_change } from '../util/actions';

export default class ViewCurve extends ViewController {
  initProperties() {
    let dom = Dom.of(this.refs.container);

    //  初始化层级，最后挂载的元素都在最上面
    if (this.properties.zIndex === -1) {
      this.properties.zIndex = initialCoverageIndex();
    }
    dom.zIndex(this.properties.zIndex);
    dom.showHide(!this.properties.settings.isHide);
  }

  _getPath = (x, y) => {
    x = x || this.properties.curve.x;
    y = y || this.properties.curve.y;
    const { width, height } = this.properties.transform;
    return `M0 ${height} Q${x} ${y} ${width} ${height}`;
  };

  setColor(key, value) {
    if (key == 'border') key = 'stroke';
    else if (key == 'bg') key = 'fill';
    Dom.of(this.refs.line).css(key, value);
  }

  setTransform(x, y, w, h, r) {
    super.setTransform(x, y, w, h, r);
    let path = this._getPath();
    this.refs.line.setAttribute('d', path);
  }

  componentDidMount() {
    super.componentDidMount();
    let slider = this.refs.slider;
    let x, y;
    new Draggable(this.refs.slider, {
      onDragStart: () => {
        x = this.properties.curve.x;
        y = this.properties.curve.y;
      },
      onDragMove: ({ deltaX, deltaY }) => {
        x += deltaX;
        y += deltaY;
        let path = this._getPath(x, y);
        this.refs.line.setAttribute('d', path);
      },
      onDragEnd: () => {
        Event.dispatch(component_properties_change, {
          target: this,
          key: 'curve',
          value: Object.assign({}, this.properties.curve, { x, y }),
        });
      },
    });
  }

  renderContent() {
    let { width, height } = this.properties.transform;
    let {
      border: { width: sw, color, style },
      bg,
    } = this.properties;
    let triangleSize = 10;
    let strokeDash = {};
    if (style == 'dashed') {
      strokeDash.strokeDasharray = sw * 3;
      strokeDash.strokeDashoffset = 3;
    } else if (style == 'dotted') {
      strokeDash.strokeDasharray = sw;
      strokeDash.strokeDashoffset = sw;
    }
    return (
      <svg style={{ width: '100%', height: '100%' }} xmlns={'http://www.w3.org/2000/svg'} data-uid={this.properties.id} className={'view-bubble'}>
        <path ref={'line'} d={this._getPath()} {...strokeDash} strokeWidth={sw} style={{ stroke: color, fill: bg }} />
        <circle ref={'slider'} className={'component-control-dot'} r={6} cx={width / 2} cy={height / 2} />
      </svg>
    );
  }
}
