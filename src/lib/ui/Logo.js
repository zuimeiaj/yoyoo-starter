/**
 *  created by yaojun on 2019/5/5
 *
 */

import React from 'react';
import PROPTYPES from 'prop-types';
import { getOSSUrl } from '../../api/config';

export default class Logo extends React.Component {
  static propTypes = {
    height: PROPTYPES.number,
  };

  render() {
    const { height = 32 } = this.props;
    return <img style={{ height }} src={getOSSUrl('logo/YOYOO.png')}></img>;
  }
}
