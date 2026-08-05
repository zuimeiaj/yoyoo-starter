/**
 *  created by yaojun on 2018/12/5
 *
 */

import React, { Fragment } from 'react';
import Ruler from './Ruler';
import Event from '../Base/Event';
import {
  component_active,
  component_drag,
  component_inactive,
  component_properties_change,
  editor_scroll_change,
  ruler_ready,
  window_size_change,
} from '../util/actions';
import config from '../util/preference';

export default class Rulers extends React.Component {
  componentWillMount() {
    Event.listen(editor_scroll_change, this.handleScrollChange);
    Event.listen(window_size_change, this.handleWindowSizeChange);
    // 选中组件包围盒缩影：激活/拖拽/属性变更/失活时更新，ruler 就绪后补推
    Event.listen(component_active, this.handleSelectionChange);
    Event.listen(component_drag, this.handleSelectionChange);
    Event.listen(component_properties_change, this.handlePropertiesChange);
    Event.listen(component_inactive, this.handleSelectionClear);
    Event.listen(ruler_ready, this.handleRulerReady);
  }

  handleWindowSizeChange = () => {
    let v = this.refs.rulerh.ruler;
    let h = this.refs.rulerv.ruler;
    if (v) v.update();
    if (h) h.update();
  };

  handleScrollChange = ({ isScale, x, y, scale }) => {
    const hr = this.refs.rulerh && this.refs.rulerh.ruler;
    const vr = this.refs.rulerv && this.refs.rulerv.ruler;
    if (!hr || !vr) return;
    if (isScale) {
      hr.setScale(scale);
      vr.setScale(scale);
    }
    hr.translate(x - config.originCoords.x);
    vr.translate(y - config.originCoords.y);
  };

  handlePropertiesChange = ({ target }) => {
    this.updateSelection(target);
  };
  handleSelectionChange = (target) => {
    this.updateSelection(target);
  };
  handleSelectionClear = () => {
    this.updateSelection(null);
  };
  // 标尺实例创建有 800ms 延迟：就绪后补推当前选中，避免期间选中变化丢失
  handleRulerReady = () => {
    this.applySelection();
  };
  updateSelection = (target) => {
    let rect = null;
    // 用 getOffsetTransform（旋转后 AABB）：旋转组件时标尺投影须覆盖视觉包围盒，getOffsetRect 是未旋转宽高
    // 临时组（ViewSelectGroupBordered）继承 ViewController，同样有该方法 —— 多选时投影整个包围盒
    if (target && typeof target.getOffsetTransform === 'function') {
      rect = target.getOffsetTransform();
    }
    this.selection = rect;
    this.applySelection();
  };
  applySelection = () => {
    const hr = this.refs.rulerh && this.refs.rulerh.ruler;
    const vr = this.refs.rulerv && this.refs.rulerv.ruler;
    if (hr) hr.setSelection(this.selection);
    if (vr) vr.setSelection(this.selection);
  };

  componentWillUnmount() {
    Event.destroy(editor_scroll_change, this.handleScrollChange);
    Event.destroy(window_size_change, this.handleWindowSizeChange);
    Event.destroy(component_active, this.handleSelectionChange);
    Event.destroy(component_drag, this.handleSelectionChange);
    Event.destroy(component_properties_change, this.handlePropertiesChange);
    Event.destroy(component_inactive, this.handleSelectionClear);
    Event.destroy(ruler_ready, this.handleRulerReady);
  }

  render() {
    return (
      <Fragment>
        <Ruler ref={'rulerh'} type={'h'} />
        <Ruler ref={'rulerv'} type={'v'} />
      </Fragment>
    );
  }
}
