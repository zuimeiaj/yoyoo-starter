/**
 *  created by yaojun on 2018/12/13
 *
 */

import React from 'react';
import './NumberInput.scss';
import PropTypes from 'prop-types';

export default class TextInput extends React.Component {
  static propTypes = {
    onChange: PropTypes.func,
    label: PropTypes.any,
    style: PropTypes.object,
    placeholder: PropTypes.string,
    className: PropTypes.string,
  };

  static defaultProps = {
    onChange: () => {},
    className: '',
  };

  constructor() {
    super();
    this.value = '';
  }

  setValue = (value) => {
    this.value = value;
    this.refs.input.value = value;
  };

  onInput = (e) => {
    e.stopPropagation();
    this.applyToDom(e.target.value);
  };

  applyToDom = (value) => {
    this.value = value;
    this.refs.input.value = this.value;
  };

  disabled = (status) => {
    if (status) {
      this.refs.input.setAttribute('disabled', true);
      this.refs.g.className = 'aj-number-input-control disabled';
    } else {
      this.refs.g.className = 'aj-number-input-control';
      this.refs.input.removeAttribute('disabled');
    }
  };

  handleKeyUp = (e) => {
    let key = e.key.toLowerCase();
    if (key === 'enter') {
      this.props.onChange(this.value);
    }
  };

  render() {
    const { label, style, placeholder, className } = this.props;
    return (
      <div ref={'g'} style={style} className={`aj-number-input-control ${className}`}>
        {label && <label className={'aj-number-label'}>{label}</label>}
        <span className={'aj-number-input-wrapper'}>
          <input style={{ color: '#666' }} onKeyUp={this.handleKeyUp} placeholder={placeholder} className={'aj-number-input'} onInput={this.onInput} ref={'input'} data-event='ignore' />
        </span>
      </div>
    );
  }
}
