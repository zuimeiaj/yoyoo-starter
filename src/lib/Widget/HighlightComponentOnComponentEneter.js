/**
 *  created by yaojun on 2018/12/6
 *
 */

import React, { Fragment } from 'react';
import Event from '../Base/Event';
import { component_active, component_drag, component_dragend, component_enter, component_inactive, component_leave, editor_scroll_change } from '../util/actions';
import './HighlightComponentOnComponentEneter.scss';
import NoZoomTransform from '../Base/NoZoomTransform';
import { Dom } from '../util/helper';

export default class HighlightComponentOnComponentEneter extends NoZoomTransform {
  componentWillMount() {
    this.dragging = false;
    this.target = null;
    this.activeTarget = null;

    Event.listen(component_enter, this._handleEnter);
    Event.listen(component_leave, this._handleLeave);
    Event.listen(component_active, this._handleDrag);
    Event.listen(component_inactive, this._handleInactive);
    Event.listen(component_drag, this._handleDrag);
    Event.listen(component_dragend, this._handleEnd);
  }

  _handleDrag = (target, options = {}) => {
    this.activeTarget = target;
    if (options.from == 'OutlineCoverage') return;
    this.dragging = true;
    this._show(false);
  };

  _handleInactive = () => {
    this.activeTarget = null;
    this.dragging = false;
    this._show(false);
  };

  _handleEnd = () => {
    this.dragging = false;
  };

  _show = (v) => {
    this.g.style.display = v ? 'block' : 'none';
  };

  _handleEnter = (target) => {
    this.target = target;
    if (this.dragging || this.activeTarget == target || !target.properties.settings.hover) return this._show(false);

    this.setBoundingRect();
    this._show(true);
  };

  _handleLeave = () => {
    this._show(false);
  };

  componentWillUnmount() {
    Event.destroy(component_enter, this._handleEnter);
    Event.destroy(component_leave, this._handleLeave);
    Event.destroy(component_drag, this._handleDrag);
    Event.destroy(component_dragend, this._handleEnd);
    Event.destroy(component_active, this._handleDrag);
    Event.destroy(component_inactive, this._handleInactive);
    Event.destroy(editor_scroll_change, super.handleScale);
  }

  componentDidMount() {
    this.g = this.refs.container;
  }

  applyToDom() {
    let { x, y, width, height, rotation } = this;
    const { t, r, b, l, container } = this.refs;
    Dom.of(t)
      .left(x)
      .top(y)
      .width(width);
    Dom.of(l)
      .left(x)
      .top(y)
      .height(height);
    Dom.of(r)
      .left(x + width)
      .top(y)
      .height(height + 1);
    Dom.of(b)
      .left(x)
      .width(width)
      .top(y + height);
    container.style.transform = `rotate(${rotation}deg)`;
    container.style.transformOrigin = `${x + width / 2}px ${y + height / 2}px`;
  }

  render() {
    return (
      <Fragment>
        <div ref={'container'}>
          <div ref={'t'} className={'highlight-border highlight-top'}></div>
          <div ref={'r'} className={'highlight-border highlight-right'}></div>
          <div ref={'l'} className={'highlight-border highlight-left'}></div>
          <div ref={'b'} className={'highlight-border highlight-bottom'}></div>
        </div>
      </Fragment>
    );
  }
}
