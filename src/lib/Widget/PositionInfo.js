/**
 *  created by yaojun on 2019/2/22
 *
 */
import React from 'react';
import Event from '../Base/Event';
import { component_drag, component_dragend, component_resize_end } from '../util/actions';
import { Dom, getClientBoundingRect } from '../util/helper';
import NoZoomTransform from '../Base/NoZoomTransform';
import './position-info.scss';
import { getPoints } from '../util/Matrix';

export default class PositionInfo extends NoZoomTransform {
  componentWillMount() {
    Event.listen(component_drag, this.handleDrag);
    Event.listen(component_dragend, this.handleDragEnd);
    Event.listen(component_resize_end, this.handleDragEnd);
  }

  componentDidMount() {
    this.dom = Dom.of(this.refs.g);
  }

  handleDragEnd = () => {
    this.dom.hide();
  };
  handleDrag = (target, options = {}) => {
    this.target = target;
    this.options = options;
    this.setBoundingRect();
  };
  applyToDom() {
    this.dom.show();
    let { x, y, width, height, rotation } = this;
    let options = this.options;
    if (options.from === 'Draggable') {
      this.dom.text(`x=${x} , y=${y}`);
    } else if (options.from === 'Rotatable') {
      this.dom.text(`${rotation}°`);
    } else if (options.from === 'Resizable') {
      this.dom.text(`w=${width} , h=${height}`);
    }
    const points = getPoints(this);

    this.dom.left(points[1].x + 10).top(points[1].y - 30);
  }

  componentWillUnmount() {
    Event.destroy(component_drag, this.handleDrag);
    Event.destroy(component_dragend, this.handleDragEnd);
    Event.destroy(component_resize_end, this.handleDragEnd);
  }

  render() {
    return <div className='component-position-info' ref={'g'}></div>;
  }
}
