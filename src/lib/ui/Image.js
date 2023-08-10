/**
 *  created by yaojun on 2019/1/29
 *
 */

import React from 'react';
import Types from 'prop-types';
import DEFAULT from '../../assets/head.jpg';
import { DEFAULT_IMG } from '../util/helper';

export const IMAGE_MODE_FILL = 'fill';
export const IMAGE_MODE_SCALE = 'scale';
export const IMAGE_MODE_STRETCH = 'stretch';
export default class Image extends React.Component {
  static LazyImages = {};

  static LoadingImages = [];

  static propTypes = {
    src: Types.string.isRequired,
    className: Types.string,
    style: Types.object,
    lazyLoad: Types.bool,
    mode: Types.oneOf([IMAGE_MODE_FILL, IMAGE_MODE_SCALE, IMAGE_MODE_STRETCH]),
  };

  state = {
    source: DEFAULT,
  };

  componentWillReceiveProps = (props) => {
    if (props.src != this.props.src) {
      this.lazyLoadImage(props.src);
    }
  };

  componentDidMount() {
    this.lazyLoadImage(this.props.src);
  }

  lazyLoadImage = (src) => {
    if (this.props.lazyLoad) {
      loadImage(src).then(({ source, width, height }) => {
        if (this.refs.g) {
          // 防止刚尽力就离开，导致g已经被卸载了

          this.refs.g.style.background = `url(${source}) no-repeat center center`;
          let fillMode = {
            [IMAGE_MODE_FILL]: 'cover',
            [IMAGE_MODE_SCALE]: 'contain',
            [IMAGE_MODE_STRETCH]: '100% 100%',
          };
          this.refs.g.style.backgroundSize = fillMode[this.props.mode];
        }
      });
    }
  };

  render() {
    const { className = '', style = {}, src } = this.props;
    return (
      <span
        className={this.props.className}
        style={{
          ...this.props.style,
          width: '100%',
          height: '100%',
          display: 'inline-block',
        }}
        ref={'g'}
      />
    );
  }
}

const LazyLoadImages = [];
const LazyLoadImageSource = {};
let loading = false;
let delayTime = 300;

export class LazyLoad extends React.Component {
  state = {
    src: DEFAULT_IMG,
  };

  componentWillReceiveProps = (props) => {
    if (props.src != this.props.src) {
      this.lazyLoadImage(props.src);
    }
  };

  componentWillMount() {
    this.lazyLoadImage(this.props.src);
  }

  lazyLoadImage = (src) => {
    if (!src) return;
    loadImage(src).then(({ source, width, height }) => {
      this.setState({ src: source });
    });
  };

  render() {
    const { className, style } = this.props;
    return <img className={className} style={style} src={this.state.src} />;
  }
}

async function loadImage(source) {
  return new Promise((resolve) => {
    let d = LazyLoadImageSource[source];
    if (d) {
      return resolve(d);
    }
    LazyLoadImages.push({ source, callback: resolve });
    processImage();
  });
}

async function _delay(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

async function processImage() {
  if (loading) return;
  loading = true;
  let source = LazyLoadImages.shift();
  await _delay(delayTime);
  await _createImage(source);
  loading = false;
  if (LazyLoadImages.length != 0) {
    processImage();
  }
}

async function _createImage({ source, callback }) {
  return new Promise((resolve) => {
    let image = new window.Image();
    image.onload = function() {
      let data = { source, width: this.naturalWidth, height: this.naturalHeight };
      LazyLoadImageSource[source] = data;
      callback(data);
      resolve();
      callback = null;
      source = null;
      image = null;
    };
    image.onerror = function() {
      resolve();
    };
    image.src = source;
  });
}
