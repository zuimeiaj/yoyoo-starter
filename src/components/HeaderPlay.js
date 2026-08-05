/**
 *  created by yaojun on 2019/1/26
 *  预览：点击后打开全屏预览遮罩（Preview 组件只读渲染当前页面）
 */
import React from 'react'
import IconText from '@/lib/ui/IconText'
import Event from '../lib/Base/Event'
import { preview_open } from '../lib/util/actions'

export default class HeaderPlay extends React.Component {
  handlePreview = (e) => {
    e.stopPropagation()
    Event.dispatch(preview_open)
  }

  render() {
    return (
      <IconText className={'header_action-item'} icon={'bofang'} onClick={this.handlePreview}>
        预览
      </IconText>
    )
  }
}
