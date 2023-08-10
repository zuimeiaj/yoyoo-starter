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

  _getPath = (left) => {
    const { width, height } = this.properties.transform;
    const y = 2;
    return `M12 ${y} L${width - 12} ${y} Q${width - 2} ${y} ${width - 2} 10 L${width - 2} ${height - 20} Q${width - 2} ${height - 10} ${width - 12} ${height - 10} L${left + 20} ${height -
      10} L${left + 10} ${height} L${left} ${height - 10} L10 ${height - 10} Q2 ${height - 10} 2 ${height - 20}  L2 12 Q2 2 12 2`;
  };

  setColor(key, value) {
    if (key == 'border') key = 'stroke';
    if (key == 'bg') key = 'fill';
    Dom.of(this.refs.line).css(key, value);
  }

  setTransform(x, y, w, h, r) {
    super.setTransform(x, y, w, h, r);
    let path = this._getPath(this.properties.bubble.left);
    this.refs.line.setAttribute('d', path);
    this.refs.slider.setAttribute('cy', this.properties.transform.height - 10);
  }

  componentDidMount() {
    super.componentDidMount();
    let slider = this.refs.slider;
    let defaultPos = this.properties.bubble.left + 10;
    this._pos = this.properties.bubble.left;

    new Draggable(this.refs.slider, {
      onDragMove: ({ deltaX, deltaY }) => {
        slider.setAttribute('cx', (defaultPos += deltaX));
        let path = this._getPath((this._pos += deltaX));
        this.refs.line.setAttribute('d', path);
      },
      onDragEnd: () => {
        Event.dispatch(component_properties_change, {
          target: this,
          key: 'bubble',
          value: Object.assign({}, this.properties.bubble, { left: this._pos }),
        });
      },
    });
  }

  renderContent() {
    let { width, height } = this.properties.transform;
    let {
      border: { width: sw, color, style },
      bg,
      bubble: { left },
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
        <path ref={'line'} d={this._getPath(left)} {...strokeDash} style={{ stroke: color, fill: bg }} strokeWidth={sw} />
        <circle ref={'slider'} className={'component-control-dot'} r={4} cx={30} cy={height - 10} />
      </svg>
    );
  }
}
