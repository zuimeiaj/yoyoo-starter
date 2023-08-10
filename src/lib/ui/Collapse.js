/**
 *  created by yaojun on 2019/1/17
 *
 */

import React from 'react';
import Types from 'prop-types';
import Icon from '../Icon';
import './Collapse.scss';

export default class Collapse extends React.Component {
  static propTypes = {
    title: Types.string,
    className: Types.string,
    style: Types.object,
    children: Types.any,
    collapse: Types.bool,
  };

  state = {
    collapse: false,
  };

  componentWillReceiveProps(props) {
    if (props.collapse !== void 0 && props.collapse != this.state.collapse) {
      this.setState({ collapse: props.collapse });
    }
  }

  componentWillMount() {
    this.setState({ collapse: this.props.collapse });
  }

  handleClick = () => {
    let v = !this.state.collapse;
    this.setState({ collapse: v });
    let onChange = this.props.onChange;
    onChange && onChange(v);
  };

  render() {
    const { title, className, style, children } = this.props;
    return (
      <div style={style} className={`${this.state.collapse ? 'collapse' : 'expand'} aj-component-collapse ${className || ''}`}>
        <div onClick={this.handleClick} className={'collapse-title'}>
          <span className={'left-title'}>{title}</span>
          <Icon rotation={this.state.collapse ? 180 : 0} type={'close'} />
        </div>
        <div className={'aj-component-collapse-content'}>{children}</div>
      </div>
    );
  }
}
