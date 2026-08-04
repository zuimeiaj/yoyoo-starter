/**
 *  created by yaojun on 2026/8/4
 *  设计/钢笔 工具切换按钮组：默认选中「设计」（拖拽模式）。
 *  选中「钢笔」进入钢笔绘制模式；绘制完成（双击/Enter）自动退出并切回「设计」。
 *  按钮只发事件，模式单一事实来源是 PenTool。
 */
import React from 'react';
import { Radio } from 'antd';
import Event from '../lib/Base/Event';
import { pen_tool_active, pen_tool_close } from '../lib/util/actions';

export default class HeaderToolbar extends React.Component {
  state = {
    mode: 'design', // 默认选中设计；单一事实来源是 PenTool，这里只做展示
  };

  componentWillMount() {
    Event.listen(pen_tool_active, this.handlePenActive);
    Event.listen(pen_tool_close, this.handlePenInactive);
  }

  componentWillUnmount() {
    Event.destroy(pen_tool_active, this.handlePenActive);
    Event.destroy(pen_tool_close, this.handlePenInactive);
  }

  handlePenActive = () => {
    this.setState({ mode: 'pen' });
  };
  handlePenInactive = () => {
    this.setState({ mode: 'design' });
  };
  handleModeChange = (e) => {
    // 只发命令，选中态由 PenTool 的 active/close 事件回写（防重入由工具内部处理）
    if (e.target.value === 'pen') {
      Event.dispatch(pen_tool_active);
    } else {
      Event.dispatch(pen_tool_close);
    }
  };

  render() {
    return (
      <Radio.Group className={'header_mode-switch'} size={'small'} value={this.state.mode} onChange={this.handleModeChange}>
        <Radio.Button value="design">设计</Radio.Button>
        <Radio.Button value="pen">钢笔</Radio.Button>
      </Radio.Group>
    );
  }
}
