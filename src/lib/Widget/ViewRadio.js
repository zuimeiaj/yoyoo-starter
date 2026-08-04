/**
 *  created by yaojun on 2026/8/4
 *  单选组件：渲染选项列表（圆圈 + 文本），行首 ">" 的选项为默认选中态。
 *  交互与下拉选择一致：双击弹出 textarea 编辑选项（换行分隔，">" 表示默认选中），blur 写回。
 */
import React, { Fragment } from 'react';
import ViewController from '../Widget/ViewController';
import './ViewRadio.scss';
import { Dom } from '../util/helper';
import Event from '../Base/Event';
import { component_close_edit_mode, component_edit_mode, component_properties_change } from '../util/actions';
import { getTemporaryGroup, setCurrentEditor } from '../global/instance';
import { getGroupId } from '../global/selection';

const ROW_HEIGHT = 22; // 每行选项高度（px），与 scss 保持一致

// 单选/多选不允许整体缩放和旋转：ViewResizable 通过 getResizeHandles 钩子仅显示包裹边框 + 左右圆点（可调宽度）。
// 放实例属性而非 properties（不随数据序列化，不受历史数据覆盖）
const LOCK_HANDLES = ['borderLeft', 'borderRight', 'borderTop', 'borderBottom', 'l', 'r'];

export default class ViewRadio extends ViewController {
  getResizeHandles = () => LOCK_HANDLES;

  onDBClick(e) {
    if (getGroupId()[this.properties.id] && getTemporaryGroup().isLockChildren) {
      super.onDBClick(e);
    } else {
      e.stopPropagation();
      let poplist = this.refs.poplist;
      // 回显当前选项值并聚焦，blur 写回（非受控 textarea，直接设 DOM value）
      poplist.value = this.properties.radioOptions || '';
      Dom.of(poplist)
        .show()
        .top(this.properties.transform.height + 3);
      poplist.focus();
      setCurrentEditor(this);
      Event.dispatch(component_edit_mode);
    }
  }

  setEditorBlur = () => {
    Event.dispatch(component_close_edit_mode);
    if (this.refs.poplist) {
      Dom.of(this.refs.poplist).hide();
    }
    this._fitHeight(); // 选项数量变化后高度自适应
  };

  resizeEnd() {
    super.resizeEnd();
    this._fitHeight(); // 宽度调整完成后高度自适应
  }

  // 高度刚好包裹选项列表（列表不设高度自然撑开，offsetHeight 即真实内容高度，flex-wrap 换行同样精确）
  _fitHeight() {
    let list = this.refs.list;
    if (!list) return;
    let h = Math.max(4, Math.ceil(list.offsetHeight));
    if (Math.abs(h - this.properties.transform.height) >= 1) {
      Event.dispatch(component_properties_change, {
        target: this,
        key: 'transform',
        value: { height: h },
      });
    }
  }

  setColor(key, value) {
    if (key == 'fontColor') {
      this.forceUpdate(); // 选项文本颜色是 React 渲染（font.color），直接重渲染
    } else {
      super.setColor(key, value);
    }
  }

  getWrapperClassName() {
    return super.getWrapperClassName() + ' view-radio';
  }

  _handlePoplistChange = (e) => {
    this.properties.radioOptions = e.target.value;
    this.forceUpdate();
    this._fitHeight(); // 选项值变化时高度实时重算
  };

  componentDidUpdate(prevProps) {
    // 水平/垂直切换后高度重算（direction 走属性变更链路，渲染完成后测量）
    let prev = prevProps && prevProps.properties;
    if (prev && this.properties.direction !== prev.direction) {
      this._fitHeight();
    }
  }

  renderContent() {
    let options = (this.properties.radioOptions || '').split('\n').filter((t) => t.trim());
    let horizontal = this.properties.direction === 'horizontal';
    return (
      <Fragment>
        <div ref={'list'} className={`view-radio-list ${horizontal ? 'horizontal' : ''}`}>
          {options.map((opt, i) => {
            let text = opt.trim();
            let checked = text.startsWith('>');
            if (checked) text = text.slice(1);
            return (
              <div className={'view-radio-item'} key={i}>
                <span className={`view-radio-dot ${checked ? 'checked' : ''}`} />
                <span className={'view-radio-label'} style={{ color: this.properties.font.color }}>
                  {text}
                </span>
              </div>
            );
          })}
        </div>
        <textarea
          onBlur={this.setEditorBlur}
          onChange={this._handlePoplistChange}
          data-event='ignore'
          data-drag='false'
          ref={'poplist'}
          className={'aj-select-poplist'}
          placeholder={'换行分隔，">" 表示默认选中该项，示例：\n > a \n b \n c '}
        ></textarea>
      </Fragment>
    );
  }
}
