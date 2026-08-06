/**
 *  created by yaojun on 2026/8/5
 *
 *  连线锚点与拖线交互（仅编辑器使用，预览只读）：
 *  - 设计模式：选中组件四边中点显示锚点（已连接为实心）
 *  - 连线模式（顶部「连线」工具）：所有组件显示锚点，无需选中即可连线，设计/拖拽功能不受影响
 *  - 按住锚点拖动：跟随鼠标渲染虚线（贝塞尔/直角随当前线段样式），悬停其他组件锚点（12px 内）高亮并吸附
 *  - 松开：在目标锚点上 → 新建/重连；拖回自身同锚点 → 取消
 *  - 轻点（移动 < 4px）已连接锚点 → 断开该锚点的全部连线
 *  - 数据变更走 component_properties_change（可撤销/持久化），坐标实时计算无需同步
 */
import React from 'react';
import Event from '../Base/Event';
import {
  component_drag,
  component_dragend,
  component_inactive,
  component_properties_change,
  component_resize_end,
  controllers_change,
  link_remove_anchor,
  link_tool_active,
  link_tool_close,
} from '../util/actions';
import { pointToWorkspaceCoords } from '../global';
import { uuid } from '../util/helper';
import { ANCHOR_OFFSET, ANCHORS, absolutePos, anchorPoint, cornerPath, linkArrowPath, linkPath } from './LinkLayer';

// 命中阈值：鼠标距离目标锚点的最大像素（画布坐标）。
// 12 太紧：快速拖线（mousemove 间隔大）容易滑过锚点导致 hover 未命中、松手不建立连接
const HIT_DIST = 16;

export default class LinkAnchors extends React.Component {
  state = {
    dragging: false, // 用户拖动组件中（component_drag from Draggable），锚点隐藏
    tick: 0, // 强制刷新计数（transform/connections 变化时重新渲染锚点）
    drag: null, // { fromId, fromAnchor, start, mouse, hover }
    linkMode: false, // 连线模式：所有组件显示锚点
    allAnchors: [], // 连线模式下所有组件锚点列表 [{ id, anchor, x, y, linked }]
  };

  componentWillMount() {
    Event.listen(component_inactive, this.handleInactive);
    Event.listen(component_drag, this.handleDrag);
    Event.listen(component_dragend, this.handleDragEnd);
    Event.listen(component_resize_end, this.refresh);
    Event.listen(component_properties_change, this.refresh);
    Event.listen(controllers_change, this.handleControllers);
    Event.listen(link_tool_active, this.handleToolActive);
    Event.listen(link_tool_close, this.handleToolClose);
  }

  componentWillUnmount() {
    Event.destroy(component_inactive, this.handleInactive);
    Event.destroy(component_drag, this.handleDrag);
    Event.destroy(component_dragend, this.handleDragEnd);
    Event.destroy(component_resize_end, this.refresh);
    Event.destroy(component_properties_change, this.refresh);
    Event.destroy(controllers_change, this.handleControllers);
    Event.destroy(link_tool_active, this.handleToolActive);
    Event.destroy(link_tool_close, this.handleToolClose);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    for (let a in this._anchorDoms) {
      let el = this._anchorDoms[a];
      if (el) el.removeEventListener('mousedown', this.handleAnchorMouseDown, true);
    }
  }

  handleInactive = () => this.setState({ drag: null, dragging: false });

  refresh = () => {
    // 连线模式：重建全部锚点（拖动/属性变化时坐标实时跟随）；设计模式不显示锚点
    if (this.state.linkMode) this.rebuildAnchors();
  };

  // 用户拖动组件时隐藏锚点（避免锚点乱飞/遮挡拖动视线）；松手恢复显示。
  // 程序化变换（Snapline 吸附/对齐工具栏，from 非 Draggable）不隐藏
  handleDrag = (target, options = {}) => {
    let dragging = options.from === 'Draggable';
    if (dragging !== this.state.dragging) this.setState({ dragging });
    this.refresh();
  };

  handleDragEnd = () => {
    if (this.state.dragging) this.setState({ dragging: false });
    this.refresh();
  };

  /* ---------------- 连线工具模式（顶部「连线」按钮） ---------------- */

