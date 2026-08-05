import ViewProperties, { DEFAULT_COLOR } from './base';

// 头像：文字头像（antd Avatar），avatarConfig 为专有配置（文字/背景色/形状）
export default class AvatarProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'avatar';
    this.alias = '头像';
    this.avatarConfig = { text: 'Y', color: '#1890ff', shape: 'circle' };
    // 头像外观完全由 avatarConfig 控制（antd Avatar 自带背景/形状），删除所有外观面板
    delete this.bg;
    delete this.border;
    delete this.corner;
    delete this.font;
    delete this.align;
    delete this.spacing;
    this.noPanelKeys = ['bg', 'border', 'corner', 'font', 'align', 'spacing'];
    // 锁定宽高比例：缩放时保持正圆（ViewResizable 读取 settings.ratio）
    this.settings.ratio = true;
  }
}
