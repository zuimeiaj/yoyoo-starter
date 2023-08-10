/**
 *  created by yaojun on 2018/12/13
 *
 */

import React from 'react';
import './NumberInput.scss';
import PropTypes from 'prop-types';

export default class NumberInput extends React.Component {
  static propTypes = {
    onChange: PropTypes.func,
    label: PropTypes.any,
    max: PropTypes.number,
    min: PropTypes.number,
    step: PropTypes.number,
    style: PropTypes.object,
    defaultValue: PropTypes.any,
    onPressEnter: PropTypes.func,
  };

  static defaultProps = {
    onChange: () => {},
    onPressEnter: () => {},
    min: -Infinity,
    max: Infinity,
    step: 1,
  };

  constructor() {
    super();
    this.value = '';
  }

  componentDidMount() {
    this.refs.input.addEventListener('keydown', this.onKeyDown, false);
    if ('defaultValue' in this.props) {
      this.value = this.props.defaultValue;
      this.refs.input.value = this.value;
    }
  }

  componentWillUnmount() {
    this.refs.input.removeEventListener('keydown', this.onKeyDown, false);
  }

  setValue = (value) => {
    if (value > this.props.max || value < this.props.min) return;
    this.value = value;
    this.refs.input.value = value;
  };

  _move = (i) => {
    let value = +this.value || 0;
    value += i;
    this.value = value;
    this.applyToDom(value);
    this.notifyChange();
  };

  onKeyDown = (e) => {
    e.stopPropagation();
    let key = e.keyCode;
    if (key === 38) {
      this._move(this.props.step);
    } else if (key === 40) {
      this._move(-this.props.step);
    } else if (key == 13) {
      this.props.onPressEnter(this.value);
    }
  };

  onInput = (e) => {
    e.stopPropagation();
    let error = isNaN(e.target.value);
    if (error) {
      this.applyToDom(this.value);
    } else {
      this.applyToDom(e.target.value);
      this.notifyChange();
    }
  };

  notifyChange = () => {
    this.props.onChange(+this.value);
  };

  applyToDom = (value) => {
    if (value > this.props.max) {
      this.value = this.props.max;
    } else if (value < this.props.min) {
      this.value = this.props.min;
    } else {
      this.value = value;
    }
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

  clickUp = () => {
    this._move(1);
  };

  clickDown = () => {
    this._move(-1);
  };

  render() {
    const { label, style, addon } = this.props;
    return (
      <div ref={'g'} style={style} className={'aj-number-input-control'}>
        {label && <label className={'aj-number-label'}>{label}</label>}
        <span className={'aj-number-input-wrapper'}>
          <input className={'aj-number-input'} onInput={this.onInput} ref={'input'} data-prevent='false' />
        </span>
        {addon && <label className={'aj-number-addon'}>{addon}</label>}
      </div>
    );
  }
}
