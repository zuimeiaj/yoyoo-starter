/**
 *  created by yaojun on 2026/8/5
 *  警告提示：antd Alert（类型图标 + 标题 + 描述）
 */
import React from 'react';
import ViewController from './ViewController';
import { Alert } from 'antd';

export default class ViewAlert extends ViewController {
  // 高度自动（settings.autoSize = 'height'）：只允许调宽度，手柄与 text 同款（左右圆点 + 包裹框）
  getResizeHandles = () => ['rotation', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom', 'l', 'r'];

  renderContent() {
    const { type = 'info', title = '提示', description = '' } = this.properties.alertConfig || {};
    return (
      <div className={'view-alert'} style={{ width: '100%' }}>
        <Alert type={type} message={title} description={description || undefined} showIcon />
      </div>
    );
  }
}
