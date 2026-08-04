/**
 *  created by yaojun on 2026/8/3
 *
 * 表格单元格样式控件：填充颜色 + 字体（文字颜色 / 字号 / 加粗 / 字体族）。
 * 应用范围：当前选区 → 编辑 cell → 右键 cell（ViewTable.getActiveCellRect）。
 * 采用 InspectorAnchor 模式：不走 props.onChange —— cellStyles 是 2D 数组，
 * 若走 handlePropsChange 的 mergeProps 分支会被拍平成对象损坏数据；
 * 修改时直接调 getFirstResponder().applyCellStyle(field, value)，
 * 内部走 ViewTable._applyTableChange 数组 key 提交（一条撤销历史）。
 */
import React from 'react';
import NumberInput from './NumberInput';
import Select from './Select';
import ColorInput from './ColorInput';
import Icon from '../Icon';
import Button, { ButtonGroup } from './Button';
import InspectorCard from './InspectorCard';
import Event from '../Base/Event';
import { getFirstResponder } from '../global/instance';
import { component_active, table_cell_selection_change } from '../util/actions';

const FONT_FAMILIES = [
  { key: '', label: '默认' },
  { key: 'SimSun', label: '宋体' },
  { key: 'SimHei', label: '黑体' },
  { key: 'Microsoft YaHei', label: '微软雅黑' },
  { key: 'Arial', label: 'Arial' },
  { key: 'Helvetica', label: 'Helvetica' },
  { key: 'Courier New', label: 'Courier New' },
  { key: 'Georgia', label: 'Georgia' },
];

const rowStyle = { display: 'flex', alignItems: 'center' };
const labelStyle = { width: 60, fontSize: 12, color: '#666' };

export default class InspectorTableCell extends React.PureComponent {
  componentDidMount() {
    Event.listen(table_cell_selection_change, this.refresh);
    Event.listen(component_active, this.refresh);
    this.refresh();
  }

  componentWillUnmount() {
    Event.destroy(table_cell_selection_change, this.refresh);
    Event.destroy(component_active, this.refresh);
  }

  /** 读取当前目标 cell 样式并同步子控件（无目标 / 非表格 → 清空显示） */
  refresh = () => {
    const view = getFirstResponder();
    const { bg, color, size, bold, fontFamily } = this.refs;
    const isTable = view && typeof view.getActiveCellRect === 'function';
    const rect = isTable ? view.getActiveCellRect() : null;
    const style = rect ? view.getCellStyle(rect.row1, rect.col1) : null;
    // 无颜色时用 'none'（ColorPicker 有 isNone 分支，空串 '' 会走 Color.parse('') 返回 undefined 崩溃）
    bg.setValue(style && style.bg ? style.bg : 'none');
    color.setValue(style && style.color ? style.color : 'none');
    size.setValue(style && style.size != null ? style.size : '');
    bold.setValue(style && style.bold ? 'bold' : '');
    fontFamily.setValue(style && style.fontFamily ? style.fontFamily : '');
  };

  /** 应用样式字段到当前目标（直调实例方法，避免 mergeProps 拍平 2D 数组） */
  apply = (field, value) => {
    const view = getFirstResponder();
    if (view && typeof view.applyCellStyle === 'function') view.applyCellStyle(field, value);
  };

  render() {
    return (
      <InspectorCard
        title={
          <React.Fragment>
            <Icon type={'beijingyanse'} /> 单元格样式
          </React.Fragment>
        }
        className={'inspector-table-cell'}
      >
        <div className={'ins-control_wrapper-content'} style={rowStyle}>
          <span style={labelStyle}>填充颜色</span>
          <ColorInput onChange={(v) => this.apply('bg', v)} ref={'bg'} />
        </div>
        <div className={'ins-control_wrapper-content'} style={rowStyle}>
          <span style={labelStyle}>字号</span>
          <NumberInput onChange={(v) => this.apply('size', v)} ref={'size'} />
        </div>
        <div className={'ins-control_wrapper-content'} style={rowStyle}>
          <span style={labelStyle}>文字颜色</span>
          <ColorInput onChange={(v) => this.apply('color', v)} ref={'color'} />
        </div>
        <div className={'ins-control_wrapper-content'} style={rowStyle}>
          <span style={labelStyle}>加粗</span>
          {/* ButtonGroup 单选：再次点击返回 ''（取消）→ 删字段；key 命中 → true */}
          <ButtonGroup onClick={(v) => this.apply('bold', v ? true : '')} ref={'bold'}>
            <Button key={'bold'}>
              <Icon type={'cuti'} />
            </Button>
          </ButtonGroup>
        </div>
        <div className={'ins-control_wrapper-content'} style={rowStyle}>
          <span style={labelStyle}>字体族</span>
          <Select options={FONT_FAMILIES} onChange={(v) => this.apply('fontFamily', v)} ref={'fontFamily'} />
        </div>
      </InspectorCard>
    );
  }
}
