/**
 *  created by yaojun on 2018/12/1
 *
 */
import React from 'react';
import Event from '../Base/Event';
import {
  component_active,
  component_close_edit_mode,
  component_drag,
  component_dragend,
  component_edit_mode,
  component_inactive,
  component_resize_end,
  component_resize_start,
  component_show_resizer,
  editor_scroll_change,
} from '../util/actions';
import './ViewResizable.scss';
import Draggable from '../Draggable';
import NoZoomTransform from '../Base/NoZoomTransform';
import { Dom } from '../util/helper';
import Matrix, { getPoints } from '../util/Matrix';
import { pointToWorkspaceCoords } from '../global';

const gResize = ['rotation', 'tl', 'tm', 'tr', 'r', 'br', 'bm', 'bl', 'l', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom'];
const cursorStartMap = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };
const cursorDirectionArray = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
const cursorMap = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 6, 10: 7, 11: 8 };

export const getCursor = (rotateAngle, d) => {
  const increment = cursorMap[Math.floor(rotateAngle / 30)];
  const index = cursorStartMap[d];
  const newIndex = (index + increment) % 8;
  return cursorDirectionArray[newIndex];
};
export default class ViewResizable extends NoZoomTransform {
  constructor() {
    super();
    /**
     * 当前顶点矩阵
     * @type {Matrix}
     */
    this.origin = null;
    this.acrossPoint = null;
    // 类型
    this.resizeHandler = null;
    // 定点位置
    this.point = 0;
    //  目标元素
    this.target = null;
    //  当前区域宽度，用于限制范围边界
    this.transform = { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
    // min of width
    this.minWidth = 1;
    // max of width
    this.minHeight = 1;
    this._isHide = false;
    this._x1 = 0;
    this._y1 = 0;
  }

  componentDidMount() {
    this.show(false);
    Event.listen(component_active, this.onComponentActive);
    Event.listen(component_drag, this.onComponentDrag);
    Event.listen(component_dragend, this.onComponentDragend);
    Event.listen(component_resize_end, this.onComponentDragend);
    Event.listen(component_inactive, this.onComponentInactive);
    Event.listen(component_show_resizer, this.onComponentActive);
    Event.listen(component_edit_mode, this.onOpenEditMode);
    Event.listen(component_close_edit_mode, this.onCloseEditMode);
    let cx,
      cy,
      startAngle,
      currentAngle = 0,
      rotation = 0;
    //rotation
    new Draggable(this.refs.rotation, {
      onDragStart: ({ mouseX, mouseY }, e) => {
        this._isRotate = true;
        let t = this.target.refs.container.getBoundingClientRect();
        cx = t.left + t.width / 2;
        cy = t.top + t.height / 2;
        startAngle = (180 / Math.PI) * Math.atan2(mouseY - cy, mouseX - cx);
        let trans = this;
        let tcx = trans.x + trans.width / 2;
        let tcy = trans.y + trans.height / 2;
        rotation = this.transform.rotation;
        this.refs.wrapper.style.transformOrigin = `${tcx}px ${tcy}px`;
        this.onScaleStart();
      },
      onDragMove: ({ mouseX, mouseY }) => {
        window._mouse = { mouseX, mouseY };
        let x = mouseX - cx;
        let y = mouseY - cy;
        let angle = (180 / Math.PI) * Math.atan2(y, x);
        currentAngle = angle - startAngle;
        let r = rotation + currentAngle;
        r = r % 360;
        r = r < 0 ? r + 360 : r;
        this.setRotation(Math.floor(r));
      },
      onDragEnd: () => {
        this._isRotate = false;
        this._isHide = false;
        this.show(true);
        rotation += currentAngle;
        this.target.rotationEnd(); // 再resize_end事件触发钱修改 transform都将可以被保存到
        Event.dispatch(component_resize_end);
      },
    });
    this.startResizeHandler();
  }

  startResizeHandler = () => {
    let self = this;
    let pointMap = {
      br: 0,
      tr: 3,
      tl: 2,
      bl: 1,
      tm: 2,
      bm: 0,
      l: 1,
      r: 3,
    };
    let widthMap = {
      l: 1,
      r: 1,
    };
    let heightMap = {
      tm: 1,
      bm: 1,
    };
    let tl2br = {
      tl: 1,
      br: 1,
      tm: 1,
      bm: 1,
    };
    let tr2bl = {
      tr: 1,
      bl: 1,
      r: 1,
      l: 1,
    };

    function getRect() {
      return self.target.getOffsetRect();
    }

    function deg2rad(deg) {
      return (deg * Math.PI) / 180;
    }

    function rad2deg(rad) {
      return (rad * 180) / Math.PI;
    }

    function getSize({ type, x, y, dis, ratio }) {
      let w, h;
      let currentAngle = rad2deg(Math.atan2(y, x));
      let rad = deg2rad(pressAngle + currentAngle - startAngle);
      if (tr2bl[type]) {
        h = Math.cos(rad) * dis;
        w = Math.sin(rad) * dis;
      } else {
        h = Math.sin(rad) * dis;
        w = Math.cos(rad) * dis;
      }
      if (ratio) {
        if (widthMap[type]) {
          h = w / currentRatio;
        } else if (heightMap) {
          w = h * currentRatio;
        }
      }
      return { w, h };
    }

    function getParentRect(rect) {
      let current = self.target.properties.transform;
      return {
        x: rect.x - current.x,
        y: rect.y - current.y,
        width: current.width,
        heigh: current.height,
        rotation: current.rotation,
      };
    }

    function getOffsetRect(rect) {
      return {
        x: parentRect.x + rect.x,
        y: parentRect.y + rect.y,
        width: rect.width,
        height: rect.height,
        rotation: rect.rotation,
      };
    }

    let type,
      rect,
      matrix = null,
      opposite = null,
      startAngle = 0,
      pressAngle = 0,
      currentRatio = 0,
      parentRect = {};
    new Draggable(self.refs.resize, {
      onDragStart(data, e) {
        type = e.target.dataset.d;
        rect = getRect();
        parentRect = getParentRect(rect);
        matrix = getPoints(rect);
        if (type) {
          opposite = matrix[pointMap[type]];
          let { x, y } = pointToWorkspaceCoords(e);
          let x1 = x - opposite.x;
          let y1 = y - opposite.y;
          let _width = rect.width,
            _height = rect.height;
          currentRatio = _width / _height;
          if (tr2bl[type]) {
            if (widthMap[type]) _height /= 2;
            pressAngle = rad2deg(Math.atan2(_width, _height));
          } else {
            if (heightMap[type]) _width /= 2;
            pressAngle = rad2deg(Math.atan2(_height, _width));
          }
          startAngle = rad2deg(Math.atan2(y1, x1));
        }
      },
      onDragMove({ deltaX, deltaY }, e) {
        if (!deltaX && !deltaY) return;
        if (type) {
          let { x: mouseX, y: mouseY } = pointToWorkspaceCoords(e);
          let x = mouseX - opposite.x;
          let y = mouseY - opposite.y;
          window._mouse = { mouseX: e.pageX, mouseY: e.pageY };
          let dis = Math.hypot(y, x);
          let ratio = e.shiftKey || self.target.properties.settings.ratio;
          let { w, h } = getSize({ type, dis, x, y, ratio });
          let transform = Object.assign({}, self.target.properties.transform);
          if (widthMap[type] && !ratio) {
            transform.width = w;
          } else if (heightMap[type] && !ratio) {
            transform.height = h;
          } else {
            transform.width = w;
            transform.height = h;
          }
          if (transform.width < self.minWidth) {
            transform.width = self.minWidth;
          }
          if (transform.height < self.minHeight) {
            transform.height = self.minHeight;
          }
          currentRatio = transform.width / transform.height;
          // 顶点固定
          let matrix = getPoints(getOffsetRect(transform));
          let _opp = matrix[pointMap[type]];
          let deltaX = -(_opp.x - opposite.x),
            deltaY = -(_opp.y - opposite.y);
          transform.x += deltaX;
          transform.y += deltaY;
          self.setTargetTransform(transform);
        }
      },
      onDragEnd: self.setScaleStatus,
    });
  };
  onComponentDragend = () => {
    this._isHide = false;
    this.show(true);
  };
  onCloseEditMode = () => {
    Dom.of(this.refs.resizeWrapper).show();
  };
  onOpenEditMode = () => {
    Dom.of(this.refs.resizeWrapper).hide();
  };
  onScaleStart = (_, e) => {
    let t = this.target.properties.transform;
    this._x1 = 0;
    this._y1 = 0;
    this._x0 = 0;
    this._y0 = 0;
    this._tx0 = t.x;
    this._ty0 = t.y;
    this._tw = t.width;
    this._th = t.height;
    this.transform = t;
    Event.dispatch(component_resize_start, this.target);
  };
  setScaleStatus = () => {
    this.target.resizeEnd(); // 同旋转原理
    Event.dispatch(component_resize_end);
    this.show(true);
    this._isHide = false;
  };
  /**
   * 主动改变视图的位置时需要触发该视图的drag事件
   * @param x
   * @param y
   * @param w
   * @param h
   * @param a
   */
  setTargetTransform = ({ x, y, width, height, ratation }) => {
    this.target.setTransform(Math.round(x), Math.round(y), Math.round(width), Math.round(height), ratation);
    //this.target.setTransform(x, y,width, height, ratation)
    Event.dispatch(component_drag, this.target, { from: 'Resizable' });
  };

  setRotation(angle) {
    this.target.setRotation(angle);
    Event.dispatch(component_drag, this.target, { from: 'Rotatable' });
  }

  onComponentDrag = (target) => {
    let t = target.properties.transform;
    // if (!this._isHide) {
    //   this._isHide = true;
    //   this.show(false);
    // }
    this.setBoundingRect(t);
  };
  onComponentActive = (target) => {
    this.target = target;
    this.show(true);
    this.transform = target.properties.transform;
    this.setBoundingRect();
    let resize = target.properties.settings.resize;
    if (resize === null) resize = gResize;
    resize.forEach((item) => {
      Dom.of(this.refs[item]).show();
    });
  };
  onComponentInactive = () => {
    this.show(false);
    this.target = null;
    gResize.forEach((item) => {
      Dom.of(this.refs[item]).hide();
    });
  };

  componentWillUnmount() {
    Event.destroy(component_drag, this.onComponentDrag);
    Event.destroy(component_active, this.onComponentActive);
    Event.destroy(component_inactive, this.onComponentInactive);
    Event.destroy(editor_scroll_change, this.setBoundingRect);
    Event.destroy(component_show_resizer, this.onComponentActive);
    Event.destroy(component_dragend, this.onComponentDragend);
    Event.destroy(component_close_edit_mode, this.onCloseEditMode);
    Event.destroy(component_edit_mode, this.onOpenEditMode);
    Event.destroy(component_resize_end, this.onComponentDragend);
  }

  setPosition = (dom, x, y) => {
    dom.style.left = x + 'px';
    dom.style.top = y + 'px';
  };
  setBorderWidth = (dom, w, h) => {
    dom.style.width = w + 'px';
    dom.style.height = h + 'px';
  };
  show = (visible) => {
    this.refs.wrapper.style.display = visible ? 'block' : 'none';
  };
  applyToDom = () => {
    if (!this.target || !this.target.properties) return;
    let { x, y, width, height, rotation } = this;
    let half = 4;
    let { tl, tm, tr, l, bl, bm, br, r, wrapper, borderTop, borderBottom, borderLeft, borderRight } = this.refs;
    this.setPosition(borderTop, x, y);
    this.setPosition(borderBottom, x, y + height);
    this.setPosition(borderLeft, x, y);
    this.setPosition(borderRight, x + width, y);
    this.setBorderWidth(borderTop, width, 1);
    this.setBorderWidth(borderBottom, width, 1);
    this.setBorderWidth(borderLeft, 1, height);
    this.setBorderWidth(borderRight, 1, height);
    //
    this.setPosition(tl, x - half, y - half);
    this.setPosition(tm, x + width / 2 - half, y - half);
    this.setPosition(tr, x + width - half, y - half);
    this.setPosition(r, x + width - half, y + height / 2 - half);
    this.setPosition(br, x + width - half, y + height - half);
    this.setPosition(bm, x + width / 2 - half, y + height - half);
    this.setPosition(bl, x - half, y + height - half);
    this.setPosition(l, x - half, y + height / 2 - half);
    this.setPosition(this.refs.rotation, x + width / 2 - half, y - 24);
    wrapper.style.transform = `rotate(${rotation}deg)`;
    let ox = x + width / 2,
      oy = y + height / 2;
    wrapper.style.transformOrigin = `${ox}px ${oy}px`;
  };

  handleCursor = (e) => {
    let type = e.target.dataset.type;
    if (type) {
      let style = getCursor(this.transform.rotation, type);
      e.target.style.cursor = `${style}-resize`;
    }
  };
  render() {
    return (
      <div ref={'wrapper'}>
        {/*Border*/}
        <div className={'resizable-border rb-h'} ref={'borderTop'}></div>
        <div className={'resizable-border rb-v'} ref={'borderLeft'}></div>
        <div className={'resizable-border rb-h'} ref={'borderBottom'}></div>
        <div className={'resizable-border rb-v'} ref={'borderRight'}></div>

        {/*Circle*/}

        <div ref={'resizeWrapper'}>
          <div ref={'rotation'} className={'rotation-circle '}>
            <div className={'r-line'}></div>
          </div>

          <div onMouseEnter={this.handleCursor} ref={'resize'}>
            <div data-type='nw' ref={'tl'} data-d='tl' className={'resizable-circle rc-tl'}></div>
            <div data-type='n' ref={'tm'} data-d='tm' className={'resizable-circle rc-tm'}></div>
            <div data-type='ne' ref={'tr'} data-d='tr' className={'resizable-circle rc-tr'}></div>
            <div data-type='e' ref={'r'} data-d='r' className={'resizable-circle rc-r'}></div>
            <div data-type='se' ref={'br'} data-d='br' className={'resizable-circle rc-br'}></div>
            <div data-type='s' ref={'bm'} data-d='bm' className={'resizable-circle rc-bm'}></div>
            <div data-type='sw' ref={'bl'} data-d='bl' className={'resizable-circle rc-bl'}></div>
            <div data-type='w' ref={'l'} data-d='l' className={'resizable-circle rc-l'}></div>
          </div>
        </div>
      </div>
    );
  }
}
