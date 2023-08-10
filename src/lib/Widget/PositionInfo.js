/**
 *  created by yaojun on 2019/2/22
 *
 */
import React from 'react';
import Event from '../Base/Event';
import { component_drag, component_dragend, component_resize_end } from '../util/actions';
import { Dom } from '../util/helper';

export default class PositionInfo extends React.Component {
  show = false;

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
    this.show = false;
  };
  handleDrag = (target, options = {}) => {
    let { x, y, width, height, rotation } = target.properties.transform;
    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);
    rotation = Math.round(rotation);
    let mx = window._mouse;
    if (options.from === 'Draggable') {
      this.dom.text(`${x} : ${y}`);
    } else if (options.from === 'Rotatable') {
      this.dom.text(`${rotation}°`);
    } else if (options.from === 'Resizable') {
      this.dom.text(`${width} x ${height}`);
    } else return;
    this.dom.left(mx.mouseX).top(mx.mouseY + 15);
    if (this.show === false) {
      this.dom.show();
      this.show = true;
    }
  };

  componentWillUnmount() {
    Event.destroy(component_drag, this.handleDrag);
    Event.destroy(component_dragend, this.handleDragEnd);
    Event.destroy(component_resize_end, this.handleDragEnd);
  }

  render() {
    return (
      <div
        style={{
          display: 'none',
          position: 'fixed',
          background: '#fff',
          border: '1px solid #ececec',
          padding: '5px 10px',
          fontSize: 12,
        }}
        ref={'g'}
      ></div>
    );
  }
}
