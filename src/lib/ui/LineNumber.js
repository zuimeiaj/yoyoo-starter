/**
 *  created by yaojun on 2019/1/31
 *
 */

import React, { Fragment } from 'react';
import Event from '../Base/Event';
import { guide_move, guide_move_end } from '../util/actions';
import { Dom } from '../util/helper';
import './LineNumber.scss';
import config from '../util/preference';
import { pointToWorkspaceCoords } from '../global';

export default class LineNumber extends React.Component {
  componentDidMount() {
    this.line = Dom.of(this.refs.line);
    Event.listen(guide_move, this.handleMove);
    Event.listen(guide_move_end, this.handleEnd);
  }

  componentWillUnmount() {
    Event.destroy(guide_move, this.handleMove);
    Event.destroy(guide_move_end, this.handleEnd);
  }

  handleEnd = () => {
    this.line.hide();
  };

  handleMove = (coords) => {
    if (coords.isH) {
      this.line
        .show()
        .left(config.editorDomRect.left + 5)
        .top(coords.pageY + 10)
        .text(Math.round(pointToWorkspaceCoords(coords).y));
    } else {
      this.line
        .show()
        .left(coords.pageX + 5)
        .top(config.editorDomRect.top + 10)
        .text(Math.round(pointToWorkspaceCoords(coords).x));
    }
  };

  render() {
    return <div ref={'line'} className={'line_display-position'}></div>;
  }
}
