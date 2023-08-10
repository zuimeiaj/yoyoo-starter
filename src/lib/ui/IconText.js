/**
 *  created by yaojun on 2019/1/16
 *
 */

import React from 'react';
import Icon from '../Icon';
import PropTypes from 'prop-types';
import RectDOM from 'react-dom';

export default class IconText extends React.PureComponent {
  static propTypes = {
    icon: PropTypes.string.isRequired,
    children: PropTypes.any,
    className: PropTypes.string,
    style: PropTypes.object,
    onClick: PropTypes.func,
  };

  static defaultProps = () => {
    onclick: () => {};
  };

  render() {
    const { icon, children, className, style, onClick } = this.props;

    return (
      <div onClick={onClick} className={className} style={style}>
        <Icon className={'icon-text_icon'} type={icon} />
        {children}
      </div>
    );
  }
}

export class ImageText extends React.PureComponent {
  static propTypes = {
    image: PropTypes.string.isRequired,
    children: PropTypes.any,
    className: PropTypes.string,
    style: PropTypes.object,
  };

  render() {
    const { image, children, className, style } = this.props;

    return (
      <div className={className} style={style}>
        <img style={{ pointerEvents: 'none' }} src={image} />
        {children}
      </div>
    );
  }
}
