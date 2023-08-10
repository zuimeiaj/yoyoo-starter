/**
 *  created by yaojun on 2019/5/5
 *
 */

import React from 'react';

export default class NoContent extends React.Component {
  render() {
    if (!this.props.show) return null;
    return (
      <div style={{ padding: 20, paddingLeft: 125, color: '#989898' }}>
        <img width={300} src={require('../../assets/no_project.png')} />
        ~~ 您还没有创建过任何项目
      </div>
    );
  }
}
