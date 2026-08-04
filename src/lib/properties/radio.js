import ViewProperties, { DEFAULT_COLOR } from './base';

export default class RadioProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'radio';
    this.alias = '单选';
    // 换行分隔的选项字符串，行首 ">" 表示默认选中该项，示例 "> 选项一\n选项二\n选项三"
    this.radioOptions = '> 选项一\n选项二\n选项三';
    // 选项排列方向：vertical（纵向）| horizontal（横向）
    this.direction = 'vertical';
    this.border.width = 1;
    this.font = { size: 12, color: DEFAULT_COLOR };
  }
}
