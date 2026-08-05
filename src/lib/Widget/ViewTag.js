/**
 *  created by yaojun on 2026/8/5
 *  标签：文本 + 背景/边框/圆角（由容器通用样式控制），水平/垂直对齐跟随 align
 */
import React from 'react';
import ViewController from './ViewController';

export default class ViewTag extends ViewController {
  renderContent() {
    const { text = '' } = this.properties.tagConfig || {};
    const align = this.properties.align || {};
    const font = this.properties.font || {};
    return (
      <div
        className={'view-tag'}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: align.y || 'center',
          justifyContent: align.x || 'center',
        }}
      >
        <span style={{ whiteSpace: 'pre-wrap', fontSize: font.size, color: font.color }}>{text}</span>
      </div>
    );
  }
}
