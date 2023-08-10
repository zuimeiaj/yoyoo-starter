/**
 *  created by yaojun on 2019/4/11
 *
 */
import React from 'react';
import { getCurrentControllersByPage } from '../lib/global/instance';
import Event from '../lib/Base/Event';
import { component_active, component_properties_change, controllers_change, controllers_delete_by_id, outline_coverage_select, workspace_scroll_center } from '../lib/util/actions';
import Search from '../lib/ui/Search';
import { ComponentIconMap } from '@/config/BaseComponents';
import Icon from '@/lib/Icon';
import { Tree } from 'antd';
import EditableLabel from '@/lib/ui/EditableLabel';
import { component_empty, context_show } from '@/lib/util/actions';
import { Draggable } from '@/lib/ui/NativeDragDrop';
import { getQuery } from '@/lib/util/helper';
import { getMasterFromStore } from '@/api/master';

const TreeNode = Tree.TreeNode;

class OutlineCoverage extends React.Component {
  state = {
    data: [],
    selectedKeys: [],
    source: [], // 原数据
  };

  componentWillMount() {
    this.refresh();
    Event.listen(controllers_change, this.refresh);
    Event.listen(component_active, this.handleActive);
    Event.listen(component_empty, this.handleInactive);
  }

  handleActive = (target) => {
    let keys = [];
    if (target.properties.isTemporaryGroup) {
      keys = target.group.map((item) => item.properties.id);
    } else {
      keys = [target.properties.id];
    }
    this.setState({ selectedKeys: keys });
  };
  handleInactive = (e) => {
    this.setState({ selectedKeys: [] });
  };

  componentWillUnmount() {
    Event.destroy(controllers_change, this.refresh);
    Event.destroy(component_active, this.handleActive);
    Event.destroy(component_empty, this.handleInactive);
  }

  refresh = async () => {
    let data,
      m = getQuery().m;
    if (m) {
      data = getMasterFromStore(m).content.data.items;
    } else {
      data = await getCurrentControllersByPage();
    }
    let source = data.slice(50);
    data = data.slice(0, 50);
    this.setState({ data, source });
  };
  handleSelect = (keys, e) => {
    Event.dispatch(outline_coverage_select, e.node.props.eventKey);
    Event.dispatch(workspace_scroll_center);
    this.setState({ selectedKeys: [e.node.props.eventKey] });
  };
  handleNameChange = (path, id, name) => {
    if (name && window.allWidgets[id]) {
      Event.dispatch(component_properties_change, {
        key: 'alias',
        value: name,
        target: window.allWidgets[id].view,
      });
    }
  };
  handleDelete = (path, id) => {
    Event.dispatch(controllers_delete_by_id, id);
  };
  handleSearch = async (value) => {
    if (!value) {
      return this.refresh();
    }
    let data = await getCurrentControllersByPage();
    data = data.filter((item) => item.alias.indexOf(value) > -1);
    let source = data.slice(50);
    data = data.slice(0, 50);
    this.setState({ data, source });
  };
  onScrollBottom = () => {
    if (this.state.source.length == 0) return;
    let pushdata = this.state.source.slice(0, 50);
    let source = this.state.source.slice(50);
    this.setState({ data: this.state.data.concat(pushdata), source });
  };
  renderIcon = ({ type }) => {
    return <Icon type={ComponentIconMap[type]} />;
  };
  handleNameChange = (id, name) => {
    if (!name.trim()) return;
    Event.dispatch(component_properties_change, {
      key: 'alias',
      value: name,
      target: window.allWidgets[id].view,
    });
  };
  editMaster = (item) => {
    let masterid = item.masterId;
    this.props.history.push('/app?p=' + getQuery().p + '&m=' + masterid);
  };
  showComponent = (id, e) => {
    e.stopPropagation();
    Event.dispatch(context_show, window.allWidgets[id]);
  };

  render() {
    const renderTreeNode = (items) => {
      return items.map((item) => {
        if (item.items) {
          return (
            <TreeNode
              key={item.id}
              title={
                <div className={'node-title-wrapper ' + (item.settings.isHide ? 'hide' : '')}>
                  <Draggable namespace={'nodedrag'} params={item.id}>
                    <EditableLabel onChange={(value) => this.handleNameChange(item.id, value)} value={item.alias} />
                  </Draggable>
                  {item.settings.isHide && <Icon onClick={(e) => this.showComponent(item.id, e)} type={'uneye'} />}
                </div>
              }
            >
              {renderTreeNode(item.items)}
            </TreeNode>
          );
        }
        return (
          <TreeNode
            key={item.id}
            title={
              <div className={'node-title-wrapper ' + (item.settings.isHide ? 'hide' : '')}>
                <Draggable namespace={'nodedrag'} params={item.id}>
                  <EditableLabel onChange={(value) => this.handleNameChange(item.id, value)} value={item.alias} />
                </Draggable>
                {item.settings.isHide && <Icon onClick={(e) => this.showComponent(item.id, e)} type={'uneye'} />}
              </div>
            }
          />
        );
      });
    };
    return (
      <div ref={'coverage'} className={'outline-pages outline-converages'}>
        <div className={'action-bar'}>
          <Search placeholder={'按回车搜索'} onSearch={this.handleSearch} />
        </div>
        {this.state.data.length > 0 && (
          <Tree blockNode multiple selectedKeys={this.state.selectedKeys} onSelect={this.handleSelect}>
            {renderTreeNode(this.state.data)}
          </Tree>
        )}
      </div>
    );
  }
}

export default OutlineCoverage;
