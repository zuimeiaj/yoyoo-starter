/**
 *  created by yaojun on 2018/12/7
 *
 */
import React from 'react';
import ViewResizable from '../lib/Widget/ViewResizable';
import Stage from './Stage';
import Snapline from '../lib/Widget/Snapline';
import Guides from '../lib/Widget/Guides';
import HighlightComponentOnComponentEneter from '../lib/Widget/HighlightComponentOnComponentEneter';
import HighlightComponentOnAligned from '../lib/Widget/HighlightComponentOnAligned';
import HighlightOnChildDraging from '../lib/Widget/HighlightOnChildDraging';
import PositionInfo from '../lib/Widget/PositionInfo';
export default class NoZoomAreaHighIndex extends React.Component {
  render() {
    return (
      <Stage>
        <ViewResizable />
        {/* Snapline */}
        <Snapline />

        <Guides type={'v'} />

        <Guides type={'h'} />

        {/*Enter*/}
        <HighlightComponentOnComponentEneter />
        {/*Align*/}
        <HighlightComponentOnAligned />

        <HighlightOnChildDraging />

        <PositionInfo />
      </Stage>
    );
  }
}
