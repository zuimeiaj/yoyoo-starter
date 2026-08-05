import ViewProperties, { DEFAULT_COLOR } from './base';

// 警告提示（antd Alert），alertConfig 为专有配置（类型/标题/描述）
export default class AlertProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'alert';
    this.alias = '警告提示';
    this.alertConfig = { type: 'info', title: '提示', description: '' };
    // 警告提示外观由 antd Alert 类型色完全控制（覆盖容器样式），删除所有外观面板
    delete this.bg;
    delete this.border;
    delete this.corner;
    delete this.font;
    delete this.align;
    delete this.spacing;
    this.noPanelKeys = ['bg', 'border', 'corner', 'font', 'align', 'spacing'];
    // 高度自动：内容（标题/描述）撑开组件高度，编辑时只允许调宽度
    this.settings.autoSize = 'height';
  }
}
