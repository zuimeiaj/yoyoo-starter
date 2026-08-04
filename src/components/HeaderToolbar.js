/**
 *  created by yaojun on 2026/8/4
 *  设计/钢笔 工具切换按钮组：默认选中「设计」（拖拽模式）。
 *  选中「钢笔」进入钢笔绘制模式；绘制完成（双击/Enter）自动退出并切回「设计」。
 *  按钮只发事件，模式单一事实来源是 PenTool。
 */
import React from 'react';
import Event from '../lib/Base/Event';
import { pen_tool_active, pen_tool_close } from '../lib/util/actions';

export default class HeaderToolbar extends React.Component {
  state = {
    penActive: false, // 默认选中设计
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
    this.setState({ penActive: true });
  };
  handlePenInactive = () => {
    this.setState({ penActive: false });
  };
  handleDesign = () => {
    Event.dispatch(pen_tool_close);
  };
  handlePen = () => {
    Event.dispatch(pen_tool_active);
  };

  render() {
    let { penActive } = this.state;
    return (
      <div className={'header_mode-switch'}>
        <span className={`mode-btn ${penActive ? '' : 'active'}`} onClick={this.handleDesign}>
          设计
        </span>
        <span className={`mode-btn ${penActive ? 'active' : ''}`} onClick={this.handlePen}>
          钢笔
        </span>
      </div>
    );
  }
}
