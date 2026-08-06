/**
 *  created by yaojun on 2026/8/6
 *  平行四边形（流程图"输入/输出"节点）：上下边水平，左侧边按 SKEW 比例（宽度 20%）倾斜
 */

import React from 'react';
import ShapeTextController from './ShapeTextController';
import { Dom } from '../util/helper';
import { initialCoverageIndex } from '../global';

// 倾斜偏移 = 宽度 × SKEW（左上角向右偏移、右下角向左偏移）
const SKEW = 0.2;

export default class ViewParallelogram extends ShapeTextController {
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
    let off = width * SKEW;
    this.refs.line.setAttribute('points', `${off},0  ${width},0  ${width - off},${height}  0,${height}`);
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
    let off = width * SKEW;
    return (
      [
        <svg key={'s'} style={{ width: '100%', height: '100%' }} xmlns={'http://www.w3.org/2000/svg'} data-uid={this.properties.id} className={'view-parallelogram'}>
          <polygon ref={'line'} strokeWidth={sw} {...strokeDash} points={`${Math.max(off, 1)},1  ${width - 1},1  ${width - Math.max(off, 1)},${height - 1}  1,${height - 1}`} style={{ fill: bg, stroke: color }} />
        </svg>,
        this.renderText(),
      ]
    );
  }
}
