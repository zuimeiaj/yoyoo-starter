/**
 *  created by yaojun on 2026/8/4
 *  设计 / 钢笔 / 连线 工具切换按钮组：默认选中「设计」（拖拽模式）。
 *  - 「钢笔」进入钢笔绘制模式；绘制完成（双击/Enter）自动退出并切回「设计」。
 *  - 「连线」进入连线模式：所有组件显示连线锚点（无需选中即可连线），设计/拖拽功能不受影响。
 *  按钮只发事件，模式单一事实来源是各工具（PenTool / LinkAnchors），这里只做展示回写。
 */
import React from 'react';
import { Radio } from 'antd';
import Event from '../lib/Base/Event';
import { link_tool_active, link_tool_close, pen_tool_active, pen_tool_close } from '../lib/util/actions';
import HeaderLinkStyle from './HeaderLinkStyle';

export default class HeaderToolbar extends React.Component {
  state = {
    mode: 'design', // 默认选中设计；单一事实来源是工具组件，这里只做展示
  };

  componentWillMount() {
    Event.listen(pen_tool_active, this.handlePenActive);
    Event.listen(pen_tool_close, this.handlePenInactive);
    Event.listen(link_tool_active, this.handleLinkActive);
    Event.listen(link_tool_close, this.handleLinkInactive);
  }

  componentWillUnmount() {
    Event.destroy(pen_tool_active, this.handlePenActive);
    Event.destroy(pen_tool_close, this.handlePenInactive);
    Event.destroy(link_tool_active, this.handleLinkActive);
    Event.destroy(link_tool_close, this.handleLinkInactive);
  }

  handlePenActive = () => {
    this.setState({ mode: 'pen' });
  };
  handlePenInactive = () => {
    this.setState({ mode: 'design' });
  };
  handleLinkActive = () => {
    this.setState({ mode: 'link' });
  };
  handleLinkInactive = () => {
    this.setState({ mode: 'design' });
  };

  handleModeChange = (e) => {
    // 只发命令，选中态由工具 active/close 事件回写；三个模式互斥（切一个先关另一个）
    let v = e.target.value;
    if (v === 'pen') {
      Event.dispatch(link_tool_close);
      Event.dispatch(pen_tool_active);
    } else if (v === 'link') {
      Event.dispatch(pen_tool_close);
      Event.dispatch(link_tool_active);
    } else {
      Event.dispatch(pen_tool_close);
      Event.dispatch(link_tool_close);
    }
  };

  render() {
    return (
      <div className={'header_mode-switch'}>
        <Radio.Group size={'small'} value={this.state.mode} onChange={this.handleModeChange}>
          <Radio.Button value="design">设计</Radio.Button>
          <Radio.Button value="pen">钢笔</Radio.Button>
          <Radio.Button value="link">连线</Radio.Button>
        </Radio.Group>
        {/* 线段样式切换（曲线/直角曲线）：跟随「连线」工具 */}
        <HeaderLinkStyle />
      </div>
    );
  }
}
