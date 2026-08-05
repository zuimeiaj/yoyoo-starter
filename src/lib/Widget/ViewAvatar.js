/**
 *  created by yaojun on 2026/8/5
 *  头像：antd Avatar 文字头像（尺寸跟随组件宽高较小值，保持圆形）
 */
import React from 'react';
import ViewController from './ViewController';
import { Avatar } from 'antd';

export default class ViewAvatar extends ViewController {
  renderContent() {
    const { text = 'Y', color = '#1890ff', shape = 'circle' } = this.properties.avatarConfig || {};
    const { width, height } = this.properties.transform || {};
    const size = Math.max(8, Math.min(width || 40, height || 40));
    return (
      <div
        className={'view-avatar'}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Avatar shape={shape} size={size} style={{ backgroundColor: color }}>
          {text}
        </Avatar>
      </div>
    );
  }
}
