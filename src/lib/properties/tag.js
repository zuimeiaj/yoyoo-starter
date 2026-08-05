import ViewProperties, { DEFAULT_COLOR } from './base';

// 标签：文本 + 背景/边框/圆角（外观全部走通用面板 bg/border/corner/font/align）
export default class TagProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'tag';
    this.alias = '标签';
    this.tagConfig = { text: '标签' };
    this.border.width = 1;
    this.corner.topRight = 4;
    this.corner.topLeft = 4;
    this.corner.bottomLeft = 4;
    this.corner.bottomRight = 4;
    this.font = { size: 12, color: DEFAULT_COLOR };
    this.align = { x: 'center', y: 'center' };
  }
}
