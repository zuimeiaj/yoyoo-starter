/**
 *  created by yaojun on 2018/12/2
 *
 *  无限画布 — 去掉滚动条 UI 和范围限制，
 *  pan/zoom 逻辑直接内联，不再依赖 Scroller
 */
import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';
import Event from '../Base/Event';
import {
  canvas_dragging,
  component_drag_autoscroll,
  context_zoom_in,
  context_zoom_level,
  context_zoom_out,
  editor_scroll_change,
  window_size_change,
  workspace_scroll_center,
} from '../util/actions';
import { getZooms, isUndefined } from '../util/helper';
import config from '../util/preference';
import { getScreeTransform, setScreenTransform } from '../global';
import { getFirstResponder } from '../global/instance';

const TWEEN = require('@tweenjs/tween.js');

// 固定缩放比例
const _min = getZooms(11).slice(1).reverse();
const _max = getZooms(9, -1);
const zooms = _min.concat(_max);
const defaultLevelIndex = zooms.indexOf(1);
export const MAX_ZOOM_LEVEL = zooms.length - 1;
export const DEFAULT_ZOOM_LEVEL = defaultLevelIndex;

export default class EditorScrollbar extends PureComponent {
  static propTypes = {
    containerId: PropTypes.string.isRequired,
  };

  componentDidMount() {
    this.tween = null;
    this.scale = 1;

    // 初始 pan：让设计页面的中心显示在视口中央
    // positionX = viewportCenter + origin - editorCenter
    const editorCenterX = (window.innerWidth - (config.editorDomRect.left + config.editorDomRect.right)) / 2;
    const editorCenterY = (window.innerHeight - config.editorDomRect.top) / 2;
    this.positionX = config.viewport.width / 2 + config.originCoords.x - editorCenterX;
    this.positionY = config.viewport.height / 2 + config.originCoords.y - editorCenterY;
    this.isScale = false;
    this.maxScale = MAX_ZOOM_LEVEL;
    this.minScale = 0;
    this.level = DEFAULT_ZOOM_LEVEL;
    this.container = document.querySelector(`#${this.props.containerId}`);

    // 拖拽至边缘自动滚动
    this._autoscrollSpeedX = 0;
    this._autoscrollSpeedY = 0;
    this._autoscrollRAF = null;
    this._autoscrollLastTime = 0;

    this.container.addEventListener('mousewheel', this.handleWheel, false);
    this.container.addEventListener('DOMMouseScroll', this.handleWheel, false);
    Event.listen(window_size_change, this.handleSizeChange);
    Event.listen(context_zoom_in, this.zoomIn);
    Event.listen(context_zoom_out, this.zoomOut);
    Event.listen(workspace_scroll_center, this.handlePanToCenter);
    Event.listen(context_zoom_level, this.zoomWithLevel);
    Event.listen(canvas_dragging, this.handleCanvasDragging);
    Event.listen(component_drag_autoscroll, this.handleDragAutoscroll);

    // 初始同步：Stage 需要收到初始 pan 位置事件才能正确显示
    setTimeout(() => {
      this.scroll();
    }, 200);
  }

  componentWillUnmount() {
    Event.destroy(window_size_change, this.handleSizeChange);
    Event.destroy(workspace_scroll_center, this.handlePanToCenter);
    Event.destroy(context_zoom_in, this.zoomIn);
    Event.destroy(context_zoom_out, this.zoomOut);
    Event.destroy(context_zoom_level, this.zoomWithLevel);
    Event.destroy(canvas_dragging, this.handleCanvasDragging);
    Event.destroy(component_drag_autoscroll, this.handleDragAutoscroll);
    this._stopAutoscrollLoop();
    this.container.removeEventListener('mousewheel', this.handleWheel);
    this.container.removeEventListener('DOMMouseScroll', this.handleWheel);
  }

  // ========= 画布拖拽平移（空格+拖拽）=========
  handleCanvasDragging = ({ realDeltaX, realDeltaY, dragging }) => {
    if (!dragging) return;
    this.positionX += realDeltaX / this.scale;
    this.positionY += realDeltaY / this.scale;
    this.isScale = false;
    this.scroll();
  };

  // ========= 拖拽组件至边缘自动滚动 ==========
  handleDragAutoscroll = ({ speedX, speedY }) => {
    this._autoscrollSpeedX = speedX;
    this._autoscrollSpeedY = speedY;

    if (speedX !== 0 || speedY !== 0) {
      if (!this._autoscrollRAF) {
        this._autoscrollLastTime = performance.now();
        this._autoscrollRAF = requestAnimationFrame(this._autoscrollLoop);
      }
    } else {
      this._stopAutoscrollLoop();
    }
  };

  _autoscrollLoop = (time) => {
    if (!this._autoscrollRAF) return;

    const dt = Math.min(time - this._autoscrollLastTime, 100); // cap to avoid jumps on tab switch
    this._autoscrollLastTime = time;

    // screen px/s → workspace units/s (除以 scale 保持视觉速度一致)
    const panX = (this._autoscrollSpeedX / this.scale) * (dt / 1000);
    const panY = (this._autoscrollSpeedY / this.scale) * (dt / 1000);

    if (panX !== 0 || panY !== 0) {
      this.positionX += panX;
      this.positionY += panY;
      this.isScale = false;
      this.scroll();
    }

    if (this._autoscrollSpeedX !== 0 || this._autoscrollSpeedY !== 0) {
      this._autoscrollRAF = requestAnimationFrame(this._autoscrollLoop);
    } else {
      this._autoscrollRAF = null;
    }
  };

