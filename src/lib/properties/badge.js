import ViewProperties, { DEFAULT_COLOR } from './base';

// 徽标：数字角标（antd Badge），badgeConfig 为专有配置（数量/颜色）
export default class BadgeProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'badge';
    this.alias = '徽标';
    this.badgeConfig = { count: 5, color: '#f5222d' };
    // 徽标为数字圆点（样式由 badgeConfig 控制），删除无意义的面板项
    delete this.border;
    delete this.corner;
    delete this.font;
    delete this.align;
    delete this.spacing;
    this.noPanelKeys = ['border', 'corner', 'font', 'align', 'spacing'];
  }
}
