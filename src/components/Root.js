/**
 *  created by yaojun on 2018/11/6
 *
 */
import React from 'react';
import './Root.scss';
import Header from './Header';
import Outline from './Outline';
import Editor from './Editor';
import { context_hide_color_picker, context_hide_menu } from '../lib/util/actions';
import Event from '../lib/Base/Event';
import InspectorProps from './Inspector';
import { LocaleProvider } from 'antd';
import zhCN from 'antd/lib/locale-provider/zh_CN';
import Preview from './Preview';
export default class Component extends React.Component {
  onClick = () => {
    Event.dispatch(context_hide_menu);
    Event.dispatch(context_hide_color_picker);
  };

  render() {
    return (
      <LocaleProvider locale={zhCN}>
        <div onClick={this.onClick} className={'root-layout'}>
          <Header />
          <div className={'root-layout-content'}>
            <Outline />
            <Editor />
            <InspectorProps />
          </div>
          {/* 预览全屏遮罩（顶部"预览"按钮触发，需盖住 Header 设置面板） */}
          <Preview />
        </div>
      </LocaleProvider>
    );
  }
}
