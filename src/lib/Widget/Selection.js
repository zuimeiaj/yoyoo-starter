/**
 *  created by yaojun on 2018/12/1
 *
 */
import React from 'react';
import Draggable from '../Draggable';
import PropTypes from 'prop-types';
import Event from '../Base/Event';
import { component_drag_autoscroll, context_hide_color_picker, editor_scroll_change, selection_change, selection_start, selection_update } from '../util/actions';
import { getScreeTransform } from '../global';
import './Selection.scss';

export default class Selection extends React.Component {
  static propTypes = {
    containerId: PropTypes.string.isRequired,
  };

  // 框选状态：_selecting 期间画布平移（滚轮/空格拖拽/自动滚动）时补偿选区锚点，
  // 使选区与内容保持对齐（与 ViewController._handleScrollDuringDrag 同模型）
  _selecting = false;
  _lastMouse = null;
  _offsetX = 0; // 画布平移补偿（screen px）：锚点角随内容移动
  _offsetY = 0;

  componentDidMount() {
    this.rect = {}; // x,y,width,height
    this.show(false);
    let containerId = this.props.containerId;
    let container = document.querySelector(`#${containerId}`);
    this._container = container;
    Event.listen(editor_scroll_change, this.handleScrollDuringSelect);
    new Draggable(container, {
      onDragStart: ({ pointX, pointY }, e) => {
        this.x = 0;
        this.y = 0;
        this._offsetX = 0;
        this._offsetY = 0;
        this._selecting = true;
        this._lastMouse = { mouseX: e.pageX, mouseY: e.pageY };
        this.pointX = pointX;
        this.pointY = pointY;
        this.show(true);
        this.setTransform(pointX, pointY, 0, 0);
        Event.dispatch(selection_start);
      },
      onDragMove: ({ realDeltaX, realDeltaY, mouseX, mouseY }) => {
        this.x += realDeltaX;
        this.y += realDeltaY;
        this._lastMouse = { mouseX, mouseY };
        this.applyRect();
        this._detectAutoScroll(mouseX, mouseY);
      },
      onDragEnd: () => {
        Event.dispatch(context_hide_color_picker);
        //  停止边缘自动滚动 + 结束框选状态（画布平移不再补偿）
        Event.dispatch(component_drag_autoscroll, { speedX: 0, speedY: 0 });
        this._selecting = false;
        this._lastMouse = null;
        //  需要根据当前缩放来选择
        let s = getScreeTransform().scale;
        Event.dispatch(selection_change, {
          x: this.rect.x / s,
          y: this.rect.y / s,
          width: this.rect.width / s,
          height: this.rect.height / s,
        });
        this.show(false);
      },
    });
  }

  componentWillUnmount() {
    Event.destroy(editor_scroll_change, this.handleScrollDuringSelect);
    Event.dispatch(component_drag_autoscroll, { speedX: 0, speedY: 0 });
  }

  /**
   * 按"内容锚点（起始点 + 平移补偿）+ 当前鼠标"重建选区矩形并派发实时预览。
   * 锚点角随内容平移移动（补偿量 = -panDelta×scale），鼠标角固定不动 ——
   * 命中判定（_handleSelectionWithType 里组件坐标随 pan 变化）才能与选区对齐
   */
  applyRect = () => {
    let startX = this.pointX + this._offsetX;
    let startY = this.pointY + this._offsetY;
    let curX = this.pointX + this.x;
    let curY = this.pointY + this.y;
    let x = Math.min(startX, curX);
    let y = Math.min(startY, curY);
    let width = Math.abs(curX - startX);
    let height = Math.abs(curY - startY);
    this.setTransform(x, y, width, height);
    let s = getScreeTransform().scale;
    Event.dispatch(selection_update, {
      x: x / s,
      y: y / s,
      width: width / s,
      height: height / s,
    });
  };

  /**
   * 框选过程中画布平移（滚轮/空格拖拽/自动滚动）时补偿选区：
   * 锚点随内容移动，选区与内容保持对齐，并派发实时预览
   */
  handleScrollDuringSelect = ({ panDeltaX, panDeltaY }) => {
    if (!this._selecting) return;
    if (!panDeltaX && !panDeltaY) return;
    let scale = getScreeTransform().scale;
    this._offsetX -= panDeltaX * scale;
    this._offsetY -= panDeltaY * scale;
    this.applyRect();
    // 持续边缘检测：鼠标静止在边缘不动时没有 mousemove，靠这里维持自动滚动
    if (this._lastMouse) {
      this._detectAutoScroll(this._lastMouse.mouseX, this._lastMouse.mouseY);
    }
  };

  /**
   * 框选时鼠标靠近视口边缘 → 画布自动滚动（与组件拖拽共用 component_drag_autoscroll 机制，
   * EditorScrollbar RAF 循环滚动 → editor_scroll_change → handleScrollDuringSelect 补偿）。
   * 视口边界实时测量（#layout-editor-view）：框选开始会取消选中 → 右侧属性面板消失 →
   * 编辑器视口宽度变化，静态 config.editorDomRect（固定右 260px）会失效（曾踩坑：边界不滚动）
   */
  _detectAutoScroll = (mouseX, mouseY) => {
    if (!this._selecting) return;
    let vp = this._container ? this._container.getBoundingClientRect() : null;
    if (!vp || !vp.width) return;
    const EDGE_THRESHOLD = 55;
    const MAX_SPEED = 600; // screen px/s

    const calcAxisSpeed = (pos, edgeStart, edgeEnd, threshold, maxSpeed) => {
      const distStart = pos - edgeStart;
      if (distStart >= 0 && distStart < threshold) {
        return -maxSpeed * (1 - distStart / threshold);
      }
      const distEnd = edgeEnd - pos;
      if (distEnd >= 0 && distEnd < threshold) {
        return maxSpeed * (1 - distEnd / threshold);
      }
      return 0;
    };

    const speedX = calcAxisSpeed(mouseX, vp.left, vp.right, EDGE_THRESHOLD, MAX_SPEED);
    const speedY = calcAxisSpeed(mouseY, vp.top, vp.bottom, EDGE_THRESHOLD, MAX_SPEED);
    Event.dispatch(component_drag_autoscroll, { speedX, speedY });
  };

  show = (visible) => {
    this.refs.selection.style.display = visible ? 'block' : 'none';
  };
  setTransform = (x, y, width, height) => {
    let style = this.refs.selection.style;
    this.rect = {
      x,
      y,
      width,
      height,
    };
    style.top = y + 'px';
    style.left = x + 'px';
    style.width = width + 'px';
    style.height = height + 'px';
  };

  render() {
    return <div ref={'selection'} className={'aj-selection-rect'}></div>;
  }
}
