/**
 *  created by yaojun on 2026/8/4
 *  画笔工具：按住鼠标自由手绘，轨迹渲染成变宽笔触（速度越快越细、头尾笔锋）后生成 Path 组件。
 *  与 PenTool 共用遮罩交互模型：激活时遮罩覆盖整个编辑器画布，原生监听处理全部绘制。
 *  笔触实现：按采样点沿法线方向按笔宽偏移，生成上下两条轮廓线合并为闭合多边形填充
 *  （手写签名/毛笔效果的通用做法），头尾按 TAPER 个点渐细成笔锋。
 *  交互：按住画一笔，松手生成一个 Path 组件（保持画笔模式可连续画）；Esc 取消当前笔触/退出模式。
 */
import React from 'react';
import Event from '../Base/Event';
import { buildPathD, uuid, activeAfterMounting } from '../util/helper';
import { initialCoverageIndex, pointToWorkspaceCoords, getScreeTransform, getBrushToolMode, setBrushToolMode } from '../global';
import { setFirstResponder } from '../global/instance';
import config from '../util/preference';
import { Path } from '../properties/base';
import {
  brush_tool_active,
  brush_tool_close,
  pen_tool_close,
  controllers_append,
  editor_scroll_change,
  canvas_draggable,
  component_picker_mode,
} from '../util/actions';
import './BrushTool.scss';

const BRUSH_COLOR = 'rgba(0,0,0,0.9)'; // 画笔默认颜色（生成 Path 的填充色）
const PREVIEW_COLOR = 'rgba(0,0,0,0.4)'; // 绘制中预览色（半透明）
const MIN_WIDTH = 1; // 最细笔宽（速度最快时）
const MAX_WIDTH = 10; // 最粗笔宽（速度最慢时）
const SPEED_REF = 2.5; // px/ms：超过该速度笔宽收敛到 MIN_WIDTH
const TAPER = 6; // 头尾笔锋渐细点数
const MIN_DIST = 2; // 采样最小间距（工作区 px，过密轮廓易自交、过疏不平滑）
const SPEED_SMOOTH = 0.35; // 速度低通滤波系数（防宽度抖动）

export default class BrushTool extends React.Component {
  constructor(props) {
    super(props);
    this._active = false;
    this._drawing = false; // 是否按住绘制中
    this._raw = []; // 原始轨迹采样 {x,y,t,w}（t=performance.now, w=该点笔宽）
    this._outline = []; // 当前笔触轮廓多边形（预览渲染用）
    this._smoothSpeed = null; // 速度低通滤波状态
    this._fixedWidth = null; // 固定笔宽（null = 自动：随速度变宽）
    this._matrix = 'matrix(1,0,0,1,0,0)';
    this._originX = 0;
    this._originY = 0;
  }

  componentWillMount() {
    Event.listen(brush_tool_active, this._onActive);
    Event.listen(brush_tool_close, this._onClose);
    Event.listen(editor_scroll_change, this._handleScrollChange);
    // 其他工具/平移模式激活时自动退出画笔
    Event.listen(canvas_draggable, this._onOtherTool);
    Event.listen(component_picker_mode, this._onOtherTool);
  }

