/**
 *  created by yaojun on 2019/2/21
 *
 */

import React from 'react';
import ViewController from './ViewController';
import { Dom } from '../util/helper';
import { initialCoverageIndex } from '../global';

export default class ViewLine extends ViewController {
  initProperties() {
    let { width, rotation } = this.properties.transform;
    let g = Dom.of(this.refs.g);
    let dom = Dom.of(this.refs.container);
    g.background(this.properties.bg);
    dom.width(width);

    //  初始化层级，最后挂载的元素都在最上面
    if (this.properties.zIndex === -1) {
      this.properties.zIndex = initialCoverageIndex();
    }
    dom.zIndex(this.properties.zIndex);
    dom.showHide(!this.properties.settings.isHide);
  }

  setTransform(x, y, w, h, r) {
    super.setTransform(x, y, w, h, r);
    this.refs.g.setAttribute('d', `M0 3 L${w} 3`);
  }

  setColor(key, value) {
    Dom.of(this.refs.g).attr('stroke', value);
  }

  render() {
    let {
      transform: { x, y, rotation, width, height },
      border: { color, style },
    } = this.properties;
    let strokeDash = {};
    if (style == 'dashed') {
      strokeDash.strokeDasharray = 3;
      strokeDash.strokeDashoffset = 3;
    } else if (style == 'dotted') {
      strokeDash.strokeDasharray = 1;
      strokeDash.strokeDashoffset = 1;
    }
    return (
      <div
        data-uid={this.properties.id}
        style={{
          width,
          height,
          left: x,
          top: y,
          transform: `rotate(${rotation}deg)`,
        }}
        className={'view-line'}
        ref={'container'}
      >
        <svg style={{ height: 6, top: -2, position: 'absolute', width: '100%' }}>
          <path {...strokeDash} stroke={color} strokeWidth={1} y={2} d={`M0 3 L${width} 3`} ref={'g'} />
        </svg>
      </div>
    );
  }
}