  _stopAutoscrollLoop = () => {
    if (this._autoscrollRAF) {
      cancelAnimationFrame(this._autoscrollRAF);
      this._autoscrollRAF = null;
    }
    this._autoscrollSpeedX = 0;
    this._autoscrollSpeedY = 0;
  };

  // ========= 滚轮平移 / 缩放 ==========
  handleWheel = (e) => {
    e.preventDefault();
    let deltaX = 0, deltaY = 0;
    if (!isUndefined(e.deltaX)) {
      deltaX = e.deltaX / this.scale;
      deltaY = e.deltaY / this.scale;
    } else {
      deltaY = -Math.max(-1, Math.min(1, e.wheelDelta || -e.detail));
    }

    // Cmd/Ctrl + 滚轮 → 缩放
    if (e.ctrlKey || e.metaKey) {
      if (deltaY < 0) this.level += 1;
      else if (deltaY > 0) this.level -= 1;
      this.applyZoom(e);
      return;
    }

    // 普通滚轮 → 平移
    this.positionX += deltaX;
    this.positionY += deltaY;
    this.isScale = false;
    this.scroll();
  };

  // ========= 缩放 ==========
  zoomIn = () => { this.level += 1; this.applyZoom(); };
  zoomOut = () => { this.level -= 1; this.applyZoom(); };
  zoomWithLevel = (level) => { this.level = level; this.applyZoom(); };

  applyZoom = (e) => {
    if (this.level >= this.maxScale) this.level = this.maxScale;
    if (this.level <= this.minScale) this.level = this.minScale;

    const newScale = zooms[this.level];
    const oldScale = this.scale;
    if (oldScale === 0 || oldScale === newScale) return;

    // 缩放至鼠标：鼠标下的 workspace 坐标在缩放前后不变
    // 推导：div[w] 在缩放时从 origin*oldScale 移到 origin*newScale，
    // 所以 origin 在公式中会被抵消。正确的屏幕偏移只用到 editorDomRect.left/top
    const mouseX = (e && e.pageX != null) ? e.pageX : window.innerWidth / 2;
    const mouseY = (e && e.pageY != null) ? e.pageY : window.innerHeight / 2;
    const screenX = mouseX - config.editorDomRect.left;
    const screenY = mouseY - config.editorDomRect.top;

    this.positionX += screenX * (1 / oldScale - 1 / newScale);
    this.positionY += screenY * (1 / oldScale - 1 / newScale);
    this.scale = newScale;
    this.isScale = true;
    this.scroll();
  };

  // ========= 居中 ==========
  handlePanToCenter = () => {
    if (this.tween) TWEEN.remove(this.tween); // 动画中再次点击：停掉旧动画重新居中（否则点击无反应）

    const halfW = (window.innerWidth - (config.editorDomRect.left + config.editorDomRect.right)) / 2;
    const halfH = (window.innerHeight - config.editorDomRect.top) / 2;

    // 目标 workspace 坐标（选中组件中心或设计页面中心）
    let targetX = config.viewport.width / 2, targetY = config.viewport.height / 2;
    const responder = getFirstResponder();
    if (responder) {
      // 用 getOffsetRect（绝对坐标）：properties.transform 是父级相对坐标，嵌套组件会居中错位
      const t = responder.getOffsetRect();
      targetX = t.x + t.width / 2;
      targetY = t.y + t.height / 2;
    }

    // 使 target 显示在视口中心所需的新 pan
    // 屏幕位置 = (originCoords + workspace - pan) * scale（w 容器定位在 originCoords*scale），
    // 故 originCoords 不能除以 scale —— 旧公式 (halfW - originCoords)/scale 缩放后偏差 originCoords*(1-1/scale)
    const targetPosX = targetX + config.originCoords.x - halfW / this.scale;
    const targetPosY = targetY + config.originCoords.y - halfH / this.scale;

    const startX = this.positionX;
    const startY = this.positionY;

    const self = this;
    function animate(time) {
      if (!self.tween) return;
      requestAnimationFrame(animate);
      TWEEN.update(time);
    }
    requestAnimationFrame(animate);

    const coords = { x: startX, y: startY };
    const tween = new TWEEN.Tween(coords)
      .to({ x: targetPosX, y: targetPosY }, 300)
      .onUpdate(() => {
        this.positionX = coords.x;
        this.positionY = coords.y;
        this.scroll();
      })
      .onComplete(() => { this.tween = null; });
    tween.start();
    this.tween = tween;
  };

  handleSizeChange = () => {
    // 窗口大小变化时不需要更新滚动条
  };

  // ========= 触发全局状态更新 ==========
  scroll = () => {
    // 计算本次滚动的平移增量，用于拖拽时保持组件跟随鼠标
    const prevX = this._prevPanX != null ? this._prevPanX : this.positionX;
    const prevY = this._prevPanY != null ? this._prevPanY : this.positionY;
    const panDeltaX = this.positionX - prevX;
    const panDeltaY = this.positionY - prevY;
    this._prevPanX = this.positionX;
    this._prevPanY = this.positionY;

    Event.dispatch(editor_scroll_change, {
      isScale: this.isScale,
      x: this.positionX,
      y: this.positionY,
      scale: this.scale,
      level: this.level,
      maxLevel: this.maxScale,
      panDeltaX,
      panDeltaY,
    });
    setScreenTransform(this.positionX, this.positionY, this.scale, this.level);
  };

  render() {
    return <Fragment />;
  }
}
