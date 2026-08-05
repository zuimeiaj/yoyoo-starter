/**
 *  created by yaojun on 2019/1/16
 *
 */
import React from 'react';
import IconText from '../lib/ui/IconText';
import { Draggable } from '../lib/ui/NativeDragDrop';
import { BaseComponents } from '../config/BaseComponents';
import Collapse from '../lib/ui/Collapse';
import Icon from '../lib/Icon';
import { Tooltip } from 'antd';
import CacheState from '@/lib/Base/CacheState';
import event from '@/lib/Base/Event';
import { context_outline_menu_change } from '@/lib/util/actions';

export default class OutlineComponents extends CacheState {
  state = {
    list: [],
  };
  getCacheKey = () => {
    return 'outline/components';
  };

  render() {
    return (
      <div className='root-layout-side-components'>
        <WrapperBase />
        {this.state.list.map((item) => {
          return <WrapperAdvs item={item} key={item._id} />;
        })}
      </div>
    );
  }
}

// 基础组件分组：基础（默认展开）/ 表单 / 图表 / 数据展示（默认折叠）
const CATEGORIES = [
  { key: 'base', name: '基础' },
  { key: 'form', name: '表单' },
  { key: 'chart', name: '图表' },
  { key: 'data', name: '数据展示' },
];
class WrapperBase extends React.PureComponent {
  render() {
    return (
      <div>
        {CATEGORIES.map((cat) => {
          let items = BaseComponents.filter((item) => (item.category || 'base') === cat.key);
          if (!items.length) return null;
          return (
            <Collapse key={cat.key} className={'component-group-title'} title={cat.name}>
              <div className={'component-group-content'}>
                {items.map((item) => {
                  return (
                    <Draggable key={item.name} params={item}>
                      <IconText className={'base-component'} icon={item.icon}>
                        {item.name}
                      </IconText>
                    </Draggable>
                  );
                })}
              </div>
            </Collapse>
          );
        })}
      </div>
    );
  }
}

class WrapperAdvs extends React.PureComponent {
  render() {
    const item = this.props.item;
    return (
      <Collapse collapse={true} className={'component-group-title'} title={item.name}>
        <div className={'component-group-content_adv'}>
          {item.content.map((item) => {
            return (
              <Draggable key={item.id} params={item}>
                <div style={{ backgroundImage: `url(${item.icon})` }} />
                <div>{item.name}</div>
              </Draggable>
            );
          })}
        </div>
      </Collapse>
    );
  }
}

export class BaseComponentsActionBar extends React.Component {
  state = {
    show: true,
  };

  componentWillMount() {
    event.listen(context_outline_menu_change, this.handleShow);
  }

  componentWillUnmount() {
    event.destroy(context_outline_menu_change, this.handleShow);
  }

  handleShow = (t) => {
    this.setState({ show: t != 'components' });
  };

  render() {
    if (!this.state.show) return null;
    return (
      <div className={'base-components_action-bar'}>
        {BaseComponents.map((item) => {
          return (
            <Tooltip key={item.name} placement={'right'} title={item.name}>
              <span className={'base-component_action-item'}>
                <Draggable key={item.name} params={item}>
                  <Icon type={item.icon} />
                </Draggable>
              </span>
            </Tooltip>
          );
        })}
      </div>
    );
  }
}
