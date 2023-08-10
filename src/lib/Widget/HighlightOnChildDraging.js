/**
 *  created by yaojun on 2019/3/9
 *
 */

import React from 'react';
import NoZoomTransform from '../Base/NoZoomTransform';
import Event from '../Base/Event';
import { component_drag, component_dragend, component_inactive, component_resize_end, editor_scroll_change } from '../util/actions';
import { getFirstResponder, getTemporaryGroup } from '../global/instance';
import { getGroupId } from '../global/selection';
import { Dom } from '../util/helper';

export default class HighlightOnChildDraging extends NoZoomTransform {
  componentDidMount() {
    this.dom = Dom.of(this.refs.container);
    this._transform = {};
    this.target = {
      getOffsetRect: () => {
        return this._transform;
      },
    };
    Event.listen(component_drag, this.handleDrag);
    Event.listen(component_inactive, this.handleInactive);
    Event.listen(component_dragend, this.handleInactive);
    Event.listen(component_resize_end, this.handleInactive);
  }

  componentWillUnmount() {
    Event.destroy(component_drag, this.handleDrag);
    Event.destroy(editor_scroll_change, this.handleScale);
    Event.destroy(component_inactive, this.handleInactive);
    Event.destroy(component_dragend, this.handleInactive);
    Event.destroy(component_resize_end, this.handleInactive);
  }

  handleInactive = () => {
    this.dom.hide();
  };

  handleDrag = () => {
    let view = getFirstResponder();
    if (!view._parent) return this.dom.hide();
    this.dom.show();
    this._transform = view._parent.updateSelfTransform();
    this.setBoundingRect();
  };

  render() {
    return <div style={{ display: 'none' }} className={'highlight-group-dragging'} ref={'container'}></div>;
  }
}
