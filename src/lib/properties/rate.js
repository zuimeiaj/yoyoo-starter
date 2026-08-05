import ViewProperties, { DEFAULT_COLOR } from './base';

// 评分：星形展示，rateConfig 为专有配置（个数/默认值/大小/颜色）
export default class RateProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'rate';
    this.alias = '评分';
    this.rateConfig = { count: 5, value: 3, size: 18, color: '#fadb14' };
    // 评分无文本无外框：字号走 rateConfig.size，删除边框/圆角/字体/对齐/间距面板
    delete this.border;
    delete this.corner;
    delete this.font;
    delete this.align;
    delete this.spacing;
    this.noPanelKeys = ['border', 'corner', 'font', 'align', 'spacing'];
    // 宽高都自动：组件尺寸 = 星星内容包裹（个数/大小变化时自动跟随）
    this.settings.autoSize = 'all';
  }
}
