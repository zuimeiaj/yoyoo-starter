import ViewProperties, { DEFAULT_COLOR } from './base';

// 统计数值：标题 + 大数字，statisticConfig 为专有配置（标题/数值），数字样式走 font
export default class StatisticProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'statistic';
    this.alias = '统计数值';
    this.statisticConfig = { title: '总销售额', value: 126560 };
    this.font = { size: 24, color: 'rgba(0,0,0,0.85)' };
    // 统计数值为固定纵向布局（标题在上数字在下），无需对齐/间距面板
    delete this.align;
    delete this.spacing;
    this.noPanelKeys = ['align', 'spacing'];
  }
}
