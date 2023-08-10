/**
 *  created by yaojun on 2019/1/16
 *
 */

import React from 'react';
import Types from 'prop-types';
import Icon from '../Icon';
import './TreeNode.scss';
import jQuery from 'jquery';
import Event from '../Base/Event';
import { component_enter } from '../util/actions';
import EditableLabel from '@/lib/ui/EditableLabel';

let currentDragId = null;

function checkCanDrop(e) {
  return !isParentById(e.target, currentDragId);
}

function isParentById(target, id) {
  let node = target.parentNode;
  while (node) {
    if (node.dataset.uid === id) {
      return true;
    }
    if (node.className === 'aj-component-tree') {
      return;
    }
    node = node.parentNode;
  }
}

class EditableName extends React.Component {
  static propTypes = {
    onChange: Types.func,
    value: Types.string,
    id: Types.string,
    onMove: Types.func,
    draggable: Types.bool,
  };

  state = {
    value: '',
    readonly: true,
  };

  editalbe() {
    this.setState({ readonly: false });
  }

  componentWillMount() {
    this.setState({ value: this.props.value });
  }

  componentWillReceiveProps = (props) => {
    if (props.value !== this.state.value) {
      this.setState({ value: props.value });
    }
  };

  handleChange = (e) => {
    let value = e.target.value;
    this.setState({ value });
  };

  handleKeyUp = (e) => {
    if (e.key.toLowerCase() === 'enter') {
      this.props.onChange(this.state.value);
      this.setState({ readonly: true });
    }
  };

  handleBlur = () => {
    this.setState({ readonly: true });
    if (this.props.value !== this.state.value) {
      this.props.onChange(this.state.value);
    }
  };

  handleDragStart = (e) => {
    if (this.state.readonly) {
      e.dataTransfer.setData('nodedrag', this.props.id);
      console.log(this.props.id);
      e.dataTransfer.effectAllowed = 'move';
      currentDragId = this.props.id;
    } else {
      e.preventDefault();
    }
  };

  // enter
  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (checkCanDrop(e)) {
      jQuery(e.target)
        .parent()
        .addClass('drag-over');
    }
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    let id = e.dataTransfer.getData('nodedrag');
    if (id && id !== this.props.id) {
      this.props.onMove(id, this.props.id, true);
    }
    jQuery(e.target)
      .parent()
      .removeClass('drag-over');
  };

  handleMouseLeave = (e) => {
    e.stopPropagation();
    jQuery(e.target)
      .parent()
      .removeClass('drag-over');
  };

  //over
  handleDragOverD = (e) => {
    if (checkCanDrop(e)) {
      e.preventDefault();
    }
  };

  render() {
    let dragHander = {};
    if (this.props.draggable) {
      dragHander = {
        draggable: true,
      };
    }
    return (
      <input
        draggable={this.state.readonly ? this.props.draggable : 'false'}
        onDragStart={this.handleDragStart}
        data-uid={this.props.id}
        className={`tree-node-editname ${this.state.readonly ? '' : 'editmode'}`}
        onBlur={this.handleBlur}
        readOnly={this.state.readonly}
        data-event='ignore'
        onKeyUp={this.handleKeyUp}
        onChange={this.handleChange}
        value={this.state.value}
      />
    );
  }
}

class TreeNode extends React.PureComponent {
  static propTypes = {
    path: Types.string,
    icon: Types.any,
    paddingLeft: Types.number,
    onSelect: Types.func,
    renderActions: Types.func,
    name: Types.string,
    id: Types.any.isRequired,
    parentid: Types.any,
    onNameChange: Types.func,
    onMove: Types.func,
    draggable: Types.bool,
    type: Types.string,
    hasChildren: Types.bool,
  };

  componentWillMount() {
    const { path, id } = this.props;
    this.handleSelect = () => this.props.onSelect(path, id);
    this.handleNameChange = (v) => this.props.onNameChange(path, id, v);
    this.paddingLeft = { paddingLeft: this.props.paddingLeft };
  }

  handleDoubleClick = () => {
    this.refs.name.editalbe();
  };

  handleDrop = (e) => {
    e.preventDefault();
    let dragid = e.dataTransfer.getData('nodedrag');
    jQuery(e.target).removeClass('drag-over');
    if (dragid != this.props.id) {
      this.props.onMove(dragid, this.props.id);
    }
  };

  //enter
  handleDropOver = (e) => {
    e.preventDefault();
    if (checkCanDrop(e)) {
      jQuery(e.target).addClass('drag-over');
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  handleMouseLeave = (e) => {
    jQuery(e.target).removeClass('drag-over');
  };

  // over
  handleOver = (e) => {
    if (checkCanDrop(e)) {
      e.preventDefault();
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  handleMouseEnter = (e) => {
    e.stopPropagation();
    let item = window.allWidgets[this.props.id];
    if (item) {
      Event.dispatch(component_enter, item.view);
    }
  };
  handleDragStart = (e) => {
    e.dataTransfer.setData('nodedrag', this.props.id);
  };

  render() {
    const { path, type, renderActions, onMove, hasChildren, id, parentid, name, paddingLeft, icon, onSelect } = this.props;
    return (
      <div onClick={this.handleSelect} style={this.paddingLeft} id={'treenode' + id} draggable={this.props.draggable} onDragStart={this.handleDragStart} className={'tree-node-name'}>
        {typeof icon == 'function' ? icon({ type, hasChildren }) : <Icon type={hasChildren ? 'mulu' : '13'} />}

        <EditableLabel onChange={this.handleNameChange} value={name} />
        {renderActions && <span className={'tree-node-actions'}>{renderActions({ id, name, path, type })}</span>}
      </div>
    );
  }
}

const noop = () => {};

export class Tree extends React.Component {
  static propTypes = {
    data: Types.array.isRequired,
    onSelect: Types.func,
    renderIcon: Types.func,
    domRef: Types.func,
    onNameChange: Types.func,
    onMove: Types.func,
    draggable: Types.bool,
    renderActions: Types.func,
  };

  static defaultProps = {
    onSelect: noop,
    domRef: noop,
    renderActions: noop,
  };

  componentDidMount() {
    this.props.domRef(this.refs.g);
  }

  handleSelect = (path, id) => {
    this.props.onSelect(path, id);
  };

  render() {
    const { onMove, onNameChange, renderIcon, onSelect, data, renderActions } = this.props;
    const loop = (children, parentPath, paddingLeft, parentid) => {
      return children.map((item, index) => {
        let _path = parentPath + index;
        let _subpath = _path + '-';
        let hasChildren = item.items && item.items.length > 0;
        return (
          <div data-uid={item.id} key={item.id}>
            <TreeNode
              draggable={this.props.draggable}
              parentid={parentid}
              icon={renderIcon}
              hasChildren={hasChildren}
              path={_path}
              onMove={onMove}
              paddingLeft={paddingLeft}
              type={item.type}
              renderActions={renderActions}
              onNameChange={onNameChange}
              onSelect={onSelect}
              name={item.alias || item.name}
              id={item.id}
            />
            {item.items && item.items.length > 0 && <div className={'tree-node-has-sub'}>{loop(item.items, _subpath, paddingLeft + 15, item.id)}</div>}
          </div>
        );
      });
    };
    return (
      <div ref={'g'} className={'aj-component-tree'}>
        {loop(data, '', 2)}
      </div>
    );
  }
}
