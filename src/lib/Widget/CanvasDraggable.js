/**
 *  created by yaojun on 2019/1/27
 *
 */

import React from 'react';
import Draggable from '../Draggable';
import './CanvasDraggable.scss';
import { setCanvasDraggable } from '../global';
import Event from '../Base/Event';
import { canvas_dragend, canvas_draggable, canvas_dragging, canvas_dragstart } from '../util/actions';
import { Dom } from '../util/helper';

export default class CanvasDraggable extends React.Component {
  handleCanvasDraggable = (isDragging) => {
    setCanvasDraggable(true);
    Dom.of(this.refs.g).show();
  };

  handleCanvasEnd = () => {
    Dom.of(this.refs.g).hide();
    setCanvasDraggable(false);
  };

  componentDidMount() {
    Event.listen(canvas_draggable, this.handleCanvasDraggable);
    Event.listen(canvas_dragend, this.handleCanvasEnd);
    new Draggable(this.refs.g, {
      onDragStart: () => {
        Event.dispatch(canvas_dragstart);
      },
      onDragMove: ({ realDeltaX, realDeltaY }) => {
        Event.dispatch(canvas_dragging, { dragging: true, realDeltaX: -realDeltaX, realDeltaY: -realDeltaY });
      },
    });
  }

  componentWillUnmount() {
    Event.destroy(canvas_draggable, this.handleCanvasDraggable);
    Event.destroy(canvas_dragend, this.handleCanvasEnd);
  }

  render() {
    return <div className={'global-canvas-draggable'} ref={'g'}></div>;
  }
}
