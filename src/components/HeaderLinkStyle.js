/**
 *  created by yaojun on 2026/8/5
 *  线段样式切换（右上角工具栏）：曲线 / 直角曲线（正交折线 + 倒角）+ 线段颜色
 *  样式/颜色写入页面数据（page.linkStyle / page.linkColor，持久化）并派发 link_style_change 让连线层刷新
 */
import React from 'react'
import Icon from '../lib/Icon'
import Event from '../lib/Base/Event'
import { Popover } from 'antd'
import { controllers_change, link_style_change } from '../lib/util/actions'
import { getCurrentPage } from '../lib/global/instance'
import { updatePageInfo } from '../lib/util/page'

const STYLES = [
  { key: 'curve', name: '曲线', icon: 'svg:<path d="M3 19c5-12 13 4 18-7"/>' },
  { key: 'corner', name: '直角曲线', icon: 'svg:<path d="M3 19h9v-9h9"/>' },
]

// 线段默认颜色（黑色，draw.io 风格）
export const DEFAULT_LINK_COLOR = '#000000'

// 线段预设色板（主流颜色，无需取色器）
const LINK_COLORS = [
  '#000000', // 黑（默认）
  '#ffffff', // 白
  '#f5222d', // 红
  '#fa8c16', // 橙
  '#fadb14', // 黄
  '#52c41a', // 绿
  '#1890ff', // 蓝
  '#722ed1', // 紫
  '#8c8c8c', // 灰
]

// 线段粗细选项（px）
const LINK_WIDTHS = [1, 2, 3, 4, 5]

export default class HeaderLinkStyle extends React.Component {
  state = { style: window.__linkStyle || 'curve', color: window.__linkColor || DEFAULT_LINK_COLOR, width: window.__linkWidth || 1 }

  componentWillMount() {
    // 切页后 handlePageSelect 已更新 window.__linkStyle/__linkColor（先于 setState），这里同步 UI 高亮；
    // 相同值 setState 会触发 React bailout，不产生多余渲染
    Event.listen(controllers_change, this.syncStyle)
  }

  componentWillUnmount() {
    Event.destroy(controllers_change, this.syncStyle)
  }

  syncStyle = () =>
    this.setState({
      style: window.__linkStyle || 'curve',
      color: window.__linkColor || DEFAULT_LINK_COLOR,
      width: window.__linkWidth || 1,
    })

  handleChange = (key) => {
    if (key === this.state.style) return
    window.__linkStyle = key
    this.setState({ style: key })
    updatePageInfo(getCurrentPage(), 'linkStyle', key)
    Event.dispatch(link_style_change, key)
  }

  // 线段颜色：写页面数据持久化 + 派发刷新（LinkLayer 清 path 缓存重渲染）
  handleColorChange = (color) => {
    window.__linkColor = color
    this.setState({ color })
    updatePageInfo(getCurrentPage(), 'linkColor', color)
    Event.dispatch(link_style_change, color)
  }

  // 线段粗细：同颜色链路持久化 + 派发刷新
  handleWidthChange = (width) => {
    if (width === this.state.width) return
    window.__linkWidth = width
    this.setState({ width })
    updatePageInfo(getCurrentPage(), 'linkWidth', width)
    Event.dispatch(link_style_change, width)
  }

  render() {
    let { style, color, width } = this.state
    return (
      <div className={'header_action-item link-style-switch'}>
        {STYLES.map((s) => (
          <span
            key={s.key}
            title={s.name}
            className={'link-style-item' + (s.key === style ? ' active' : '')}
            onClick={() => this.handleChange(s.key)}
          >
            <Icon type={s.icon} />
          </span>
        ))}
        {/* 线段颜色：矩形触发（显示当前色），hover 弹预设色板（黑为默认） */}
        <Popover
          placement={'bottom'}
          trigger={'hover'}
          content={
            <div className={'link-color-pop'}>
              {LINK_COLORS.map((c) => (
                <span
                  key={c}
                  title={c === DEFAULT_LINK_COLOR ? '默认（黑色）' : c}
                  className={'link-color-swatch' + (c === color ? ' active' : '')}
                  style={{ background: c }}
                  onClick={() => this.handleColorChange(c)}
                />
              ))}
            </div>
          }
        >
          <span className={'link-color-trigger'} title={'线段颜色'} style={{ background: color }} />
        </Popover>
        {/* 线段粗细：hover 弹 1/2/3/4/5px，触发钮上的横线按当前粗细绘制 */}
        <Popover
          placement={'bottom'}
          trigger={'hover'}
          content={
            <div className={'link-width-pop'}>
              {LINK_WIDTHS.map((w) => (
                <div key={w} className={'link-width-item' + (w === width ? ' active' : '')} onClick={() => this.handleWidthChange(w)}>
                  <svg width={40} height={12}>
                    <line x1={2} y1={6} x2={38} y2={6} stroke={'#000000'} strokeWidth={w} />
                  </svg>
                  <span>{w}px</span>
                </div>
              ))}
            </div>
          }
        >
          <span className={'link-width-trigger'} title={'线段粗细'}>
            <svg width={22} height={22}>
              <line x1={3} y1={11} x2={19} y2={11} stroke={'#000000'} strokeWidth={width} />
            </svg>
          </span>
        </Popover>
      </div>
    )
  }
}
