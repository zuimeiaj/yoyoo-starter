/**
 *  created by yaojun on 2026/8/4
 *  钢笔工具：激活时渲染遮罩覆盖整个编辑器画布，挡住所有编辑器事件（Selection/组件 Draggable 全部收不到），
 *  绘制逻辑全部在遮罩自身的原生 DOM 监听上。
 *  交互（经典钢笔）：单击放锚点；按住拖动拉出对称贝塞尔手柄；双击或 Enter 结束生成 path 组件；Esc 取消。
 */
import React from 'react';
import Event from '../Base/Event';
import { buildPathD, uuid, activeAfterMounting } from '../util/helper';
import { initialCoverageIndex, pointToWorkspaceCoords, getScreeTransform, getPenToolMode, setPenToolMode } from '../global';
import { setFirstResponder } from '../global/instance';
import config from '../util/preference';
import { Path } from '../properties/base';
import {
  pen_tool_active,
  pen_tool_close,
  pen_tool_toggle,
  controllers_append,
  editor_scroll_change,
  canvas_draggable,
  component_picker_mode,
} from '../util/actions';
import './PenTool.scss';

const PREVIEW_COLOR = 'rgba(33,150,243,1)';
const CLICK_THRESHOLD = 5; // 屏幕像素：按住移动超过才算拖动拉手柄，否则视为单击落点

export default class PenTool extends React.Component {
  constructor(props) {
    super(props);
    this._active = false;
    this._points = []; // 工作区坐标锚点 {x,y,inX,inY,outX,outY,arc}
    this._dragIndex = null;
    this._downClient = null;
    this._dragged = false; // 本次按下是否超过阈值（拖动拉手柄/画弧）
    this._mouse = null; // 最近一次鼠标工作区坐标（橡皮筋预览）
    this._matrix = 'matrix(1,0,0,1,0,0)';
    this._originX = 0;
    this._originY = 0;
  }

  componentWillMount() {
    Event.listen(pen_tool_active, this._onActive);
    Event.listen(pen_tool_close, this._onClose);
    Event.listen(pen_tool_toggle, this._onToggle);
    Event.listen(editor_scroll_change, this._handleScrollChange);
    // 其他工具/平移模式激活时自动退出钢笔
    Event.listen(canvas_draggable, this._onOtherTool);
    Event.listen(component_picker_mode, this._onOtherTool);
  }

