import ViewProperties, { DEFAULT_COLOR } from './base';

// 进度条：横向条 + 百分比文字，progressConfig 为专有配置（百分比/颜色/是否显示文字）
export default class ProgressProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'progress';
    this.alias = '进度条';
    this.progressConfig = { percent: 60, color: '#1890ff', showText: true };
    // 进度条文字为固定样式的百分比（progressConfig 控制），无需字体/对齐/间距面板
    delete this.font;
    delete this.align;
    delete this.spacing;
    this.noPanelKeys = ['font', 'align', 'spacing'];
  }
}
