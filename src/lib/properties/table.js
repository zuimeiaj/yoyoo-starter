/**
 *  created by yaojun on 2019/8/3
 *
 */
import ViewProperties from './base';

export default class TableProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'table';
    this.alias = '表格';
    this.transform.width = 400;
    this.transform.height = 200;
    this.tableData = [
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
    ];
    // 表格不需要阴影、圆角
    delete this.shadow;
    delete this.corner;
    this.border.width = 1;
    this.border.color = 'rgba(217,217,217,1)';
  }
}
