/**
 *  created by yaojun on 2026/8/5
 *  步骤条：antd Steps（换行分隔的步骤列表 + 当前步骤）
 */
import React from 'react';
import ViewController from './ViewController';
import { Steps } from 'antd';

const Step = Steps.Step;

export default class ViewSteps extends ViewController {
  // 高度自动（settings.autoSize = 'height'）：只允许调宽度，手柄与 text 同款（左右圆点 + 包裹框）
  getResizeHandles = () => ['rotation', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom', 'l', 'r'];

  renderContent() {
    const { stepsOptions = '第一步\n第二步\n第三步', current = 1 } = this.properties.stepsConfig || {};
    const steps = String(stepsOptions)
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t);
    return (
      <div className={'view-steps'} style={{ width: '100%' }}>
        <Steps size={'small'} current={current} style={{ fontSize: 12 }}>
          {steps.map((s) => (
            <Step key={s} title={s} />
          ))}
        </Steps>
      </div>
    );
  }
}
