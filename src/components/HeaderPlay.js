/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react'
import { Popover } from 'antd'
import QRCode from 'qrcode.react'
import { PREVIEW_URL } from '@config'
import IconText from '@/lib/ui/IconText'

export default class HeaderPlay extends React.Component {
  state = {
    visible: false,
    qrcode: true,
  }
  handlePreview = () => {}
  handleMouseEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  handleMouseLeave = (e) => {
    e.stopPropagation()
    e.preventDefault()
  }

  render() {
    return (
      <a target="_blank" href={PREVIEW_URL}>
        <IconText className={'header_action-item'} icon={'bofang'}>
          预览
        </IconText>
      </a>
    )
  }
}
