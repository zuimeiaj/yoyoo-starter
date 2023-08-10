/**
 *  created by yaojun on 2018/12/7
 *
 */

import React from 'react';
import Draggable from '../Draggable';
import './Guides.scss';
import { getScreenOffset, getScreeTransform } from '../global';
import Event from '../Base/Event';
import {
  editor_guides_change,
  editor_scroll_change,
  guide_delete,
  guide_delete_all,
  guide_delete_h,
  guide_delete_v,
  guide_display,
  guide_hide,
  guide_move,
  guide_move_end,
  guide_ready,
  outline_page_select_end,
  preferences_configchange,
  viewport_ready,
  window_size_change,
} from '../util/actions';
import config from '../util/preference';
import { Dom } from '../util/helper';
import { getPageData } from '../util/page';
import { getCurrentPage } from '../global/instance';

export default class Guides extends React.Component {
  componentDidMount() {
    this.lines = [];
    this.line = null; //  当前新新生成的
    /**
     * 向前呼出菜单的Line 索引
     * @type {number}
     */
    this.context_index = -1;
    this.isH = this.props.type == 'h';
    this._axis = this.isH ? 'y' : 'x';
    /**
     *
     * @type {Rect}
     */
    this.viewportRect = null;
    /**
     *
     * @type {HTMLElement}
     */
    this.viewport = null;

    // 获取编辑器宽度
    this._getViewPortRect = () => {};
    const id = `editor-ruler-${this.props.type}`;
    const dom = document.querySelector(`#${id}`);

    Event.listen(editor_scroll_change, this.handleScrollChange);
    Event.listen(viewport_ready, this.onViewportReady);
    Event.listen(guide_delete, this.onDeleteLine);
    Event.listen(guide_delete_v, this.onClearLineV);
    Event.listen(guide_delete_h, this.onClearLineH);
    Event.listen(guide_delete_all, this.onClearLine);
    Event.listen(window_size_change, this.handleWindowSizeChange);
    Event.listen(guide_hide, this.handleLineHide);
    Event.listen(guide_display, this.handleLineDisplay);
    Event.listen(preferences_configchange, this.setDefaultForBounds);
    Event.listen(outline_page_select_end, this.handlePageSelect);

    new Draggable(dom, {
      onDragStart: this.handleDragStart,
      onDragMove: this.handleDragMove,
      onDragEnd: this.handleDragEnd,
    });

    new Draggable(this.refs.g, {
      onDragStart: this.handleLineDragStart,
      onDragMove: this.handleLineDragMove,
      onDragEnd: this.handleLineDragEnd,
    });
    this.setDefaultForBounds();

    setTimeout(() => {
      Event.dispatch(guide_ready, this);
    });
  }

  handlePageSelect = ({ data }) => {
    if (!this.viewportRect) return;
    this.clearLine();
    this.batchCreateLine(data.guides[this._axis], this._axis);
  };

  handleLineDisplay = () => {
    Dom.of(this.refs.g).show();
  };

  handleLineHide = () => {
    Dom.of(this.refs.g).hide();
  };

  handleWindowSizeChange = () => {
    this.viewportRect = this._getViewPortRect();
    this.updateLineLength();
  };

  onDeleteLine = (target) => {
    if (this !== target) return;
    this.destroyLineWithIndex(target.context_index);
    this.emitGuidesChange();
  };

  onClearLine = (target) => {
    this.clearLine();
    this.emitGuidesChange();
  };

  onClearLineV = (target) => {
    if (!this.isH) this.clearLine();
    this.emitGuidesChange();
  };

  onClearLineH = (target) => {
    if (this.isH) this.clearLine();

    this.emitGuidesChange();
  };

  updateLineLength = () => {
    this.lines.forEach((line) => {
      line.setLength(this.viewportRect[this.isH ? 'width' : 'height']);
    });
  };

  setDefaultForBounds = () => {
    config.guides.x[0] = 1;
    config.guides.x[config.viewport.width / 2] = 1;
    config.guides.x[config.viewport.width] = 1;
    config.guides.y[0] = 1;
    config.guides.y[config.viewport.height / 2] = 1;
    config.guides.y[config.viewport.height] = 1;
  };

