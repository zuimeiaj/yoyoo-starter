import ViewProperties, { DEFAULT_COLOR } from './base';

export default class CheckboxProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'checkbox';
    this.alias = '多选';
    // 换行分隔的选项字符串，行首 ">" 表示默认选中该项，示例 "> 选项一\n选项二\n选项三"
    this.checkboxOptions = '> 选项一\n选项二\n选项三';
    // 选项排列方向：vertical（纵向）| horizontal（横向）
    this.direction = 'vertical';
    this.border.width = 1;
    this.font = { size: 12, color: DEFAULT_COLOR };
  }
}
