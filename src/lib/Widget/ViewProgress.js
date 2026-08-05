/**
 *  created by yaojun on 2026/8/5
 *  进度条：轨道 + 进度填充 + 百分比文字
 */
import React from 'react';
import ViewController from './ViewController';

export default class ViewProgress extends ViewController {
  renderContent() {
    const { percent = 60, color = '#1890ff', showText = true } = this.properties.progressConfig || {};
    const pct = Math.max(0, Math.min(100, percent));
    return (
      <div
        className={'view-progress'}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          className={'view-progress-track'}
          style={{
            flex: 1,
            height: '100%',
            background: 'rgba(0,0,0,0.06)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            className={'view-progress-fill'}
            style={{
              width: pct + '%',
              height: '100%',
              background: color,
              borderRadius: 4,
            }}
          />
        </div>
        {showText && (
          <span className={'view-progress-text'} style={{ marginLeft: 8, fontSize: 12, whiteSpace: 'nowrap' }}>
            {pct}%
          </span>
        )}
      </div>
    );
  }
}
