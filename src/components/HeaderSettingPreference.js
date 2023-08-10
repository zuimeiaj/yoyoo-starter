import React, { PureComponent } from 'react';
import NumberInput from '../lib/ui/NumberInput';
import './HeaderSettingsPreferences.scss';
import config from '../lib/util/preference';
import Types from 'prop-types';
import { Switch } from 'antd';
import jQuery from 'jquery';

export default class HeaderSettingPreference extends PureComponent {
  static propTypes = {
    onChange: Types.func,
  };
  values = {
    snap: jQuery.extend(true, {}, config.snap),
    grid: config.grid,
    autoAlign: config.autoAlign,
  };
  notifyChange = () => {
    this.props.onChange(this.values);
  };
  handleChange = (key, namespace, value) => {
    if (typeof value !== 'undefined') {
      this.values[key][namespace] = value;
    } else {
      this.values[key] = namespace;
    }
    this.notifyChange();
  };

  render() {
    return (
      <div className={'header_preferences'}>
        <div className={'preferences-title'}>自动对齐</div>
        <div className={'preferences-content'}>
          <div className={'preferences-form-item'}>
            <label>触发距离</label>
            <NumberInput onChange={(v) => this.handleChange('autoAlign', v)} max={5} min={0} defaultValue={config.autoAlign} />
            <div className={'preferences-form-item_extra'}>拖拽的组件与目标组件距离小于此值时，将自动与目标组件对齐</div>
          </div>
        </div>
        <div className={'preferences-title'}>显示网格</div>
        <div className={'preferences-content'}>
          <Switch defaultChecked={config.grid} onChange={(v) => this.handleChange('grid', v)} />
        </div>

        <div className={'preferences-title'}>移动单位</div>
        <div className={'preferences-content'}>
          <div className={'preferences-form-item'}>
            <label>X</label>
            <NumberInput onChange={(v) => this.handleChange('snap', 'x', v)} defaultValue={config.snap.x} />
            <div className={'preferences-form-item_extra'}>X轴每次移动距离</div>
          </div>
          <div className={'preferences-form-item'}>
            <label>Y</label>
            <NumberInput onChange={(v) => this.handleChange('snap', 'y', v)} defaultValue={config.snap.y} />
            <div className={'preferences-form-item_extra'}>Y轴每次移动距离</div>
          </div>
        </div>
      </div>
    );
  }
}
