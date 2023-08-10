import React from 'react';
import DEFAULT_IMAGE from '';

export default class LazyLoadImage extends React.Component {
  static loadQueue = [];

  state = {
    load: false,
    source: 'url(../.././assets/head.jpg) no-repeat center',
  };

  render() {
    return <span style={{ backgroundImage: this.state.source, display: 'inline-block', backgroundSize: 'cover' }} />;
  }
}