  handleToolActive = () => {
    window.__linkTool = true;
    // 重置 dragging：拖动组件时 mouseup 丢失（拖出浏览器边界等）→ dragend 不派发 → dragging 卡 true
    // 锚点被永久隐藏，连线模式无法拖线（间歇性"连不上"）——进入连线模式强制恢复锚点显示
    this.setState({ linkMode: true, dragging: false }, this.rebuildAnchors);
  };

  handleToolClose = () => {
    window.__linkTool = false;
    this.setState({ linkMode: false, drag: null });
  };

  handleControllers = () => {
    // 连线模式下组件增删/数据变化时重建锚点列表
    if (this.state.linkMode) this.rebuildAnchors();
  };

  // 构建全部组件锚点列表（坐标实时计算；拖线/轻点不依赖选中组件）
  rebuildAnchors = () => {
    let list = [];
    for (let id in window.allWidgets) {
      let item = window.allWidgets[id];
      let abs = absolutePos(item);
      let linked = (item.connections || []).map((c) => c.anchor);
      ANCHORS.forEach((a) => {
        let p = anchorPoint({ x: abs.x, y: abs.y, transform: item.transform }, a, ANCHOR_OFFSET);
        list.push({ id, anchor: a, x: p.x, y: p.y, linked: linked.indexOf(a) > -1 });
      });
    }
    this.setState({ allAnchors: list });
  };

  /** 鼠标画布坐标 → 命中最近的组件锚点（bbox 粗筛 + 锚点精算）；excludeId 排除自身（禁止自连） */
  findAnchor = (mouse, excludeId) => {
    let best = null;
    let bestDist = HIT_DIST;
    for (let id in window.allWidgets) {
      if (id == excludeId) continue; // 不能连自己
      let item = window.allWidgets[id];
      let t = item.transform || {};
      let abs = absolutePos(item);
      let w = t.width || 0;
      let h = t.height || 0;
      // 粗筛：鼠标到组件包围盒距离（锚点距 bbox 边缘 ANCHOR_OFFSET=16px 外移，
      // 阈值必须包含该外移量，否则鼠标在锚点外侧时即使距锚点 1px 也会被跳过、吸附失效）。
      // 旋转组件的锚点可超出 bbox 更远（最多半个对角线），不做粗筛直接精算
      if (!t.rotation) {
        let dx = Math.max(abs.x - mouse.x, 0, mouse.x - (abs.x + w));
        let dy = Math.max(abs.y - mouse.y, 0, mouse.y - (abs.y + h));
        if (Math.hypot(dx, dy) > bestDist + ANCHOR_OFFSET + 4) continue;
      }
      for (let a of ANCHORS) {
        let p = anchorPoint({ x: abs.x, y: abs.y, transform: t }, a, ANCHOR_OFFSET);
        let d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (d < bestDist) {
          bestDist = d;
          best = { id, anchor: a };
        }
      }
    }
    return best;
  };

  /* ---------------- 拖线交互 ---------------- */

  // 锚点 DOM 引用（原生 capture 监听挂载点）
  _anchorDoms = {};

  setAnchorDom = (anchor, el) => {
    if (this._anchorDoms[anchor] === el) return;
    if (this._anchorDoms[anchor]) this._anchorDoms[anchor].removeEventListener('mousedown', this.handleAnchorMouseDown, true);
    this._anchorDoms[anchor] = el;
    if (el) el.addEventListener('mousedown', this.handleAnchorMouseDown, true);
  };

  /**
   * 原生 capture 阶段 mousedown（挂锚点 DOM 上）：
   * capture 先于 editor-view（CanvasDraggable 画布拖拽）/ document（React 委托，画布空白清空选中）
   * 的冒泡监听执行，stopPropagation 后这些路径全部收不到 —— 拖线/点按锚点不会触发选中清除（inactive）
   * 组件来源：锚点 data-uid（连线模式无需选中组件）
   */
  handleAnchorMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    let anchor = e.currentTarget.dataset.anchor;
    let uid = e.currentTarget.dataset.uid;
    let item = window.allWidgets[uid];
    if (!item) return;
    let abs = absolutePos(item);
    let p = anchorPoint({ x: abs.x, y: abs.y, transform: item.transform }, anchor, ANCHOR_OFFSET);
    // start 附带起点组件 bbox：直角曲线拐点约束（拖线预览不穿越组件）
    let start = Object.assign({}, p, { box: { x: abs.x, y: abs.y, width: item.transform.width || 0, height: item.transform.height || 0 } });
    this._moved = false;
    // view 在 mousedown 时锁定（锚点可见 = 渲染已完成，view 必然有效）：
    // mouseup 时再查 allWidgets[fromId].view 可能为 null（删除线/属性变更后节点被 createViewFrom
    // 换成新对象，.view 要等重渲染才挂上）→ 松手不建立连接
    this.setState({
      drag: { fromId: uid, fromAnchor: anchor, start, mouse: { x: p.x, y: p.y }, hover: null, view: item.view || null },
    });
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  handleMouseMove = (e) => {
    let { drag } = this.state;
    if (!drag) return;
    let mouse = pointToWorkspaceCoords(e);
    if (!this._moved && Math.abs(mouse.x - drag.start.x) + Math.abs(mouse.y - drag.start.y) > 4) {
      this._moved = true;
    }
    if (!this._moved) return; // 轻点不算拖动，等待 mouseup 断开
    let hover = this.findAnchor(mouse, drag.fromId);
    this.setState({ drag: Object.assign({}, drag, { mouse, hover }) });
  };

