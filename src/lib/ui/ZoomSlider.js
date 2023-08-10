/**
 *  created by yaojun on 2019/3/7
 *
 */

import React from 'react';
import Draggable from '../Draggable';
import { Dom } from '../util/helper';

import './ZoomSlider.scss';
import Event from '../Base/Event';
import { context_zoom_in, context_zoom_level, context_zoom_out, editor_scroll_change } from '../util/actions';
import { getScreeTransform } from '../global';
import { DEFAULT_ZOOM_LEVEL, MAX_ZOOM_LEVEL } from '../Widget/EditorScrollbar';

export default class ZoomSlider extends React.Component {
  componentDidMount() {
    this.valueDom = Dom.of(this.refs.value);
    this.valueDom.text(getScreeTransform().scale * 100);
    Event.listen(editor_scroll_change, this.handleChange);
    this.slider = Dom.of(this.refs.slider);
    this.refreshSlider(getScreeTransform().level || DEFAULT_ZOOM_LEVEL);
    new Draggable(this.refs.track, {
      pointLimit: true,
      onDragStart() {},
      onDragMove: ({ pointY }) => {
        this.slider.top(pointY - 7);
        Event.dispatch(context_zoom_level, Math.floor((pointY / 150) * MAX_ZOOM_LEVEL));
      },
    });
  }

  componentWillUnmount() {
    Event.destroy(editor_scroll_change, this.handleChange);
  }

  refreshSlider = (level) => {
    this.slider.top((level / MAX_ZOOM_LEVEL) * 150 - 7);
  };

  handleChange = ({ isScale, scale, level }) => {
    if (isScale) {
      this.valueDom.text(Math.floor(scale * 100));
      this.refreshSlider(level);
    }
  };

  handleClick = (action) => {
    Event.dispatch(action);
  };

  handleReset = () => {
    Event.dispatch(context_zoom_level, DEFAULT_ZOOM_LEVEL);
  };

  render() {
    return (
      <div className={'aj-zoom-slider'}>
        <div onClick={this.handleReset} ref={'value'} className={'aj-zoom_value aj-zoom_btn'}>
          {' '}
          999
        </div>
        <div onClick={() => this.handleClick(context_zoom_out)} className={'aj-zoom_min aj-zoom_btn'}>
          {' '}
          -
        </div>
        <div ref={'track'} className={'aj-zoom-wrapper'}>
          <div ref={'slider'} className={'aj-zoom_slider'}></div>
          <div className={'aj-zoom_track'}></div>
        </div>
        <div onClick={() => this.handleClick(context_zoom_in)} className={'aj-zoom_max aj-zoom_btn'}>
          {' '}
          +
        </div>
      </div>
    );
  }
}
