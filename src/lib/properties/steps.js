import ViewProperties, { DEFAULT_COLOR } from './base';

// 步骤条（antd Steps），stepsConfig 为专有配置（步骤列表/当前步骤）
export default class StepsProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'steps';
    this.alias = '步骤条';
    this.stepsConfig = { stepsOptions: '第一步\n第二步\n第三步', current: 1 };
    // 步骤条外观由 antd Steps 固定样式控制，删除所有外观面板
    delete this.bg;
    delete this.border;
    delete this.corner;
    delete this.font;
    delete this.align;
    delete this.spacing;
    this.noPanelKeys = ['bg', 'border', 'corner', 'font', 'align', 'spacing'];
    // 高度自动：内容撑开组件高度，编辑时只允许调宽度
    this.settings.autoSize = 'height';
  }
}