  handleMouseUp = () => {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    let { drag } = this.state;
    if (!drag) return;
    // 起点组件实例：优先用 mousedown 时锁定的引用（allWidgets 节点可能被 createViewFrom 换新，
    // .view 要等重渲染才挂上，实时查询可能为 null）；兜底实时查询
    let view = drag.view || (window.allWidgets[drag.fromId] && window.allWidgets[drag.fromId].view);
    if (view) {
      if (!this._moved) {
        // 轻点：断开该锚点的全部连线
        this.removeLink(view, drag.fromAnchor);
      } else if (drag.hover) {
        if (drag.hover.id == drag.fromId && drag.hover.anchor == drag.fromAnchor) {
          // 拖回自身同锚点：无操作（取消拖线）；删除单条线在线上点击
        } else {
          // 拖到目标锚点：新增一条（同一目标幂等更新目标锚点）
          this.setLink(view, drag.fromAnchor, drag.hover.id, drag.hover.anchor);
        }
      }
    }
    this.setState({ drag: null });
  };

  /* ---------------- 数据变更（走属性变更链路，可持久化） ---------------- */

  // 多对多：一个锚点可连多个目标。同一锚点连到同一目标（幂等）仅更新目标锚点；不同目标则新增一条
  setLink = (view, fromAnchor, toId, toAnchor) => {
    if (toId == view.properties.id) return; // 禁止自连（双保险：findAnchor 已排除自身）
    let list = (view.properties.connections || []).slice();
    let idx = list.findIndex((c) => c.anchor === fromAnchor && c.targetId == toId);
    if (idx > -1) {
      list[idx] = Object.assign({}, list[idx], { targetAnchor: toAnchor });
    } else {
      list.push({ id: uuid('lnk_'), anchor: fromAnchor, targetId: toId, targetAnchor: toAnchor });
    }
    Event.dispatch(component_properties_change, { target: view, key: 'connections', value: list });
  };

  // 断开该锚点的全部连线：出边 + 指向该锚点的入边（事件桥，树内一次处理）
  // 只删出边会漏掉从其他组件连向本锚点的线（线存在起点组件那边），导致残留后重连异常
  removeLink = (view, fromAnchor) => {
    Event.dispatch(link_remove_anchor, { uid: view.properties.id, anchor: fromAnchor });
  };

  /* ---------------- 渲染 ---------------- */

