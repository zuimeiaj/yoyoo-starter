/**
 *  created by yaojun on 2018/11/30
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { HorizontalRuler, VerticalRuler } from '../Ruler';
import Event from '../Base/Event';
import { ruler_ready } from '../util/actions';

export default class Ruler extends React.Component {
  static defaultProps = {
    type: 'h',
  };
  static propTypes = {
    type: PropTypes.oneOf(['h', 'v']),
  };

  componentDidMount() {
    setTimeout(() => {
      if (this.props.type === 'h') {
        this.ruler = new HorizontalRuler(this.refs.canvas);
      } else {
        this.ruler = new VerticalRuler(this.refs.canvas);
      }
      // 通知容器标尺已就绪（容器补推选中组件包围盒缩影，避免创建延迟期间选中变化丢失）
      Event.dispatch(ruler_ready, this.ruler);
    }, 800);
  }
  render() {
    return (
      <div id={`editor-ruler-${this.props.type}`} className={`editor-ruler-${this.props.type}`}>
        <canvas ref={'canvas'}></canvas>
      </div>
    );
  }
}
