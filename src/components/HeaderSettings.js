/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react';
import { ActionHandler, ActionKeyCodeMaps, ActionNames, CombomKeyNumber, CombomKeys, CombomKeysArray, updateKeyCodeMap } from '../lib/service/KeyboradHandler';
import { getKeyCodeFormat, KeyCode } from '../lib/service/KeyEvent';
import Types from 'prop-types';
import Button from '../lib/ui/Button';
import Event from '../lib/Base/Event';
import { refresh_editor_config, workspace_setting_show } from '../lib/util/actions';
import HeaderSettingPreference from './HeaderSettingPreference';
import { updatePreferences } from '../lib/util/preference';
import { Modal } from 'antd';
import IconText from '@/lib/ui/IconText';

let UpdateActionHandlers = {};

class ShortcutsItem extends React.PureComponent {
  static propTypes = {
    onComboChange: Types.func,
    onChange: Types.func,
    item: Types.string,
    mode: Types.bool,
  };
  handleChange = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!this.props.item.endsWith(e.keyCode) && !CombomKeyNumber[e.keyCode]) {
      this.props.onChange(this.props.item, e.keyCode);
    }
  };
  handleComboClick = (currentComboKey, selectedKeys) => {
    let key = this.props.item;
    let index = selectedKeys.indexOf(currentComboKey);
    if (index > -1) {
      selectedKeys.splice(index, 1);
    } else {
      selectedKeys.push(currentComboKey);
    }
    let combo = selectedKeys.length == 0 ? 0 : selectedKeys.reduce((a, b) => a | b);
    let newKey = key.split(',');
    newKey[0] = combo;
    this.props.onComboChange(key, newKey.join(','));
  };

  render() {
    let item = this.props.item;
    let array = item.split(',');
    let combo = +array[0];
    let code = array[1];
    let comboKeys = CombomKeysArray.filter((item) => {
      item = +item;
      return (combo & item) == item;
    }).sort((a, b) => b - a);
    // 编辑模式
    let editMode = this.props.mode;
    return (
      <div className={'settings_shortcut-item'}>
        <span className={'settings_shortcuts-name'}>{ActionNames[UpdateActionHandlers[item]]}</span>
        {editMode
          ? CombomKeysArray.map((item) => (
              <span
                key={item}
                onClick={() => this.handleComboClick(item, comboKeys)}
                className={`settings_shortcuts-combo settings_shortcuts-editmode ${comboKeys.indexOf(item) > -1 ? 'selected' : ''}`}
              >
                {getKeyCodeFormat(CombomKeys[item])}
              </span>
            ))
          : comboKeys.map((item) => (
              <span key={item} className={'settings_shortcuts-combo'}>
                {getKeyCodeFormat(CombomKeys[item])}
              </span>
            ))}
        {editMode ? (
          <input onKeyUp={this.handleChange} data-event='ignore' value={getKeyCodeFormat(KeyCode[code])} className={'settings_shortcuts-key'} />
        ) : (
          <span className={'settings_shortcuts-key'}>{getKeyCodeFormat(KeyCode[code])}</span>
        )}
      </div>
    );
  }
}

class Shortcuts extends React.Component {
  state = {
    mode: false,
    actions: Object.keys(ActionKeyCodeMaps)
      .sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0))
      .map((item) => ActionKeyCodeMaps[item]),
  };

  componentWillMount() {
    this.ActionHandler = Object.assign({}, ActionHandler);
    UpdateActionHandlers = this.ActionHandler;
  }

  toggleMode = () => {
    this.setState({ mode: !this.state.mode });
  };
  handleComboChange = (oldkey, newKey) => {
    let action = this.ActionHandler[oldkey];
    let index = this.state.actions.indexOf(oldkey);
    if (this.state.actions.indexOf(newKey) > -1) {
      Modal.info({
        title: '提示',
        content: '该组合键已被使用',
      });
    } else {
      let actions = this.state.actions;
      actions[index] = newKey;
      delete this.ActionHandler[oldkey];
      this.ActionHandler[newKey] = action;
      this.setState({ actions });
      this.props.onChange(this.ActionHandler);
    }
  };
  handleChange = (key, code) => {
    let oindex = this.state.actions.indexOf(key);
    let okey = key;
    let action = this.ActionHandler[key];
    key = key.split(',');
    key[1] = code;
    key = key.join(',');
    if (this.state.actions.indexOf(key) > -1) {
      // has exits
      alert('Already exist ');
    } else {
      let actions = this.state.actions;
      // New key
      actions[oindex] = key;
      this.ActionHandler[key] = action;
      this.setState({ actions });
      this.props.onChange(this.ActionHandler);
    }
  };

  render() {
    return (
      <div className={'header_shortcuts'}>
        <div className={'header_shortcuts-custom'}>
          <a onClick={this.toggleMode}>{this.state.mode ? '保存' : '自定义快捷键'} </a>
        </div>

        <div className='header-shortcuts-wrapper'>
          {this.state.actions.map((item) => {
            return <ShortcutsItem onComboChange={this.handleComboChange} onChange={this.handleChange} key={item} mode={this.state.mode} item={item} />;
          })}
        </div>
      </div>
    );
  }
}

export class Settings extends React.Component {
  state = {
    show: false,
  };
  // 快捷键设置
  shortcuts = null;
  //  工具设置
  preference = null;

  componentDidMount() {
    Event.listen(workspace_setting_show, this.toggleShow);
  }
  componentWillUnmount() {
    Event.destroy(workspace_setting_show, this.toggleShow);
  }

  toggleShow = () => {
    this.setState({ show: !this.state.show });
  };
  hide = () => {
    this.setState({ show: false });
  };
  save = () => {
    if (this.shortcuts) {
      let s = this.shortcuts;
      updateKeyCodeMap(s);
      Event.dispatch(refresh_editor_config, { key: 'shortcuts', value: this.shortcuts });
      this.shortcuts = null;
    }
    if (this.preference) {
      updatePreferences(this.preference);
      this.preference = null;
    }
    this.hide();
  };

  render() {
    if (this.state.show === false) return null;
    return (
      <div ref={'g'} className={'header_settings-panel'}>
        <div className={'settings-panel_form'}>
          <Shortcuts onChange={(shortcuts) => (this.shortcuts = shortcuts)} />
          <HeaderSettingPreference onChange={(preference) => (this.preference = preference)} />
        </div>
        <div className={'settings-panel_bar'}>
          <div>
            <Button onClick={this.hide} type={'default'}>
              取消
            </Button>{' '}
            <Button onClick={this.save} type={'primary'}>
              应用
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default class HeaderSettings extends React.Component {
  handleSettingClick = (e) => {
    e.stopPropagation();
    Event.dispatch(workspace_setting_show);
  };

  render() {
    return (
      <React.Fragment>
        <IconText onClick={this.handleSettingClick} className={'header_action-item'} icon={'shezhi1'}>
          设置
        </IconText>
      </React.Fragment>
    );
  }
}
