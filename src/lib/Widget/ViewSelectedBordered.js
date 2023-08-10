/**
 *  created by yaojun on 2018/12/1
 *
 */

import React from 'react';
import Event from '../Base/Event';
import { component_active, component_drag, component_inactive } from '../util/actions';
import NoZoomTransform from '../Base/NoZoomTransform';

export default class ViewSelectedBordered extends NoZoomTransform {
  componentWillMount() {
    this.target = null;
    Event.listen(component_active, this.handleActive);
    Event.listen(component_drag, this.setBoundingRect);
    Event.listen(component_inactive, this.handleInactive);
  }

  handleActive = (target) => {
    this.target = target;
    this.show(true);
    this.setBoundingRect();
  };

  handleInactive = () => {
    this.show(false);
  };

  componentWillUnmount() {
    Event.destroy(component_active, this.handleActive);
    Event.destroy(component_drag, this.setPosition);
    Event.destroy(component_inactive, this.handleInactive);
  }

  show = (visible) => {
    this.refs.container.style.display = visible ? 'block' : 'none';
  };

  render() {
    return (
      <div
        style={{
          transform: 'translate(-10000px,100000px)',
          border: '1px solid red',
          position: 'absolute',
        }}
        ref={'container'}
      />
    );
  }
}
