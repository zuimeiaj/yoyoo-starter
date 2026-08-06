/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react';
import { Menu } from 'antd';
import IconText from '@/lib/ui/IconText';

export default class HeaderUser extends React.Component {
  // 官网首页（public/site/）：相对 PUBLIC_URL，开发 /site/、构建 /yoyoo/site/
  handlelogin = () => {
    window.open((process.env.PUBLIC_URL || '') + '/site/', '_blank');
  };

  render() {
    return (
      <IconText onClick={this.handlelogin} className={'header_action-item'} icon={'denglu1'}>
        官网
      </IconText>
    );
  }
}
