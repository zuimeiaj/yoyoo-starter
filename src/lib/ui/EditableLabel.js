/**
 *  created by yaojun on 2019/1/28
 *
 */

import React, { Fragment } from 'react';
import Types from 'prop-types';
import KeyEvent from '../service/KeyEvent';
import './EditableLabel.scss';

export default class EditableLabel extends React.Component {
  static propTypes = {
    onChange: Types.func,
    children: Types.any,
    value: Types.any,
    className: Types.string,
  };

  state = {
    mode: false,
  };

  handleDBClick = () => {
    if (this.state.mode) return;

    this.setState({ mode: true }, () => {
      this.refs.input.select();
    });
  };

  handleChange = (e) => {
    this.props.onChange(e.target.value);
    this.setState({ mode: false });
  };

  handleKeyUp = (e) => {
    e.stopPropagation();
    if (e.keyCode === KeyEvent.DOM_VK_RETURN) {
      this.handleChange(e);
    }
  };

  render() {
    const { className, value } = this.props;

    return (
      <div onDoubleClick={this.handleDBClick} className={`${this.state.mode ? 'editmode' : ''} ${className} aj-editable-component`}>
        <input
          style={{ display: this.state.mode ? 'block' : 'none' }}
          ref={'input'}
          onKeyUp={this.handleKeyUp}
          defaultValue={value}
          className={'editable-component_input'}
          onBlur={this.handleChange}
          data-event='ignore'
        />
        <span style={{ display: this.state.mode ? 'none' : 'block' }} title={value} className={'editable-component_text'}>
          {value}
        </span>
      </div>
    );
  }
}
