/**
 *  created by yaojun on 2026/8/6
 *  图形 + 文本控制器（矩形/菱形/平行四边形/六边形等流程图节点）：
 *  双击进入文本编辑（contenteditable，与 ViewText 同机制——data-event=ignore 跳过快捷键、
 *  data-drag=false 禁止拖拽、setCurrentEditor 注册编辑器、component_edit_mode 隐藏 resize 手柄），
 *  编辑内容存 properties.text（树与 properties 共享引用，直接落树持久化）。
 *  渲染：renderContent 里调用 renderText() 叠加文本节点（非编辑态 pointer-events:none 穿透，
 *  不挡组件拖拽/缩放/连线锚点）
 */

import React from 'react';
import ViewController from './ViewController';
import Event from '../Base/Event';
import { setCurrentEditor } from '../global/instance';
import { component_close_edit_mode, component_edit_mode } from '../util/actions';
import { selectTextRange } from './ViewText';

export default class ShapeTextController extends ViewController {
  /**
   * @override 双击进入文本编辑
   */
  onDBClick(e) {
    if (this._parent && this._parent.isLockChildren) {
      super.onDBClick(e);
    } else {
      e.stopPropagation();
      let measure = this.refs.text;
      measure.setAttribute('contenteditable', true);
      measure.setAttribute('data-drag', false);
      measure.setAttribute('data-event', 'ignore'); // 跳过全局快捷键（删除键等），否则编辑时按删除会删组件
      measure.style.pointerEvents = 'auto'; // 非编辑态穿透，编辑态恢复命中
      measure.style.userSelect = 'text';
      measure.style.outline = '1px dashed #1890ff';
      setCurrentEditor(this);
      measure.focus();
      selectTextRange(measure);
      Event.dispatch(component_edit_mode);
    }
  }

  /**
   * @override 退出编辑
   */
  setEditorBlur() {
    let measure = this.refs.text;
    measure.blur();
    measure.removeAttribute('data-drag');
    measure.removeAttribute('data-event');
    measure.removeAttribute('contenteditable');
    measure.style.pointerEvents = 'none';
    measure.style.userSelect = 'none';
    measure.style.outline = 'none';
    Event.dispatch(component_close_edit_mode);
  }

  _handleKeyUp = (e) => {
    if (e.key.toLowerCase() === 'enter' && !e.shiftKey) {
      this.setEditorBlur(); // Enter 结束编辑；Shift+Enter 换行（走 else 写回内容）
    } else {
      this.properties.text = e.target.innerHTML; // 树与 properties 共享引用，直接落树
    }
  };

  /** 文本节点：覆盖整个组件、水平垂直居中；非编辑态不拦鼠标（拖拽/缩放/连线锚点照常）。
   *  字体样式读 properties.font（{ size, color }，属性面板「字体」项可调） */
  renderText() {
    let font = this.properties.font || {};
    return (
      <div
        ref={'text'}
        onKeyUp={this._handleKeyUp}
        className={'shape-text'}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
          padding: '0 6px',
          fontSize: font.size || 14,
          color: font.color || '#333333',
          lineHeight: 1.4,
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
          cursor: 'default',
          pointerEvents: 'none',
          userSelect: 'none',
          outline: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: this.properties.text || '' }}
      />
    );
  }
}
