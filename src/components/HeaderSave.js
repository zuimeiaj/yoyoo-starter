/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react';
import { message } from 'antd';
import Event from '../lib/Base/Event';
import { context_save, context_save_failed, context_save_start, context_save_success, project_initialized } from '../lib/util/actions';
import IconText from '@/lib/ui/IconText';

export default class HeaderSave extends React.Component {
  state = {
    saving: false,
    lastSaveTime: null,
  };
  timer = null;

  componentWillMount() {
    Event.listen(context_save_start, this.handleSaveStart);
    Event.listen(context_save_success, this.handleSaveSuccess);
    Event.listen(context_save_failed, this.handleSaveFail);
    Event.listen(project_initialized, this.handleProjectInitialized);
  }

  // 20s才自动刷新一次
  handleProjectInitialized = () => {
    this.timer = setInterval(() => {
      Event.dispatch(context_save);
    }, 20 * 1000);
  };

  componentWillUnmount() {
    Event.destroy(context_save_start, this.handleSaveStart);
    Event.destroy(context_save_success, this.handleSaveSuccess);
    Event.destroy(context_save_failed, this.handleSaveFail);
    Event.destroy(project_initialized, this.handleProjectInitialized);
    clearInterval(this.timer);
  }

  handleSaveStart = () => {
    window.GlobalSaving = true;
    this.setState({ saving: true });
  };
  handleSaveFail = () => {
    window.GlobalSaving = false;
    message.error('保存失败');
  };
  handleSaveSuccess = () => {
    window.GlobalSaving = false;
    let date = new Date();
    let hours = date
      .getHours()
      .toString()
      .padStart(2, '0');
    let min = date
      .getMinutes()
      .toString()
      .padStart(2, '0');
    let sec = date
      .getSeconds()
      .toString()
      .padStart(2, '0');
    this.setState({ saving: false, lastSaveTime: [hours, min, sec].join(':') });
  };
  emitSave = () => {
    Event.dispatch(context_save);
  };

  render() {
    if (this.state.lastSaveTime) {
      title = `最后更新时间  ${this.state.lastSaveTime}`;
    }
    return (
      <IconText onClick={this.emitSave} className={'header_action-item'} icon={this.state.saving ? 'loading' : 'save'}>
        保存
      </IconText>
    );
  }
}
