/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react'
import { Popover } from 'antd'
import { getQuery } from '../lib/util/helper'
import { getCurrentPage } from '../lib/global/instance'
import { getStore } from '../lib/global/store'
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
      <Popover
        title={'手机扫码预览'}
        content={
          <div>
            <QRCode value={this.state.qrcode} />
            <div style={{ paddingTop: 15 }}>
              <a className={'link'}>PC预览请点击播放按钮</a>
            </div>
          </div>
        }
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        visible={this.state.visible}
      >
        <span>
          <IconText onClick={this.handlePreview} className={'header_action-item'} icon={'bofang'}>
            预览
          </IconText>
        </span>
      </Popover>
    )
  }
}
