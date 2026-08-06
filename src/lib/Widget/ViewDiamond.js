/**
 *  created by yaojun on 2026/8/6
 *  菱形（流程图"判断"节点）：四边中点与 bbox 中点对齐，resize 时重算顶点
 */

import React from 'react';
import ShapeTextController from './ShapeTextController';
import { Dom } from '../util/helper';
import { initialCoverageIndex } from '../global';

export default class ViewDiamond extends ShapeTextController {
  initProperties() {
    let dom = Dom.of(this.refs.container);

    //  初始化层级，最后挂载的元素都在最上面
    if (this.properties.zIndex === -1) {
      this.properties.zIndex = initialCoverageIndex();
    }
    dom.zIndex(this.properties.zIndex);
    dom.showHide(!this.properties.settings.isHide);
  }

  setColor(key, value) {
    if (key == 'border') key = 'stroke';
    if (key == 'bg') key = 'fill';
    Dom.of(this.refs.line).css(key, value);
  }

  setTransform(x, y, w, h, r) {
    super.setTransform(x, y, w, h, r);
    let { width, height } = this.properties.transform;
    let ww = width / 2;
    let hh = height / 2;
    this.refs.line.setAttribute('points', `${ww},0  ${width},${hh}  ${ww},${height}  0,${hh}`);
  }

  renderContent() {
    let { width, height } = this.properties.transform;
    let {
      border: { width: sw, color, style },
      bg,
    } = this.properties;
    let strokeDash = {};
    if (style == 'dashed') {
      strokeDash.strokeDasharray = sw * 3;
      strokeDash.strokeDashoffset = 3;
    } else if (style == 'dotted') {
      strokeDash.strokeDasharray = sw;
      strokeDash.strokeDashoffset = sw;
    }
    let ww = width / 2;
    let hh = height / 2;
    return (
      [
        <svg key={'s'} style={{ width: '100%', height: '100%' }} xmlns={'http://www.w3.org/2000/svg'} data-uid={this.properties.id} className={'view-diamond'}>
          <polygon ref={'line'} strokeWidth={sw} {...strokeDash} points={`${ww},1  ${width - 1},${hh}  ${ww},${height - 1}  1,${hh}`} style={{ fill: bg, stroke: color }} />
        </svg>,
        this.renderText(),
      ]
    );
  }
}
