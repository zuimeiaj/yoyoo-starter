/**
 *  created by yaojun on 2018/12/16
 *
 */

import React from 'react';
import './Select.scss';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import { isEmpty, isPlainObject } from '../util/helper';

export default class Select extends React.Component {
  state = {
    options: [],
    visible: false,
    value: '',
    label: '',
    disabled: false,
    top: 40,
  };

  static propTypes = {
    onChange: PropTypes.func,
    defaultValue: PropTypes.any,
    options: PropTypes.array,
    style: PropTypes.object,
    className: PropTypes.string,
    renderItem: PropTypes.func,
    value: PropTypes.any,
  };

  static defaultProps = {
    onChange: () => {},
    options: [],
  };

  componentWillMount() {
    let value = this.props.defaultValue || this.props.value;
    let item = this.props.options.find((item) => {
      return (isBasicType(item) ? item : item.key) == value;
    });
    if (item) {
      let key = isPlainObject(item) ? item.key : item;
      let label = isPlainObject(item) ? item.label : item;
      this.setState({ value: key, label: label, options: this.props.options });
    } else {
      this.setState({ value: '', label: '', options: this.props.options });
    }
  }

  setOptions = (options = []) => {
    this.setState({ options });
  };

  componentWillReceiveProps(props) {
    let options = this.state.options;
    if (props.options != this.state.options) {
      options = props.options;
      this.setState({ options: props.options });
    }
    if ('value' in props) {
      if (isEmpty(props.value)) {
        this.setState({ value: '', label: '' });
      } else {
        if (props.value != this.state.value) {
          let item = this.findValue(options, props.value);
          if (item) {
            let value = isPlainObject(item) ? item.key : item;
            let label = isPlainObject(item) ? item.label : item;
            this.setState({ value, label });
          } else {
            this.setState({ value: '', label: '' });
          }
        }
      }
    }
  }

  onFocus = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ visible: true }, () => {
      this.getWrapperStyle();
    });
  };

  clear = () => {
    this.setState({ value: '', label: '' });
  };

  setValue = (value) => {
    let item = this.findValue(this.state.options, value);
    if (item) {
      let label = isBasicType(item) ? item : item.label;
      this.setState({ value, label });
    } else {
      this.setState({ value: '', label: '' });
    }
  };

  findValue = (options, value) => {
    return options.find((item) => {
      return isBasicType(item) ? item == value : item.key == value;
    });
  };

  onBlur = (e) => {
    if (this.isDown) return;
    e.stopPropagation();
    e.preventDefault();
    this.setState({ visible: false });
  };

  disable = (v) => {
    this.setState({ disabled: v });
  };

  onClick = (value, item, label) => {
    this.setState({ value, visible: false, label });
    this.props.onChange(value, item);
  };

  close = () => {
    this.setState({ value: void 0, label: '' });
    this.props.onChange();
  };

  getWrapperStyle() {
    setTimeout(() => {
      let rect = this.refs.wrapper.getBoundingClientRect();
      let poplist = this.refs.poplist.getBoundingClientRect();
      let top = rect.height;
      if (rect.height + rect.top + poplist.height > window.innerHeight) {
        top = -poplist.height - rect.height;
      }
      this.setState({ top });
    }, 20);
  }

  render() {
    const { style, className = '', renderItem } = this.props;
    return (
      <div ref={'wrapper'} style={style} className={`${className} aj-component-select ${this.state.value ? 'has-value' : ''}`}>
        <input readOnly disabled={this.state.disabled} value={this.state.label} onBlur={this.onBlur} onFocus={this.onFocus} className={'aj-input'} />

        <i className={this.state.visible ? 'arrow arrow-down' : 'arrow'}>▴</i>
        <Icon onClick={this.close} type={'guanbi'} />
        <div ref={'poplist'} style={{ display: this.state.visible ? 'block' : 'none', top: this.state.top }} className={'aj-select-poplist'}>
          <ul className={'aj-select-scroll'}>
            {this.state.options.map((item) => {
              let t = isBasicType(item),
                key,
                label;
              if (t) {
                label = item;
                key = item;
              } else {
                label = item.label;
                key = item.key;
              }
              return (
                <li className={this.state.value === key ? 'checked' : ''} onMouseDown={() => this.onClick(key, item, label)} key={key}>
                  {renderItem ? renderItem(item) : label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
}

const isBasicType = (n) => {
  return typeof n === 'string' || typeof n === 'number' || typeof n === 'boolean';
};
