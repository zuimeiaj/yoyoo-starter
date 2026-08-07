/**
 *  created by yaojun on 2019/1/16
 *
 */

import React from 'react';
import Types from 'prop-types';
import Icon from '../Icon';
import './TreeNode.scss';
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
      e.target.parentElement.classList.add('drag-over');
    }
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    let id = e.dataTransfer.getData('nodedrag');
    if (id && id !== this.props.id) {
      this.props.onMove(id, this.props.id, true);
    }
    e.target.parentElement.classList.remove('drag-over');
  };

  handleMouseLeave = (e) => {
    e.stopPropagation();
    e.target.parentElement.classList.remove('drag-over');
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
    e.target.classList.remove('drag-over');
    if (dragid != this.props.id) {
      this.props.onMove(dragid, this.props.id);
    }
  };

  //enter
  handleDropOver = (e) => {
    e.preventDefault();
    if (checkCanDrop(e)) {
      e.target.classList.add('drag-over');
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  handleMouseLeave = (e) => {
    e.target.classList.remove('drag-over');
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

// 虚拟滚动：节点行高（px，与 scss .tree-virtual-row 强制高度一致）+ 预渲染缓冲行数。
// 行高固定是切片计算的前提；调整行高时两处必须同步
const ROW_H = 30;
const OVERSCAN = 10;

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
    // 图层列表（组件树）模式：自定义节点内容 + 受控选中高亮 + 滚动到底回调（懒加载分页）
    renderNode: Types.func,
    selectedKeys: Types.array,
    onScrollBottom: Types.func,
  };

  static defaultProps = {
    onSelect: noop,
    domRef: noop,
    renderActions: noop,
    selectedKeys: [],
  };

  state = { scrollTop: 0, viewH: 0 };

  componentDidMount() {
    this.props.domRef(this.refs.g);
    this._updateViewH();
    window.addEventListener('resize', this._updateViewH);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._updateViewH);
  }

  // 树展平为可见节点数组（当前树无折叠功能，全展开；缩进层级保留）。
  // 虚拟滚动必须平级渲染（原嵌套 tree-node-has-sub 结构移除），行高固定 + 占位撑开滚动空间
  _flatten() {
    let flat = [];
    const walk = (children, parentPath, paddingLeft, parentid) => {
      children.forEach((item, index) => {
        let _path = parentPath + index;
        let _subpath = _path + '-';
        let hasChildren = item.items && item.items.length > 0;
        flat.push({ item, path: _path, subpath: _subpath, paddingLeft, parentid, hasChildren });
        if (hasChildren) walk(item.items, _subpath, paddingLeft + 15, item.id);
      });
    };
    walk(this.props.data, '', 2);
    return flat;
  }

  _updateViewH = () => {
    let viewH = this.refs.g ? this.refs.g.clientHeight : 0;
    if (viewH !== this.state.viewH) this.setState({ viewH });
  };

  handleScroll = (e) => {
    let el = e.target;
    let scrollTop = el.scrollTop;
    if (scrollTop !== this.state.scrollTop) this.setState({ scrollTop });
    this._updateViewH();
    // 滚动到底（±60px 缓冲）→ 懒加载回调（图层列表分页加载）
    let { onScrollBottom } = this.props;
    if (onScrollBottom && el.scrollHeight - scrollTop - el.clientHeight < 60) {
      onScrollBottom();
    }
  };

  handleSelect = (path, id) => {
    this.props.onSelect(path, id);
  };

  render() {
    const { onMove, onNameChange, renderIcon, onSelect, data, renderActions, draggable, renderNode, selectedKeys, onScrollBottom } = this.props;
    // 虚拟切片：只渲染可视区（±缓冲）节点，上下用占位 div 撑开滚动空间
    let flat = this._flatten();
    let { scrollTop, viewH } = this.state;
    let start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
    let end = Math.min(flat.length, Math.ceil((scrollTop + (viewH || 600)) / ROW_H) + OVERSCAN);
    let visible = flat.slice(start, end);
    return (
      <div ref={'g'} className={'aj-component-tree'} onScroll={this.handleScroll}>
        <div style={{ height: start * ROW_H }} />
        {visible.map((n) => {
          let selected = renderNode && selectedKeys.indexOf(n.item.id) > -1;
          return (
            <div
              data-uid={n.item.id}
              key={n.item.id}
              className={'tree-virtual-row' + (renderNode ? ' tree-virtual-row-custom' : '') + (selected ? ' selected' : '')}
              // renderNode 模式（组件树）：行级统一选中；页面树模式由 TreeNode 内部 onClick 处理
              onClick={renderNode ? () => this.handleSelect(n.path, n.item.id) : undefined}
            >
              {renderNode ? (
                renderNode(n.item)
              ) : (
                <TreeNode
                  draggable={draggable}
                  parentid={n.parentid}
                  icon={renderIcon}
                  hasChildren={n.hasChildren}
                  path={n.path}
                  onMove={onMove}
                  paddingLeft={n.paddingLeft}
                  type={n.item.type}
                  renderActions={renderActions}
                  onNameChange={onNameChange}
                  onSelect={onSelect}
                  name={n.item.alias || n.item.name}
                  id={n.item.id}
                />
              )}
            </div>
          );
        })}
        <div style={{ height: (flat.length - end) * ROW_H }} />
      </div>
    );
  }
}
