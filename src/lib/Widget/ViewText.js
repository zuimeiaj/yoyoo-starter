/**
 *  created by yaojun on 2019/1/1
 *
 */
import React from 'react';
import ViewController from './ViewController';
import { setCurrentEditor } from '../global/instance';
import { Dom } from '../util/helper';
import Event from '../Base/Event';
import { component_close_edit_mode, component_edit_mode } from '../util/actions';

export default class ViewText extends ViewController {
  /**
   * @override
   * @param e
   */
  onDBClick(e) {
    if (this._parent && this._parent.isLockChildren) {
      super.onDBClick(e);
    } else {
      e.stopPropagation();
      let text = this.refs.text;
      text.setAttribute('contenteditable', true);
      text.setAttribute('data-drag', false);
      setCurrentEditor(this);
      text.focus();
      selectTextRange(text);
      Event.dispatch(component_edit_mode);
    }
  }

  //Hack
  setColor(key, value) {
    console.log(key);
    if (key === 'fontColor') {
      Dom.of(this.refs.text).fontColor(value);
    } else {
      super.setColor(key, value);
    }
  }

  /**
   * @override
   */
  initProperties() {
    super.initProperties();
    let wrapper = Dom.of(this.refs.text);
    this.refs.text.innerHTML = this.properties.fontData;
    let {
      font: { size, color },
      fontStyle,
      decorator,
      spacing,
      align,
    } = this.properties;
    if (spacing) {
      wrapper.letterSpacing(spacing.width);
      wrapper.lineHeight(spacing.height);
    }
    if (align) {
      wrapper.alignY(align.y);
      wrapper.alignX(align.x);
    }
    wrapper.decorator(decorator);
    if (fontStyle) {
      wrapper.fontStyle(fontStyle);
    }
    wrapper.fontSize(size);
    wrapper.fontColor(color);
  }

  setEditorBlur() {
    let { text, preview } = this.refs;
    text.blur();
    text.removeAttribute('data-drag');
    text.removeAttribute('contenteditable');
    Event.dispatch(component_close_edit_mode);
  }

  _handleKeyUp = (e) => {
    if (e.key.toLowerCase() === 'enter' && !e.shiftKey) {
      this.setEditorBlur();
    } else {
      this.properties.fontData = e.target.innerHTML;
    }
  };

  componentWillUnmount() {
    super.componentWillUnmount();
    setCurrentEditor(null);
  }

  handlePaste = (e) => {
    e.stopPropagation();
    e.preventDefault();
    let items = e.clipboardData.items;
    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      if (item.kind === 'string') {
        item.getAsString((str) => {
          // 去掉HTML标签
          let text = document.createElement('div');
          text.innerHTML = str;
          this.refs.text.innerHTML = text.innerText;
        });
      }
    }
  };

  renderContent() {
    return (
      <div ref={'wrapper'} className={`view-text view-text_${this.properties.type}`}>
        <div onPaste={this.handlePaste} onKeyUp={this._handleKeyUp} data-event='ignore' ref={'text'} />
      </div>
    );
  }
}

export function selectTextRange(element) {
  var doc = document;
  if (doc.body.createTextRange) {
    var range = document.body.createTextRange();
    range.moveToElementText(element);
    range.select();
  } else if (window.getSelection) {
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
