/**
 *  created by yaojun on 2019/1/1
 *
 */
import React from 'react';
import ViewController from './ViewController';
import { setCurrentEditor } from '../global/instance';
import { Dom } from '../util/helper';
import Event from '../Base/Event';
import { component_close_edit_mode, component_edit_mode, component_properties_change } from '../util/actions';

export default class ViewText extends ViewController {
  // 按钮（ButtonProperties，fontData 'Button'）可自由调整宽高：全量手柄；
  // 文本只允许调整宽度（高度由 _fitHeight 自动包裹）：只显示左右圆点 + 包裹边框。
  // 注意：按钮与文本的 type 都是 'text'（反序列化后均为 TextProperties 实例），
  // 只能用 fontData 数据标记区分；用户改字体预设后按钮会退化为文本手柄，属预期内
  getResizeHandles = () => {
    if (this.properties.fontData === 'Button') {
      return ['rotation', 'tl', 'tm', 'tr', 'r', 'br', 'bm', 'bl', 'l', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom'];
    }
    return ['borderLeft', 'borderRight', 'borderTop', 'borderBottom', 'l', 'r'];
  };

  /**
   * @override
   * @param e
   */
  onDBClick(e) {
    if (this._parent && this._parent.isLockChildren) {
      super.onDBClick(e);
    } else {
      e.stopPropagation();
      let measure = this.refs.measure;
      measure.setAttribute('contenteditable', true);
      measure.setAttribute('data-drag', false);
      measure.setAttribute('data-event', 'ignore'); // 跳过全局快捷键（删除键等），否则编辑文本时按删除会删组件
      setCurrentEditor(this);
      measure.focus();
      selectTextRange(measure);
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
    this.refs.measure.innerHTML = this.properties.fontData;
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
    // 直接应用到 measure：字体样式只设容器靠继承时，编辑态（contenteditable）/结构变化可能失效
    if (this.refs.measure) {
      this.refs.measure.style.fontSize = size + 'px';
      this.refs.measure.style.color = color;
    }
  }

  setEditorBlur() {
    let measure = this.refs.measure;
    measure.blur();
    measure.removeAttribute('data-drag');
    measure.removeAttribute('data-event');
    measure.removeAttribute('contenteditable');
    Event.dispatch(component_close_edit_mode);
    this._fitHeight(); // 编辑退出，内容定型后高度自适应
  }

  resizeEnd() {
    super.resizeEnd();
    this._fitHeight(); // 宽度调整（换行变化）后高度自适应
  }

  componentDidUpdate(prevProps) {
    // 字号/行高/内容（走属性链路的变更）变化后高度重算
    let p = this.properties;
    let prev = prevProps && prevProps.properties;
    if (!prev || p.type !== 'text') return;
    if (p.fontData !== prev.fontData || p.font.size !== prev.font.size || p.spacing.height !== prev.spacing.height) {
      this._fitHeight();
    }
  }

  // 高度刚好包裹文本内容（measure 是自然块级 flex item，offsetHeight 即真实文本高度，无 flex 测量误差）
  _fitHeight() {
    // 仅纯文本组件高度自适应（button/comment 等固定高度不受影响）
    if (this.properties.type !== 'text') return;
    let measure = this.refs.measure;
    if (!measure) return;
    let h = Math.max(4, Math.ceil(measure.offsetHeight));
    if (Math.abs(h - this.properties.transform.height) >= 1) {
      // 提交完整 transform（含拖拽/移动后的 x/y/width）：属性变更链路从 state.items 树合并，
      // 只提交 {height} 会把拖拽后尚未落树的 width 重置回旧值（宽度坍塌）
      Event.dispatch(component_properties_change, {
        target: this,
        key: 'transform',
        value: Object.assign({}, this.properties.transform, { height: h }),
      });
    }
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
          this.refs.measure.innerHTML = text.innerText;
        });
      }
    }
  };

  renderContent() {
    return (
      <div ref={'wrapper'} className={`view-text view-text_${this.properties.type}`}>
        <div onPaste={this.handlePaste} onKeyUp={this._handleKeyUp} data-event='ignore' ref={'text'}>
          {/* measure：自然块级内容承载（flex item fit-content + max-width 换行），
              高度测量与编辑（contenteditable）的目标；外层 text 保留 flex 布局供 align 对齐 */}
          <div ref={'measure'} className={'view-text-measure'} />
        </div>
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
