/**
 *  created by yaojun on 2026/8/5
 *  统计数值：小字标题 + 大号数字（数字样式走 font）
 */
import React from 'react';
import ViewController from './ViewController';

export default class ViewStatistic extends ViewController {
  renderContent() {
    const { title = '', value = 0 } = this.properties.statisticConfig || {};
    const font = this.properties.font || {};
    return (
      <div
        className={'view-statistic'}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        <div
          style={{
            fontSize: font.size || 24,
            color: font.color || 'rgba(0,0,0,0.85)',
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </div>
      </div>
    );
  }
}
