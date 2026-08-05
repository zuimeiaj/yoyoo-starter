/**
 *  created by yaojun on 2026/8/5
 *  线段样式切换（右上角工具栏）：曲线 / 直角曲线（正交折线 + 倒角）
 *  样式写入页面数据（page.linkStyle，持久化）并派发 link_style_change 让连线层刷新
 */
import React from 'react'
import Icon from '../lib/Icon'
import Event from '../lib/Base/Event'
import { controllers_change, link_style_change } from '../lib/util/actions'
import { getCurrentPage } from '../lib/global/instance'
import { updatePageInfo } from '../lib/util/page'

const STYLES = [
  { key: 'curve', name: '曲线', icon: 'svg:<path d="M3 19c5-12 13 4 18-7"/>' },
  { key: 'corner', name: '直角曲线', icon: 'svg:<path d="M3 19h9v-9h9"/>' },
]

export default class HeaderLinkStyle extends React.Component {
  state = { style: window.__linkStyle || 'curve' }

  componentWillMount() {
    // 切页后 handlePageSelect 已更新 window.__linkStyle（先于 setState），这里同步 UI 高亮；
    // 样式相同 setState 会触发 React bailout，不产生多余渲染
    Event.listen(controllers_change, this.syncStyle)
  }

  componentWillUnmount() {
    Event.destroy(controllers_change, this.syncStyle)
  }

  syncStyle = () => this.setState({ style: window.__linkStyle || 'curve' })

  handleChange = (key) => {
    if (key === this.state.style) return
    window.__linkStyle = key
    this.setState({ style: key })
    updatePageInfo(getCurrentPage(), 'linkStyle', key)
    Event.dispatch(link_style_change, key)
  }

  render() {
    return (
      <div className={'header_action-item link-style-switch'}>
        {STYLES.map((s) => (
          <span
            key={s.key}
            title={s.name}
            className={'link-style-item' + (s.key === this.state.style ? ' active' : '')}
            onClick={() => this.handleChange(s.key)}
          >
            <Icon type={s.icon} />
          </span>
        ))}
      </div>
    )
  }
}
