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
    // 行高/列宽比例数组（元素 = 占比，总和 ≈ 1，null 表示未初始化 → 渲染均分）
    this.rowRatios = null;
    this.colRatios = null;
    // 合并单元格区域 [{row1, col1, row2, col2}]，互不重叠；合并时非 anchor cell 内容清空
    this.mergedCells = [];
    // 单元格样式：与 tableData 同构的 2D 稀疏数组，元素为样式对象 {bg,color,size,bold,fontFamily} 或 null
    this.cellStyles = null;
    // 表格不需要阴影、圆角
    delete this.shadow;
    delete this.corner;
    this.border.width = 1;
    this.border.color = 'rgba(217,217,217,1)';
  }
}
