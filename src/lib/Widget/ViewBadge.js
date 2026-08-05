/**
 *  created by yaojun on 2026/8/5
 *  徽标：antd Badge 数字角标（count > 99 显示 99+）
 */
import React from 'react';
import ViewController from './ViewController';
import { Badge } from 'antd';

export default class ViewBadge extends ViewController {
  renderContent() {
    const { count = 5, color = '#f5222d' } = this.properties.badgeConfig || {};
    return (
      <div
        className={'view-badge'}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Badge count={count} overflowCount={99} style={{ backgroundColor: color }} />
      </div>
    );
  }
}