  componentDidMount() {
    let mask = this.refs.mask;
    mask.addEventListener('mousedown', this._handleMouseDown, true);
    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);
    document.addEventListener('keydown', this._handleKeyDown, true);
    let { x, y, scale } = getScreeTransform();
    this._matrix = `matrix(${scale},0,0,${scale},${-x * scale},${-y * scale})`;
    this._originX = config.originCoords.x;
    this._originY = config.originCoords.y;
  }

  componentWillUnmount() {
    Event.destroy(brush_tool_active, this._onActive);
    Event.destroy(brush_tool_close, this._onClose);
    Event.destroy(editor_scroll_change, this._handleScrollChange);
    Event.destroy(canvas_draggable, this._onOtherTool);
    Event.destroy(component_picker_mode, this._onOtherTool);
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
    document.removeEventListener('keydown', this._handleKeyDown, true);
    setBrushToolMode(false); // 兜底复位光标
  }

  // ==================== 模式 ====================

  _onActive = () => {
    if (this._active) return; // 防重入
    Event.dispatch(pen_tool_close); // 互斥：关闭钢笔模式（未激活时 PenTool 内部防重入直接返回）
    setFirstResponder(null); // 清选中 → component_inactive → 自动 blur 任何编辑中的编辑器
    setBrushToolMode(true);
    this._reset();
    this._active = true;
    Event.dispatch(brush_tool_active); // 通知按钮组切换到画笔
    this.forceUpdate();
  };

  _onClose = () => {
    if (!this._active && !getBrushToolMode()) return; // 防重入
    setBrushToolMode(false);
    this._reset();
    this._active = false;
    Event.dispatch(brush_tool_close); // 通知按钮组切回设计（Esc/其他工具切换等退出路径同步）
    this.forceUpdate();
  };

  _onOtherTool = () => {
    if (getBrushToolMode()) this._onClose();
  };

  _handleScrollChange = ({ x, y, scale, isScale }) => {
    this._matrix = `matrix(${scale},0,0,${scale},${-x * scale},${-y * scale})`;
    if (isScale) {
      this._originX = config.originCoords.x * scale;
      this._originY = config.originCoords.y * scale;
    }
    this.forceUpdate();
  };

  // ==================== 绘制状态机 ====================

  _handleMouseDown = (e) => {
    if (!getBrushToolMode()) return;
    if (e.button !== 0) return;
    // 粗细选择器点击放行（不阻断冒泡，让 React onClick 生效），不开始绘制
    if (e.target.closest('.brush-tool-width')) return;
    e.stopPropagation();
    e.preventDefault();
    let p = pointToWorkspaceCoords(e);
    this._drawing = true;
    this._raw = [{ x: p.x, y: p.y, t: performance.now(), w: MAX_WIDTH }];
    this._smoothSpeed = null;
    this._outline = [];
    this.forceUpdate();
  };

  _handleMouseMove = (e) => {
    if (!getBrushToolMode()) return;
    let p = pointToWorkspaceCoords(e);
    if (this._drawing) {
      let last = this._raw[this._raw.length - 1];
      let dist = Math.hypot(p.x - last.x, p.y - last.y);
      if (dist >= MIN_DIST) {
        let now = performance.now();
        let dt = Math.max(1, now - last.t);
        let speed = dist / dt; // px/ms，越快越细
        this._smoothSpeed = this._smoothSpeed == null ? speed : this._smoothSpeed + (speed - this._smoothSpeed) * SPEED_SMOOTH;
        // 固定粗细模式：用户选择的宽度恒定；否则按速度变宽
        let w = this._fixedWidth != null ? this._fixedWidth : MAX_WIDTH - (this._smoothSpeed / SPEED_REF) * (MAX_WIDTH - MIN_WIDTH);
        this._raw.push({ x: p.x, y: p.y, t: now, w: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w)) });
        // 实时预览：头部笔锋（已画部分保持稳定），尾部保持当前宽度
        this._outline = this._buildOutline(this._taperHead(this._raw));
        this.forceUpdate();
      }
    }
  };

  _handleMouseUp = () => {
    if (!getBrushToolMode() || !this._drawing) return;
    this._drawing = false;
    if (this._raw.length >= 3) {
      // 收笔：头尾都渐细成笔锋，轮廓固定后生成 Path 组件
      let outline = this._buildOutline(this._taperAll(this._raw));
      let view = this._generateView(outline);
      if (view) {
        Event.dispatch(controllers_append, view);
        activeAfterMounting(view); // 生成后自动选中
      }
    }
    this._reset();
    this.forceUpdate();
  };

  _handleKeyDown = (e) => {
    if (!getBrushToolMode()) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      if (this._drawing || this._raw.length) {
        this._reset(); // 丢弃当前笔触，保持画笔模式
      } else {
        this._onClose(); // 空闲退出画笔模式
      }
    }
  };

  _reset = () => {
    this._drawing = false;
    this._raw = [];
    this._outline = [];
    this._smoothSpeed = null;
    this.forceUpdate();
  };

  _setWidth = (w) => {
    this._fixedWidth = w;
    this.forceUpdate();
  };

  // ==================== 笔触算法 ====================

  // 头部笔锋：前 TAPER 个点宽度从 0 线性渐增（起点成尖点）
  _taperHead(raw) {
    let n = raw.length;
    return raw.map((r, i) => {
      let w = r.w;
      if (i < TAPER && i < n) w *= i / TAPER;
      return { x: r.x, y: r.y, w };
    });
  }

  // 收笔：头尾都渐细成笔锋
  _taperAll(raw) {
    let n = raw.length;
    return raw.map((r, i) => {
      let w = r.w;
      let t = Math.min(TAPER, n);
      if (i < t) w *= i / t;
      else if (n - 1 - i < t) w *= (n - 1 - i) / t;
      return { x: r.x, y: r.y, w };
    });
  }

  // 沿轨迹法线按笔宽偏移，生成上下轮廓合并的闭合多边形
  // 点太密/急弯处上下轮廓可能自交（视觉小瑕疵），用平滑宽度与 2px 采样缓解
  _buildOutline(raw) {
    let n = raw.length;
    if (n < 2) return [];
    let upper = [];
    let lower = [];
    for (let i = 0; i < n; i++) {
      let p0 = raw[Math.max(0, i - 1)];
      let p1 = raw[Math.min(n - 1, i + 1)];
      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      let len = Math.hypot(dx, dy);
      let nx, ny;
      if (len < 1e-6) {
        nx = 0;
        ny = 1;
      } else {
        nx = -dy / len;
        ny = dx / len;
      }
      let w2 = raw[i].w / 2;
      upper.push({ x: raw[i].x + nx * w2, y: raw[i].y + ny * w2 });
      lower.push({ x: raw[i].x - nx * w2, y: raw[i].y - ny * w2 });
    }
    return upper.concat(lower.reverse());
  }

  // ==================== 生成 Path 组件 ====================

  _generateView(outline) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    outline.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    if (!isFinite(minX)) return null;
    let view = new Path();
    let pad = 1;
    view.id = uuid('sb_');
    view.zIndex = initialCoverageIndex();
    view.transform = Object.assign({}, view.transform, {
      x: Math.round(minX) - pad,
      y: Math.round(minY) - pad,
      width: Math.max(4, Math.round(maxX - minX) + pad * 2),
      height: Math.max(4, Math.round(maxY - minY) + pad * 2),
      rotation: 0,
    });
    // 笔触是填充色块：不描边，用 bg 填充闭合轮廓
    view.border.width = 'none';
    view.bg = BRUSH_COLOR;
    view.path = {
      points: outline.map((p) => ({
        x: Math.round(p.x - minX + pad),
        y: Math.round(p.y - minY + pad),
        inX: 0,
        inY: 0,
        outX: 0,
        outY: 0,
      })),
      closed: true,
    };
    return view;
  }

  // ==================== 预览渲染 ====================

  render() {
    let show = this._active;
    let preview = null;
    if (show && this._outline.length) {
      let d = buildPathD(this._outline, true);
      preview = (
        <div style={{ position: 'absolute', left: this._originX, top: this._originY }}>
          <div style={{ transform: this._matrix, transformOrigin: '0 0' }}>
            <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} pointerEvents={'none'}>
              <path d={d} fill={PREVIEW_COLOR} stroke={'none'} />
            </svg>
          </div>
        </div>
      );
    }
    return (
      <div ref={'mask'} data-event="ignore" className={'brush-tool-mask'} style={{ display: show ? 'block' : 'none' }}>
        {preview}
        {show ? (
          <div className={'brush-tool-width'}>
            <span className={`brush-tool-width-btn ${this._fixedWidth == null ? 'active' : ''}`} onClick={() => this._setWidth(null)}>
              自动
            </span>
            {[1, 3, 6, 10].map((w) => (
              <span key={w} className={`brush-tool-width-btn ${this._fixedWidth === w ? 'active' : ''}`} onClick={() => this._setWidth(w)}>
                {w}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
}