  onViewportReady = (target) => {
    this.viewportRect = target.getRect();
    this._getViewPortRect = target.getRect;
    this.viewport = target.refs.container;
  };

  handleScrollChange = ({ x, y, isScale, scale }) => {
    let offset = getScreenOffset();
    let x1 = (x - config.originCoords.x - offset.viewport.x) * scale;
    let y1 = (y - config.originCoords.y - offset.viewport.y) * scale;
    this.refs.g.style.transform = this.isH ? `translateX(${x1}px)` : `translateY(${y1}px)`;

    if (isScale) {
      let axis = this.isH ? 'y' : 'x';
      config.guides[axis] = {};
      this.setDefaultForBounds();
      this.lines.forEach((item) => {
        item.setScale(scale);
        config.guides[axis][Math.round(item[axis] / scale)] = 1;
      });
    }
  };

  //  重置line上的索引
  refreshLineIndex = () => {
    this.lines.forEach((line, index) => line.setIndex(index));
  };

  /**
   * 临时挂到外面容器
   */
  appendLine = () => {
    let line = new Line(this.props.type);
    this.lines.push(line);
    this.viewport.appendChild(line.dom);
    this.line = line;
  };

  batchCreateLine = (lines, type) => {
    config.guides[this.isH ? 'y' : 'x'] = {};
    this.setDefaultForBounds();
    lines.forEach((item, index) => {
      let line = new Line(this.props.type);
      //  设置相对于编辑区域的位置
      let { x, y, scale } = getScreeTransform();
      let { viewport } = getScreenOffset();
      if (type == 'y') {
        y = item;
        //  真实位置记录
        config.guides.y[Math.round(y / scale)] = 1; // set line to pint
      } else {
        x = item;
        config.guides.x[Math.round(x / scale)] = 1;
      }

      line.setPosition(x, y);
      line.setIndex(index);
      line.setLength(this.viewportRect[this.isH ? 'width' : 'height']);
      this.refs.v.appendChild(line.dom);
      this.lines.push(line);
    });
  };

  /**
   * 坐标从固定切换到相对于编辑器
   */
  appendToViewport = () => {
    this.refs.v.appendChild(this.line.dom);
    //  设置相对于编辑区域的位置
    let { x, y, scale } = getScreeTransform();
    let { viewport } = getScreenOffset();
    if (this.isH) {
      y = (y - config.originCoords.y) * scale + this.line.y - viewport.y * scale;
      //  真实位置记录
      config.guides.y[Math.round(y / scale)] = 1; // set line to pint
    } else {
      x = (x - config.originCoords.x) * scale + this.line.x - viewport.x * scale;
      config.guides.x[Math.round(x / scale)] = 1;
    }

    this.line.setPosition(x, y);
    this.line.setIndex(this.lines.length - 1);
    this.emitGuidesChange();
  };

  emitGuidesChange = () => {
    Event.dispatch(editor_guides_change, {
      key: this._axis,
      value: this.lines.map((item) => Math.round(item[this._axis])),
    });
  };

  clearLine = () => {
    this.lines.forEach((item) => item.destroy());
    this.lines = [];
  };

  destroyLine = () => {
    let line = this.lines.pop();
    line.destroy();
  };

  destroyLineWithIndex = (index) => {
    let line = this.lines[index];
    line.destroy();

    this.lines.splice(index, 1);
    this.refreshLineIndex();
  };

  handleLineDragStart = (_, e) => {
    let index = e.target.dataset.index;
    this.line = this.lines[index];
  };

  handleLineDragMove = ({ realDeltaX, realDeltaY, mouseX, mouseY }) => {
    this.setLinePosition(realDeltaX, realDeltaY);
    let scale = getScreeTransform().scale;
    let axis = this.isH ? 'y' : 'x';
    config.guides[axis] = {};
    this.setDefaultForBounds();
    this.lines.forEach((item) => {
      config.guides[axis][Math.round(item[axis] / scale)] = 1;
    });

    let coords = { pageX: mouseX, pageY: mouseY };
    coords.isH = this.line.isH;
    Event.dispatch(guide_move, coords);
  };

