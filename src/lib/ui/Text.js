/**
 *  created by yaojun on 2019/1/13
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

export default class Text extends React.Component {
  static propTypes = {
    defaultValue: PropTypes.string.isRequired,
  };

  state = {
    value: '',
  };

  componentWillMount() {
    this.state.value = this.props.defaultValue;
  }

  setValue = (value) => {
    this.setState({ value: value });
  };

  render() {
    const { value } = this.state;
    return <span>{value}</span>;
  }
}