  componentDidMount() {
    let mask = this.refs.mask;
    // capture 先于容器上 Selection 的 Draggable（冒泡）执行，stopPropagation 后框选/组件收不到
    mask.addEventListener('mousedown', this._handleMouseDown, true);
    mask.addEventListener('dblclick', this._handleDblClick, false);
    mask.addEventListener('contextmenu', this._handleContextMenu, false);
    mask.addEventListener('dragover', this._handleDragOver, false);
    mask.addEventListener('drop', this._handleDrop, false);
    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);
    document.addEventListener('keydown', this._handleKeyDown, true);
    let { x, y, scale } = getScreeTransform();
    this._matrix = `matrix(${scale},0,0,${scale},${-x * scale},${-y * scale})`;
    this._originX = config.originCoords.x;
    this._originY = config.originCoords.y;
  }

  componentWillUnmount() {
    Event.destroy(pen_tool_active, this._onActive);
    Event.destroy(pen_tool_close, this._onClose);
    Event.destroy(pen_tool_toggle, this._onToggle);
    Event.destroy(editor_scroll_change, this._handleScrollChange);
    Event.destroy(canvas_draggable, this._onOtherTool);
    Event.destroy(component_picker_mode, this._onOtherTool);
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
    document.removeEventListener('keydown', this._handleKeyDown, true);
    setPenToolMode(false); // 兜底复位光标
  }

  // ==================== 模式 ====================

  _onActive = () => {
    if (this._active) return; // 防重入：dispatch(pen_tool_active) 会回调自身
    setPenToolMode(true);
    setFirstResponder(null); // 清选中 → component_inactive → 自动 blur 任何编辑中的编辑器
    this._reset();
    this._active = true;
    Event.dispatch(pen_tool_active); // 通知按钮组切换到钢笔
    this.forceUpdate();
  };

  _onClose = () => {
    if (!this._active && !getPenToolMode()) return; // 防重入：dispatch(pen_tool_close) 会回调自身
    setPenToolMode(false);
    this._reset();
    this._active = false;
    Event.dispatch(pen_tool_close); // 通知按钮组切回设计（双击完成/Esc/空格平移等退出路径同步）
    this.forceUpdate();
  };

  _onToggle = () => {
    if (getPenToolMode()) {
      this._onClose();
    } else {
      this._onActive();
    }
  };

  _onOtherTool = () => {
    if (getPenToolMode()) this._onClose();
  };

  _handleScrollChange = ({ x, y, scale, isScale }) => {
    this._matrix = `matrix(${scale},0,0,${scale},${-x * scale},${-y * scale})`;
    if (isScale) {
      // 与 Stage.js handleScrollChange 一致：缩放后外层原点跟随
      this._originX = config.originCoords.x * scale;
      this._originY = config.originCoords.y * scale;
    }
    this.forceUpdate();
  };

  // ==================== 绘制状态机 ====================

  _handleMouseDown = (e) => {
    if (!getPenToolMode()) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    let p = pointToWorkspaceCoords(e);
    // 单击落点：完全干净（无任何手柄）——段为直线；曲线只由拖动拉出的对称手柄产生
    this._points.push({ x: p.x, y: p.y, inX: 0, inY: 0, outX: 0, outY: 0 });
    this._dragIndex = this._points.length - 1;
    this._downClient = { x: e.clientX, y: e.clientY };
    this._dragged = false;
    this.forceUpdate();
  };

  _handleMouseMove = (e) => {
    if (!getPenToolMode()) return;
    let p = pointToWorkspaceCoords(e);
    this._mouse = { x: p.x, y: p.y };
    if (this._dragIndex != null && this._downClient) {
      // 超过阈值才生效，纯单击保持直线段
      if (Math.abs(e.clientX - this._downClient.x) + Math.abs(e.clientY - this._downClient.y) >= CLICK_THRESHOLD) {
        this._dragged = true;
        let pt = this._points[this._dragIndex];
        if (e.altKey && this._dragIndex > 0) {
          // Alt 画弧（实时读取 altKey，拖动中途按/松 Alt 立即切换）：
          // 拱高 = 鼠标到上一锚点弦的带符号垂直距离（buildArcSegment 用）
          let prev = this._points[this._dragIndex - 1];
          let dx = pt.x - prev.x;
          let dy = pt.y - prev.y;
          let d = Math.hypot(dx, dy);
          if (d) {
            let nx = -dy / d;
            let ny = dx / d;
            let midX = (prev.x + pt.x) / 2;
            let midY = (prev.y + pt.y) / 2;
            pt.arc = (p.x - midX) * nx + (p.y - midY) * ny;
          }
          pt.outX = 0; // 弧段锚点不留贝塞尔手柄残留
          pt.outY = 0;
          pt.inX = 0;
          pt.inY = 0;
        } else {
          // 普通锚点：拉对称贝塞尔手柄（同时清除弧模式）
          pt.arc = null;
          pt.outX = p.x - pt.x;
          pt.outY = p.y - pt.y;
          pt.inX = -pt.outX;
          pt.inY = -pt.outY;
        }
      }
    }
    if (this._points.length) this.forceUpdate();
  };

  _handleMouseUp = () => {
    // 松开收尾：拖动拉出的手柄已落在锚点数据里（固定不动），这里只清空拖拽状态；
    // 单击落点无手柄 → 直线段固定。之后移动鼠标仅触发橡皮筋预览，不再改数据
    this._dragIndex = null;
    this._downClient = null;
    this._dragged = false;
    this.forceUpdate(); // 松手后立即隐藏控制点（否则拖动中的手柄残留显示）
  };

  _handleDblClick = (e) => {
    if (!getPenToolMode()) return;
    e.stopPropagation();
    e.preventDefault();
    let pts = this._points;
    // 双击的第二击会在同一位置多落一个锚点：与上一锚点 < 5px 则弹出
    if (pts.length >= 2) {
      let a = pts[pts.length - 1];
      let b = pts[pts.length - 2];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 5) pts.pop();
    }
    if (pts.length >= 2) {
      this._finish();
    } else {
      this._reset();
    }
  };

  _handleContextMenu = (e) => {
    if (!getPenToolMode()) return;
    e.preventDefault();
    e.stopPropagation();
  };

  _handleDragOver = (e) => {
    if (!getPenToolMode()) return;
    e.preventDefault();
    e.stopPropagation();
  };

  _handleDrop = (e) => {
    if (!getPenToolMode()) return;
    e.preventDefault();
    e.stopPropagation();
  };

  _handleKeyDown = (e) => {
    if (!getPenToolMode()) return;
    let drawing = this._points.length > 0;
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      if (drawing) {
        this._reset(); // 取消本次绘制，保持钢笔模式
      } else {
        this._onClose(); // 空闲退出钢笔模式
      }
    } else if (e.key === 'Enter' && drawing) {
      e.stopPropagation();
      e.preventDefault();
      this._finish();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && drawing) {
      // 经典钢笔回退：弹出最后一个锚点
      e.stopPropagation();
      e.preventDefault();
      this._points.pop();
      this._dragIndex = null;
      this._downClient = null;
      this._dragged = false;
      this.forceUpdate();
    }
  };

  _reset = () => {
    this._points = [];
    this._dragIndex = null;
    this._downClient = null;
    this._dragged = false;
    this.forceUpdate();
  };

  _finish() {
    let view = this._generateView();
    if (view) {
      Event.dispatch(controllers_append, view);
      activeAfterMounting(view); // 生成后自动选中新组件
    }
    this._onClose(); // 绘制完成自动退出钢笔模式
  }

  _generateView() {
    let pts = this._points;
    if (!pts.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    pts.forEach((p) => {
      minX = Math.min(minX, p.x, p.x + p.inX, p.x + p.outX);
      maxX = Math.max(maxX, p.x, p.x + p.inX, p.x + p.outX);
      minY = Math.min(minY, p.y, p.y + p.inY, p.y + p.outY);
      maxY = Math.max(maxY, p.y, p.y + p.inY, p.y + p.outY);
    });
    let view = new Path();
    let sw = view.border.width === 'none' ? 0 : view.border.width || 0;
    // 描边不被裁剪的最小 padding
    let pad = Math.max(2, Math.ceil(sw / 2) + 1);
    view.id = uuid('sb_');
    view.zIndex = initialCoverageIndex();
    view.transform = Object.assign({}, view.transform, {
      x: Math.round(minX) - pad,
      y: Math.round(minY) - pad,
      width: Math.max(4, Math.round(maxX - minX) + pad * 2),
      height: Math.max(4, Math.round(maxY - minY) + pad * 2),
      rotation: 0,
    });
    view.path = {
      points: pts.map((p) => ({
        x: Math.round(p.x - minX + pad),
        y: Math.round(p.y - minY + pad),
        inX: Math.round(p.inX),
        inY: Math.round(p.inY),
        outX: Math.round(p.outX),
        outY: Math.round(p.outY),
        // 圆弧段：带符号拱高（undefined 时为贝塞尔段，序列化自动忽略）
        arc: p.arc,
      })),
      closed: false,
    };
    return view;
  }

  // ==================== 预览渲染 ====================

  render() {
    let show = this._active;
    let preview = null;
    if (show && this._points.length) {
      // 已固定路径（实线）——悬停预览不再写回锚点数据，固定曲线保持原样
      let d = buildPathD(this._points, false);
      // 橡皮筋预览（虚线/半透明，未按下时从最后一个锚点连到鼠标）。
      // 用虚拟副本计算，不改已固定锚点数据：上一锚点有拖出手柄 → 曲线延续切线；
      // 干净锚点 → 直线（与单击落点固定出的直线段一致，所见即所得）
      let rubber = null;
      let last = this._points[this._points.length - 1];
      if (this._dragIndex == null && this._mouse) {
        let lastV = { ...last, inX: 0, inY: 0 };
        let virtual = { x: this._mouse.x, y: this._mouse.y, inX: 0, inY: 0, outX: 0, outY: 0 };
        rubber = buildPathD([lastV, virtual], false);
      }
      preview = (
        <div style={{ position: 'absolute', left: this._originX, top: this._originY }}>
          <div style={{ transform: this._matrix, transformOrigin: '0 0' }}>
            <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} pointerEvents={'none'}>
              <path d={d} strokeWidth={2} fill={'none'} style={{ stroke: PREVIEW_COLOR }} />
              {rubber ? <path d={rubber} strokeWidth={2} strokeDasharray={'6 4'} fill={'none'} style={{ stroke: PREVIEW_COLOR, opacity: 0.6 }} /> : null}
              {this._points.map((p, i) => {
                // 控制点只在“按下并拖动超过阈值”的锚点显示（单击落点/固定段保持干净）
                let showHandles = this._dragged && i === this._dragIndex && !p.arc && (p.outX !== 0 || p.outY !== 0 || p.inX !== 0 || p.inY !== 0);
                return (
                  <g key={i}>
                    <circle r={4} fill={'#fff'} stroke={PREVIEW_COLOR} strokeWidth={2} cx={p.x} cy={p.y} />
                    {showHandles ? (
                      <g>
                        <line x1={p.x} y1={p.y} x2={p.x + p.outX} y2={p.y + p.outY} strokeWidth={1} strokeDasharray={'4 3'} style={{ stroke: PREVIEW_COLOR }} />
                        <line x1={p.x} y1={p.y} x2={p.x + p.inX} y2={p.y + p.inY} strokeWidth={1} strokeDasharray={'4 3'} style={{ stroke: PREVIEW_COLOR }} />
                        <circle r={3} fill={PREVIEW_COLOR} cx={p.x + p.outX} cy={p.y + p.outY} />
                        <circle r={3} fill={PREVIEW_COLOR} cx={p.x + p.inX} cy={p.y + p.inY} />
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      );
    }
    return (
      <div ref={'mask'} data-event="ignore" className={'pen-tool-mask'} style={{ display: show ? 'block' : 'none' }}>
        {preview}
      </div>
    );
  }
}
