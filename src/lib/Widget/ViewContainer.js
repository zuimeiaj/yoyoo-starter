/**
 *  created by yaojun on 2018/11/30
 *
 */

import React from 'react';
import ShapeTextController from './ShapeTextController';

// Default view（矩形）：bg/border/corner 由基类应用到容器，内容为可双击编辑的文本
export default class ViewContainer extends ShapeTextController {
  renderContent() {
    return this.renderText();
  }
}
