/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react'
import { Menu } from 'antd'
import IconText from '@/lib/ui/IconText'

const MenuItem = Menu.Item

export default class HeaderUser extends React.Component {
  handlelogin = async () => {
    location.href = 'https://vivw.org/'
  }

  render() {
    return (
      <IconText onClick={this.handlelogin} className={'header_action-item'} icon={'denglu1'}>
        社区
      </IconText>
    )
  }
}
