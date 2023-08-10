/**
 *  created by yaojun on 2019/1/1
 *
 */

import React from 'react';
import ViewController from './ViewController';
import { getTemporaryGroup, setCurrentEditor } from '../global/instance';
import { Dom } from '../util/helper';
import Event from '../Base/Event';
import { component_close_edit_mode, component_edit_mode } from '../util/actions';
import { getGroupId } from '../global/selection';

export default class ViewInput extends ViewController {
  /**
   * @override
   * @param e
   */
  onDBClick(e) {
    if (getGroupId()[this.properties.id] && getTemporaryGroup().isLockChildren) {
      super.onDBClick(e);
    } else {
      e.stopPropagation();
      let text = this.refs.text;
      text.removeAttribute('readonly');
      text.setAttribute('data-drag', false);
      setCurrentEditor(this);
      Event.dispatch(component_edit_mode);
    }
  }

  setColor(key, value) {
    if (key === 'bg') {
      Dom.of(this.refs.text).background(value);
    } else if (key == 'fontColor') {
      Dom.of(this.refs.text).fontColor(value);
    } else {
      super.setColor(key, value);
    }
  }

  /**
   * @override
   */
  initBackground() {
    Dom.of(this.refs.text).background(this.properties.bg);
  }

  /**
   * @override
   */
  initProperties() {
    super.initProperties();
    let wrapper = Dom.of(this.refs.text);
    this.refs.text.value = this.properties.fontData;
    let {
      font: { size, color },
      fontStyle,
    } = this.properties;
    wrapper.fontSize(size);
    wrapper.fontStyle(fontStyle);
    wrapper.fontColor(color);
  }

  _handleAreaChange = (e) => {
    e.stopPropagation();
    this.properties.fontData = e.target.value;
  };

  setEditorBlur() {
    let { text, preview } = this.refs;
    text.removeAttribute('data-drag');
    text.setAttribute('readonly', 'readonly');
    Event.dispatch(component_close_edit_mode);
  }

  _handleKeyUp = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.key.toLowerCase() === 'enter' && !e.shiftKey) {
      this.setEditorBlur();
    }
  };

  componentWillUnmount() {
    super.componentWillUnmount();
    setCurrentEditor(null);
  }

  getWrapperClassName() {
    return super.getWrapperClassName() + ' view-input';
  }

  renderContent() {
    return <input onKeyUp={this._handleKeyUp} onChange={this._handleAreaChange} readOnly={true} data-event='ignore' ref={'text'} />;
  }
}

export class ViewTextArea extends ViewInput {
  renderContent() {
    return <textarea onChange={this._handleAreaChange} data-event='ignore' ref={'text'} readOnly={true} onKeyUp={this._handleKeyUp} />;
  }
}
