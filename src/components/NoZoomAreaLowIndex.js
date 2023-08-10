/**
 *  created by yaojun on 2018/12/8
 *
 */

import React from 'react';
import ReactEvents from '../lib/Widget/Events';
import ViewportBackground from '../lib/Widget/ViewportBackground';
import Stage from './Stage';

export default class NoZoomAreaLowIndex extends React.Component {
  render() {
    return (
      <Stage className={'editor-panel-background'}>
        <ViewportBackground />

        {/* Keyboard and menu events */}
        <ReactEvents />
        {/*/!* Highlight when component is selected *!/*/}
        {/*<ViewSelectedBordered/>*/}
        {/* Highlight when component is enter */}
      </Stage>
    );
  }
}
