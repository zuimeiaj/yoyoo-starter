/**
 *  created by yaojun on 2018/12/5
 *
 */
import React from 'react';
import Draggable from './Draggable';
import PropTypes from 'prop-types';
import './scroller.scss';
import { getScreeTransform, pointToWorkspaceCoords, workspaceToPointCoords } from './global';
import config from './util/preference';
import Event from './Base/Event';
import { canvas_dragging, canvas_dragstart } from './util/actions';
import { getFirstResponder } from './global/instance';

const TWEEN = require('@tweenjs/tween.js');
export default class Scroller extends React.Component {
  static defaultProps = {
    type: 'h',
    defaultStart: 0,
    onChange: () => {},
  };
  static propTypes = {
    type: PropTypes.string,
    onChange: PropTypes.func,
    defaultStart: PropTypes.number,
  };

  componentDidMount() {
    this.panel = document.querySelector('.editor-control-panel');
    const { defaultStart, type } = this.props;
    this.type = type;
    this.size = 100; // size of slider
    this.minSize = 100;
    this.ratio = 1;
    this.max = 0;
    this.start = 0;
    this.needViewportCoordsX = true;
    this.needViewportCoordsY = true;
    this.range = type == 'h' ? config.world.x : config.world.y;
    this._range = this.range;
    let hcenter = (window.innerWidth - (config.editorDomRect.left + config.editorDomRect.right)) / 2 - config.viewport.width / 2;
    let vcenter = (window.innerHeight - config.editorDomRect.top) / 2 - config.viewport.height / 2;
    let center = type === 'h' ? hcenter : vcenter;
    this._distance = (type === 'h' ? config.originCoords.x : config.originCoords.y) - center;
    this._originDistance = this._distance;
    this._current = this.start;
    this._typeRectName = type === 'h' ? 'height' : 'width';
    this._lastDiff = 0;
    this._pointOffsetX = null;
    this._pointOffsetY = null;
    this._initialPointOffsetX = null;
    this._initialPointOffsetY = null;
    this._lastMouseX = null;
    this._lastMouseY = null;
    this.init();
    Event.listen(canvas_dragstart, this.handleDraggStart);
    Event.listen(canvas_dragging, this.handleDragging);
    window['scroll' + this.type] = this;
  }

  scrollToCenter = (scale, e = { pageX: window.innerWidth / 2, pageY: window.innerHeight / 2 }) => {
    let type = this.type;
    let isH = this.type == 'h';
    let pointOffset = {
      x: (window.innerWidth - (config.editorDomRect.left + config.editorDomRect.right)) / 2 - (e.pageX - config.editorDomRect.left),
      y: (window.innerHeight - config.editorDomRect.top) / 2 - (e.pageY - config.editorDomRect.top),
    };
    if (e.pageX !== this._lastMouseX) {
      this.needViewportCoordsX = true;
    }

    if (e.pageY !== this._lastMouseY) {
      this.needViewportCoordsY = true;
    }

    this._lastMouseX = e.pageX;
    this._lastMouseY = e.pageY;

    if (isH && this.needViewportCoordsX) {
      this._pointOffsetX = (e.pageX - workspaceToPointCoords().x) / scale;
    } else if (!isH && this.needViewportCoordsY) {
      this._pointOffsetY = (e.pageY - workspaceToPointCoords().y) / scale;
    }

    if (isH) console.log(this._pointOffsetX);
    this.needViewportCoordsX = false;
    this.needViewportCoordsY = false;

    let hcenter = (window.innerWidth - (config.editorDomRect.left + config.editorDomRect.right)) / 2 - pointOffset.x - this._pointOffsetX * scale;
    let vcenter = (window.innerHeight - config.editorDomRect.top) / 2 - pointOffset.y - this._pointOffsetY * scale;
    let center = type === 'h' ? hcenter : vcenter;
    this._distance = (type === 'h' ? config.originCoords.x * scale : config.originCoords.y * scale) - center;
    this.initParams();
    this.start = this._distance / this.ratio;
    this._setPosition(this.start);
    this.initSlider();
    this.props.onChange(this.start * this.ratio);
  };
  panToCenter = () => {
    let type = this.type;
    let scale = getScreeTransform().scale;
    let x1 = this.start;
    let halfW = (window.innerWidth - (config.editorDomRect.left + config.editorDomRect.right)) / 2;
    let halfH = (window.innerHeight - config.editorDomRect.top) / 2;
    let hcenter = halfW - (config.viewport.width / 2) * scale;
    let vcenter = halfH - (config.viewport.height / 2) * scale;
    let responder = getFirstResponder();
    if (responder) {
      let t = responder.properties.transform;
      hcenter = halfW - (t.x + t.width / 2) * scale;
      vcenter = halfH - (t.y + t.height / 2) * scale;
    }
    let center = type === 'h' ? hcenter : vcenter;
    this._distance = (type === 'h' ? config.originCoords.x * scale : config.originCoords.y * scale) - center;
    this.initParams();
    this.start = this._distance / this.ratio;
    this._current = this.start;
    return { x1, x2: this.start, ratio: this.ratio };
  };

