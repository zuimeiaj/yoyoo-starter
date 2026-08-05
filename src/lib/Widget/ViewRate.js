/**
 *  created by yaojun on 2026/8/5
 *  评分：★ 星形序列（值内亮色，其余浅灰）
 */
import React from 'react';
import ViewController from './ViewController';

export default class ViewRate extends ViewController {
  // 宽高都自动（settings.autoSize = 'all'）：尺寸由星星内容包裹，
  // 无 resize 圆点；border* 仅作选中包裹框显示（拖动只改数据，渲染随内容）
  getResizeHandles = () => ['rotation', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom'];

  renderContent() {
    const { count = 5, value = 3, size = 18, color = '#fadb14' } = this.properties.rateConfig || {};
    let stars = [];
    for (let i = 0; i < count; i++) {
      stars.push(
        <span key={i} style={{ color: i < value ? color : '#e8e8e8' }}>
          ★
        </span>
      );
    }
    return (
      <div
        className={'view-rate'}
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: size,
          lineHeight: 1,
          letterSpacing: 4,
        }}
      >
        {stars}
      </div>
    );
  }
}