  handleLineDragEnd = () => {
    Event.dispatch(guide_move_end);
    this.emitGuidesChange();
  };

  handleDragStart = ({ pointX, pointY }) => {
    this.appendLine();

    let { x, y } = this.line;
    if (this.isH) {
      y = pointY - 20;
    } else {
      x = pointX - 20;
    }
    this.line.setPosition(x, y);
    this.line.setLength(this.viewportRect[this.isH ? 'width' : 'height']);
  };

  setLinePosition = (deltaX, deltaY) => {
    let { x, y } = this.line;
    if (this.isH) {
      y += deltaY;
    } else {
      x += deltaX;
    }
    this.line.setPosition(x, y);
  };

  handleDragMove = ({ realDeltaX, realDeltaY, mouseX, mouseY }) => {
    this.setLinePosition(realDeltaX, realDeltaY);
    let coords = { pageX: mouseX, pageY: mouseY };
    coords.isH = this.isH;
    Event.dispatch(guide_move, coords);
  };

  handleDragEnd = () => {
    let start = this.isH ? this.line.y : this.line.x;
    if (start <= 0) {
      this.line.destroy();
      this.lines.pop();
    } else {
      this.appendToViewport();
    }
    Event.dispatch(guide_move_end);
  };

  componentWillUnmount() {
    Event.destroy(window_size_change, this.handleWindowSizeChange);
    Event.destroy(editor_scroll_change, this.handleScrollChange);
    Event.destroy(viewport_ready, this.onViewportReady);
    Event.destroy(guide_delete, this.onDeleteLine);
    Event.destroy(guide_delete_v, this.onClearLineV);
    Event.destroy(guide_delete_h, this.onClearLineH);
    Event.destroy(guide_delete_all, this.onClearLine);
    Event.destroy(guide_hide, this.handleLineHide);
    Event.destroy(guide_display, this.handleLineDisplay);
    Event.destroy(preferences_configchange, this.setDefaultForBounds);
    Event.destroy(outline_page_select_end, this.handlePageSelect);
  }

  getContextMenu() {
    return [
      {
        name: '删除',
        action: guide_delete,
      },
      {
        name: '清空垂直',
        action: guide_delete_v,
      },
      {
        name: '清空水平',
        action: guide_delete_h,
      },
      {
        name: '清空所有',
        action: guide_delete_all,
      },
    ];
  }

  render() {
    return (
      <div style={{ position: 'absolute', left: 0, top: 0, height: 0, width: 0 }} ref={'g'} id={`guides-${this.props.type}`}>
        <div ref={'v'}></div>
      </div>
    );
  }
}

class Line {
  constructor(type) {
    this.x = 0;
    this.y = 0;
    this._x = 0;
    this._y = 0;
    this.isH = type == 'h';
    let dom = document.createElement('div');
    let inner = document.createElement('div');
    dom.style.position = 'absolute';
    dom.className = 'line line-' + type;
    dom.dataset.uid = 'line' + type + Date.now();
    inner.className = 'line_inner';
    dom.appendChild(inner);
    this.dom = dom;
    this.inner = inner;
  }

  /**
   * 编辑区域大小变化后需要重新设置line的长度
   * @param len
   */
  setLength(len) {
    if (this.isH) {
      this.dom.style.width = len + 'px';
    } else {
      this.dom.style.height = len + 'px';
    }
  }

  setScale(scale) {
    if (this.isH) {
      this.y = Math.round(this._y * scale);
    } else {
      this.x = Math.round(this._x * scale);
    }

    this._apply();
  }

  destroy = () => {
    this.dom.parentNode.removeChild(this.dom);
    this.dom = null;
    this.inner = null;
    this.x = null;
    this.y = null;
  };

  setPosition = (x, y) => {
    this.x = x;
    this.y = y;
    this._x = x / getScreeTransform().scale;
    this._y = y / getScreeTransform().scale;
    this._apply();
  };

  _apply = () => {
    if (this.isH) {
      this.dom.style.top = this.y + 'px';
    } else {
      this.dom.style.left = this.x + 'px';
    }
  };

  setIndex = (index) => {
    this.dom.setAttribute('data-index', index);
    this.inner.setAttribute('data-index', index);
  };
}
