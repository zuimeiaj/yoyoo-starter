/**
 *  created by yaojun on 2018/12/1
 *  可根据当前的缩放来适应坐标
 *
 */
import { getScreeTransform } from './global';

export default class Draggable {
  constructor(container, options = {}) {
    this.options = options;
    this.container = container;
    // 当前元素位置
    this.positionX = options.x || 0;
    this.positionY = options.y || 0;
    // 鼠标当前位置
    this.mouseX = 0;
    this.mouseY = 0;
    // 鼠标上个点位置
    this.lastX = 0;
    this.lastY = 0;
    // 鼠标点到元素边距离
    this.pointX = 0;
    this.pointY = 0;
    // 与上次移动差量
    this.deltaX = 0;
    this.deltaY = 0;
    this.snap = {
      x: 1,
      y: 1,
    };
    this._initEvents();
  }

  _initEvents = () => {
    this.container.addEventListener('mousedown', this._mousedown, false);
    this.container.addEventListener('touchstart', this._mousedown, false);
  };
  _mousedown = (e) => {
    if (e.target.dataset.drag === 'false') return;
    //if (e.button !== 0) return
    e.stopPropagation();
    e.preventDefault();
    let point = e.touches ? e.touches[0] : e;
    this.lastX = point.pageX;
    this.lastY = point.pageY;
    let rect = this.container.getBoundingClientRect();
    this.pointX = point.pageX - rect.left;
    this.pointY = point.pageY - rect.top;
    this.rect = {
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
    };
    document.addEventListener('mousemove', this._mousemove, false);
    document.addEventListener('touchmove', this._mousemove, false);
    document.addEventListener('mouseup', this._mouseup, false);
    document.addEventListener('touchend', this._mouseup, false);
    const { onDragStart } = this.options;
    onDragStart &&
      onDragStart(
        {
          mouseX: point.pageX,
          mouseY: point.pageY,
          pointX: this.pointX,
          pointY: this.pointY,
        },
        point
      );
  };
  _mousemove = (e) => {
    e.stopPropagation();
    e.preventDefault();
    let point = e.touches ? e.touches[0] : e;
    if (e.touches && e.touches.length > 1) {
      // TODO Rotat Scale
    }
    this.mouseX = point.pageX;
    this.mouseY = point.pageY;
    let deltaX = this.mouseX - this.lastX;
    let deltaY = this.mouseY - this.lastY;
    let scale = getScreeTransform().scale;
    this.deltaX = deltaX / scale;
    this.deltaY = deltaY / scale;
    this.positionX += this.deltaX;
    this.positionY += this.deltaY;
    const coords = {
      pointX: point.pageX - this.rect.x,
      pointY: point.pageY - this.rect.y,
      mouseX: point.pageX,
      mouseY: point.pageY,
      x: this.positionX,
      y: this.positionY,
      deltaX: this.deltaX,
      deltaY: this.deltaY,
      realDeltaX: deltaX,
      realDeltaY: deltaY,
    };
    const { onDragMove } = this.options;
    //  限制在容器内部
    if (this.options.pointLimit) {
      if (coords.pointX < 0) coords.pointX = 0;
      else if (coords.pointX > this.rect.width) coords.pointX = this.rect.width;
      if (coords.pointY < 0) coords.pointY = 0;
      else if (coords.pointY > this.rect.height) coords.pointY = this.rect.height;
    }
    onDragMove && onDragMove(coords, point);
    this.lastX = this.mouseX;
    this.lastY = this.mouseY;
  };
  _mouseup = (e) => {
    document.removeEventListener('mousemove', this._mousemove, false);
    document.removeEventListener('touchmove', this._mousemove, false);
    document.removeEventListener('mouseup', this._mouseup, false);
    document.removeEventListener('touchend', this._mouseup, false);
    const { onDragEnd } = this.options;
    onDragEnd && onDragEnd();
  };
}
