/**
 *  created by yaojun on 2019/1/26
 *
 */
import React, { Fragment } from 'react';
import Event from '../lib/Base/Event';
import { context_redo, context_undo, workspace_push, workspace_redo, workspace_undo } from '../lib/util/actions';
import IconText from '@/lib/ui/IconText';

export default class HistoryControl extends React.Component {
  state = {
    disableRedo: true,
    disableUndo: true,
  };

  componentWillMount() {
    Event.listen(workspace_undo, this.handle);
    Event.listen(workspace_push, this.handlePush);
    Event.listen(workspace_redo, this.handle);
  }

  componentWillUnmount() {
    Event.destroy(workspace_undo, this.handle);
    Event.destroy(workspace_push, this.handlePush);
    Event.destroy(workspace_redo, this.handle);
  }

  handle = (l1, l2) => {
    this.setState({ disableUndo: l1 === 1, disableRedo: l2 === 0 });
  };
  handlePush = (length) => {
    this.setState({ disableUndo: length < 2, disableRedo: true });
  };
  redo = () => {
    if (!this.state.disableRedo) Event.dispatch(context_redo);
  };
  undo = () => {
    if (!this.state.disableUndo) Event.dispatch(context_undo);
  };

  render() {
    return (
      <Fragment>
        <IconText onClick={this.undo} icon={'undo2'} className={`header_action-item ${this.state.disableUndo ? 'disabled' : ''}`}>
          撤销
        </IconText>
        <IconText onClick={this.redo} icon={'redo'} className={`header_action-item ${this.state.disableRedo ? 'disabled' : ''}`}>
          重做
        </IconText>
      </Fragment>
    );
  }
}
