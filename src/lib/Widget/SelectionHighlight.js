/**
 *  created by yaojun on 2026/8/6
 *
 *  框选实时高亮层：编辑器上层覆盖层（与锚点/选区框同层），按组件画布坐标绘制高亮矩形。
 *
 *  为什么不用 .aj-component 上的 outline：outline 属于组件层，被上层组件盖住时高亮"埋底"；
 *  编辑器三层架构（底层 background / 组件层 / 上层覆盖层），高亮必须画在最上层。
 *  挂 Stage 内与组件同坐标系（同 LinkLayer 的 20000×20000 viewport），Stage 缩放/滚动自动跟随。
 *
 *  数据驱动：EditorControllers.handleSelectionUpdate 在框选拖拽中派发 selection_highlight
 *  （匹配组件画布坐标列表）；selection_start / selection_change（松手）派发空列表清空。
 */
import React from 'react';
import Event from '../Base/Event';
import { selection_highlight } from '../util/actions';

export default class SelectionHighlight extends React.Component {
  state = { items: [] };

  componentWillMount() {
    Event.listen(selection_highlight, this.handleHighlight);
  }

  componentWillUnmount() {
    Event.destroy(selection_highlight, this.handleHighlight);
  }

  handleHighlight = ({ items }) => this.setState({ items: items || [] });

  render() {
    let { items } = this.state;
    if (!items.length) return null;
    return (
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          // 与 LinkLayer 相同：editor-control-panel 无显式尺寸，固定大尺寸 viewport
          width: 20000,
          height: 20000,
          overflow: 'visible',
          pointerEvents: 'none', // 纯展示，不拦鼠标
          zIndex: 999998, // 高于组件层（1000+ 起递增），低于连线锚点（999999）
        }}
      >
        {items.map((it) => (
          <rect
            key={it.id}
            x={it.x}
            y={it.y}
            width={it.width}
            height={it.height}
            fill="rgba(64,169,255,0.12)"
            stroke="#40a9ff"
            strokeWidth={1.5}
            transform={it.rotation ? `rotate(${it.rotation} ${it.x + it.width / 2} ${it.y + it.height / 2})` : undefined}
          />
        ))}
      </svg>
    );
  }
}
