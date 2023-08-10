/**
 *  created by yaojun on 2019/1/24
 *
 */

import React, { Fragment } from 'react';
import Types from 'prop-types';
import './Poplist.scss';

export default class Poplist extends React.Component {
  static propTypes = {
    className: Types.string,
    style: Types.object,
    children: Types.any.isRequired,
    overlay: Types.any.isRequired,
  };

  state = {
    show: false,
    top: 0,
    left: 0,
  };

  handleToggleDisplay = () => {
    let rect = this.refs.emitter.getBoundingClientRect();
    this.setState({ show: true, left: 0, top: rect.height - 1 });
  };

  handleMouseLeave = () => {
    this.setState({ show: false });
  };

  render() {
    const { children, overlay } = this.props;
    return (
      <span onMouseLeave={this.handleMouseLeave} onMouseEnter={this.handleToggleDisplay} className={'aj-poplist'}>
        <span ref={'emitter'} className={'aj-poplist_emitter'}>
          {children}
        </span>
        {this.state.show && (
          <div style={{ top: this.state.top }} className={'aj-poplist_list'}>
            {overlay}
          </div>
        )}
      </span>
    );
  }
}

export class Menu extends React.Component {
  static propTypes = {
    onClick: Types.func,
    style: Types.object,
    children: Types.any,
  };

  handleClick = (e) => {
    let target = this.findMenuItem(e);
    if (target) {
      let disabled = target.dataset.disabled;
      if (disabled !== 'true') this.props.onClick(target.dataset.id);
    }
  };

  findMenuItem = (e) => {
    let parent = e.target;
    while (parent) {
      if (parent.dataset && parent.dataset.id) return parent;
      parent = parent.parentNode;
    }
  };

  render() {
    let { children } = this.props;
    return (
      <div onClick={this.handleClick} style={this.props.style} className={'aj-menus'}>
        {typeof children === 'function' ? children() : children}
      </div>
    );
  }
}

export class MenuItem extends React.PureComponent {
  static propTypes = {
    label: Types.any,
    extra: Types.any,
    disabled: Types.bool,
    action: Types.string.isRequired,
  };

  getClassName = () => {
    return 'aj-menus_item ' + (this.props.disabled ? 'disabled' : '');
  };

  render() {
    const { label, extra, action, disabled } = this.props;
    return (
      <div data-disabled={disabled} data-id={action} className={this.getClassName()}>
        <span className={'aj-menus_item-label'}>{label}</span>
        <span className={'aj-menus_item-extra'}>{extra}</span>
      </div>
    );
  }
}
