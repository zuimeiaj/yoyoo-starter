/**
 *  created by yaojun on 2019/1/12
 *
 */

import React from 'react';
import Icon from '../Icon';
import PropTypes from 'prop-types';

export default class Checkbox extends React.Component {
  state = {
    checked: false,
  };

  static propTypes = {
    style: PropTypes.any,
    className: PropTypes.any,
    label: PropTypes.string,
    onChange: PropTypes.func,
  };

  static defaultProps = {
    onChange: () => {},
  };

  setValue = (checked = false) => {
    this.setState({ checked });
  };

  handleClick = () => {
    let checked = !this.state.checked;
    this.props.onChange(checked);
    this.setState({ checked });
  };

  render() {
    let { label, className, style } = this.props;
    let checked = this.state.checked ? 'checked' : 'uncheck';
    return (
      <div onClick={this.handleClick} className={`${className || ''} ${checked}`} style={style}>
        {label} <Icon type={`checkbox_${checked}`} />
      </div>
    );
  }
}