  // 渲染单个锚点（仅连线模式渲染；锚点铺满所有组件，用浅一档的蓝避免太抢眼）
  renderAnchor(key, uid, anchor, p, linked, hovering) {
    let size = 12;
    return (
      <div
        key={key}
        ref={(el) => this.setAnchorDom(key, el)}
        data-anchor={anchor}
        data-uid={uid}
        className={'link-anchor' + (linked ? ' linked' : '') + (hovering ? ' hovering' : '')}
        style={{
          position: 'absolute',
          left: p.x - size / 2,
          top: p.y - size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          boxSizing: 'border-box',
          cursor: 'crosshair',
          background: hovering ? '#ff7875' : linked ? '#69b1ff' : '#ffffff',
          border: linked ? '2px solid #69b1ff' : '2px solid #bae7ff',
          // 高于组件 zIndex（从 1000 起递增），否则叠放组件会盖住锚点导致点不到/被遮挡
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 中心定位点：未连接浅蓝点 / 已连接或悬停白点 */}
        <div
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: hovering || linked ? '#ffffff' : '#91caff',
          }}
        />
      </div>
    );
  }

  render() {
    let { drag, linkMode, allAnchors, dragging } = this.state;
    // 连线控制点仅在连线模式显示（设计模式不再显示，避免干扰）；连线模式拖动组件中隐藏，松手恢复
    let anchors = [];
    if (dragging) {
    } else if (linkMode) {
      // 连线模式：所有组件锚点（坐标已在 rebuildAnchors 缓存，拖动时实时重建）
      anchors = allAnchors.map((an) =>
        this.renderAnchor(
          an.id + '_' + an.anchor,
          an.id,
          an.anchor,
          { x: an.x, y: an.y },
          an.linked,
          !!(drag && drag.hover && drag.hover.id == an.id && drag.hover.anchor == an.anchor)
        )
      );
    }
    if (anchors.length === 0) return null;
    return (
      <div className={'link-anchors'}>
        {anchors}
        {drag && drag.hover && this.renderTargetAnchors(drag.hover)}
        {drag && this.renderDragLine()}
      </div>
    );
  }

  // 拖线期间：hover 到的组件显示其 4 个锚点（命中锚点高亮红），提示可连接位置（纯展示，不响应事件）
  renderTargetAnchors(hover) {
    let item = window.allWidgets[hover.id];
    if (!item) return null;
    let abs = absolutePos(item);
    let size = 12;
    return (
      <div className={'link-target-anchors'}>
        {ANCHORS.map((a) => {
          let p = anchorPoint({ x: abs.x, y: abs.y, transform: item.transform }, a, ANCHOR_OFFSET);
          let isHit = a === hover.anchor;
          return (
            <div
              key={a}
              style={{
                position: 'absolute',
                left: p.x - size / 2,
                top: p.y - size / 2,
                width: size,
                height: size,
                borderRadius: '50%',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                zIndex: 999998,
                background: isHit ? '#ff7875' : '#e6f4ff',
                border: isHit ? '2px solid #ff7875' : '2px dashed #91caff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 中心定位点：命中白点 / 未命中蓝点 */}
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: isHit ? '#ffffff' : '#1890ff',
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // 拖动中的临时虚线：跟随鼠标（悬停目标锚点时吸附到该锚点），路径样式跟随当前线段样式
  renderDragLine() {
    let { drag } = this.state;
    let to = drag.hover ? this.anchorOfHover(drag.hover) : drag.mouse;
    let from = { x: drag.start.x, y: drag.start.y, anchor: drag.fromAnchor, box: drag.start.box };
    let toPoint = { x: to.x, y: to.y, anchor: drag.hover ? drag.hover.anchor : drag.fromAnchor, box: to.box };
    let style = window.__linkStyle || 'curve';
    let d = style === 'corner' ? cornerPath(from, toPoint, 10) : linkPath(from, toPoint);
    return (
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          // 固定大尺寸 viewport（.link-anchors 容器无尺寸，100% 会解析为 0×0 导致线不可见）
          width: 20000,
          height: 20000,
          overflow: 'visible',
          pointerEvents: 'none',
          // 高于组件 zIndex（否则拖线虚线在组件上方被遮挡不可见）
          zIndex: 999997,
        }}
      >
        {/* 起点圆点 + 终点箭头（箭头随鼠标/目标锚点方向） */}
        <circle cx={drag.start.x} cy={drag.start.y} r={3.5} fill={drag.hover ? '#ff7875' : '#1890ff'} />
        <path d={linkArrowPath({ x: drag.start.x, y: drag.start.y, anchor: drag.fromAnchor }, to, 8, style)} fill={drag.hover ? '#ff7875' : '#1890ff'} />
        <path
          d={d}
          fill="none"
          stroke={drag.hover ? '#ff7875' : '#1890ff'}
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  anchorOfHover = (hover) => {
    let item = window.allWidgets[hover.id];
    if (!item) return { x: 0, y: 0 };
    let abs = absolutePos(item);
    // 附带目标组件 bbox：直角曲线拐点约束（最后一段不穿越目标组件）
    return Object.assign({}, anchorPoint({ x: abs.x, y: abs.y, transform: item.transform }, hover.anchor, ANCHOR_OFFSET), {
      box: { x: abs.x, y: abs.y, width: item.transform.width || 0, height: item.transform.height || 0 },
    });
  };
}