  updateScrollPosition(start) {
    this.start = start;
    this._setPosition(start);
  }

  componentWillUnmount() {
    Event.destroy(canvas_dragstart, this.handleDraggStart);
    Event.destroy(canvas_dragging, this.handleDragging);
  }

  handleDraggStart = () => {
    this._current = this.start;
  };
  handleDragging = ({ realDeltaX, realDeltaY, dragging }) => {
    if (dragging) {
      realDeltaX /= this.ratio;
      realDeltaY /= this.ratio;
    }
    this.emitScrollChange(realDeltaX, realDeltaY);
  };
  update = () => {
    let x = this.start * this.ratio;
    this.initParams();
    let x1 = this.start * this.ratio;
    this.start -= (x1 - x) / this.ratio;
    this._setPosition(this.start);
    this.initSlider();
  };
  init = () => {
    setTimeout(() => {
      this.initParams();
      let start = this._distance / this.ratio;
      start = Math.min(start, this.max);
      start = Math.max(start, 0);
      this.start = start;
      this._setPosition(start);
      this.initSlider();
      setTimeout(() => {
        this.props.onChange(this.start * this.ratio);
      });
      new Draggable(this.refs.slider, {
        onDragStart: this.handleDraggStart,
        onDragMove: this.handleDragging,
      });
    }, 1000);
  };
  emitScrollChange = (dx, dy) => {
    this.scroll(dx, dy);
    this.props.onChange(this.start * this.ratio);
  };
  initParams = () => {
    let type = this.type == 'h' ? 'width' : 'height';
    let wrapper = this.refs.slider.parentNode;
    let wrapperRect = wrapper.getBoundingClientRect();
    let scrollableHeight = this.range - wrapperRect[type];
    if (scrollableHeight > wrapperRect[type]) {
      this.size = ((wrapperRect[type] - this.minSize) / scrollableHeight) * this.minSize;
      this.size = this.size < 20 ? 20 : this.size;
      this.max = wrapperRect[type] - this.size - 8;
      this.ratio = scrollableHeight / this.max;
    } else {
      this.size = wrapperRect[type] - scrollableHeight;
      this.ratio = 1;
      this.max = scrollableHeight;
    }
  };

  updateRange() {
    this.initParams();
    this.initSlider();
  }

  // 暂时使用 top left 缩放点
  updateFromScale = (scale, e) => {
    this.range = this._range * scale;
    this.scrollToCenter(scale, e);
  };
  _setPosition = (d) => {
    let key = this.type == 'h' ? 'left' : 'top';
    this.refs.slider.style[key] = d + 'px';
  };
  updateFromWheel = (d) => {
    this._pointOffsetX = null;
    this._pointOffsetY = null;
    this._lastMouseX = null;
    this._lastMouseY = null;
    this.start += d;
    this._current = this.start;
    if (this.start > this.max) {
      this.start = this.max;
    } else if (this.start < 0) {
      this.start = 0;
    }
    this._distance = (this.start * this.ratio) / getScreeTransform().scale;
    this._setPosition(this.start);
    return this.start * this.ratio;
  };

  /**
   *
   * @param deltaX
   * @param deltaY
   * @return {number}
   */
  scroll(deltaX, deltaY) {
    let d = this.type === 'h' ? deltaX : deltaY;
    this.fixStart(d);
    this._pointOffsetX = null;
    this._pointOffsetY = null;
    this._lastMouseX = null;
    this._lastMouseY = null;
    this._distance = (this.start * this.ratio) / getScreeTransform().scale;
    this._setPosition(this.start);
  }

  /**
   *
   * @param d
   */
  fixStart = (d) => {
    this._current += d;
    this.start = this._current;
    if (this._current > this.max) this.start = this.max;
    if (this._current < 0) this.start = 0;
  };

  initSlider() {
    let style = this.refs.slider.style;
    let rect = this.type === 'h' ? 'width' : 'height';
    style[rect] = this.size + 'px';
  }

  render() {
    let type = this.props.type;
    return (
      <div className={`aj-scroller-${type}`}>
        <div className={'aj-scroller-slider'} ref={'slider'}></div>
      </div>
    );
  }
}
