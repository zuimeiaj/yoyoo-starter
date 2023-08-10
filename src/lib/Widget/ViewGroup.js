/**
 *  created by yaojun on 2018/12/2
 *
 */
import React from 'react';
import ViewController from './ViewController';
import { controllers_append } from '../util/actions';
import View from './View';
import { getDropView } from '../util/helper';
import Event from '@/lib/Base/Event';
import { component_show_resizer, context_outline_delete_master, workspace_part_master } from '@/lib/util/actions';
import { getMasterFromStore } from '@/api/master';
import { parseJSON } from '@/lib/properties/types';
import { getFirstResponder } from '@/lib/global/instance';

/**
 * 分组组件，用于嵌套其他组件
 * @deprecated 使用新的BlockView
 * @description
 *
 */
export default class ViewGroup extends ViewController {
  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    let data = e.dataTransfer.getData('dragdata');
    if (data) data = JSON.parse(data);
    if (data.type) {
      let rect = this.getOffsetRect();
      let view = getDropView(e, data);
      if (view) {
        view.parent = this.properties;
        view.settings.isLock = true;
        view.transform.x -= rect.x;
        view.transform.y -= rect.y;
        Event.dispatch(controllers_append, view, this.properties);
      }
    }
  };

  render() {
    const { items } = this.properties || [];
    const { width, height, x, y, rotation } = this.properties.transform;
    return (
      <div
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
        data-uid={this.properties.id}
        className='view-group'
        style={{
          width: width,
          height,
          left: x,
          top: y,
          transform: `rotate(${rotation}deg)`,
          position: 'absolute',
          boxSizing: 'border-box',
        }}
        ref={'container'}
      >
        {items.map((item) => {
          return <View key={item.id} type={item.type} properties={item} />;
        })}
      </div>
    );
  }
}

/**
 * 替代GroupView ，在block dna链中，任何一个节点修改后，真个dna链都需要更新
 */
export class BlockView extends ViewController {
  isLockChildren = true;
  onDragStartBefore = (e, a) => {
    this.isLockChildren = true;
  };

  initProperties() {}

  setColor(a, b) {
    this.properties.items.forEach((item) => {
      item.view.setColor(a, b);
    });
  }

  // 更新当前矩形的大小，和子元素在当前矩形中的比例
  getNewTransform() {
    let t = this.updateSelfTransform();
    this.updateChildrenPosition();
    return t;
  }

  updateSelfTransform = () => {
    let group = this.properties.items;
    let xList = [],
      x1List = [],
      yList = [],
      y1List = [];
    let GroupId = {};
    for (let i = 0, j = group.length; i < j; i += 1) {
      let item = group[i];
      let t = group[i].view.getOffsetTransform();
      // begin
      xList[i] = t.x;
      yList[i] = t.y;
      // end
      x1List[i] = t.x + t.width;
      y1List[i] = t.y + t.height;
    }
    let x = Math.min.apply(null, xList);
    let y = Math.min.apply(null, yList);
    let x1 = Math.max.apply(null, x1List);
    let y1 = Math.max.apply(null, y1List);
    let width = x1 - x;
    let height = y1 - y;
    this.properties.transform = { x, y, width, height, rotation: 0 };
    return { x, y, width, height, rotation: 0 };
  };

  // 仅仅更新当前block的子元素位置信息
  updateChildrenPosition() {
    let { width, height, x, y } = this.props.properties.transform;
    this.properties.items.forEach((item) => {
      //  缓存当前坐标、位置、旋转角度
      item._xPercent = (item.transform.x - x) / width;
      item._yPercent = (item.transform.y - y) / height;
      item._wPercent = item.transform.width / width;
      item._hPercent = item.transform.height / height;
      let cx = x + width / 2 - (item.transform.x + item.transform.width / 2);
      let cy = y + height / 2 - (item.transform.y + item.transform.height / 2);
      item._c = Math.hypot(cx, cy);
      item._a = Math.atan2(-cy, cx);
      item._sa = item.transform.rotation;
    });
  }

  componentWillMount() {
    super.componentWillMount();
    this.updateChildrenPosition();
  }

  updateChildBlockTransform = () => {
    const NODES = [];
    const loop = (target, parentNode) => {
      let node = {
        count: 0,
        blocks: [],
        isLeaf: false,
        view: target.view,
        parent: parentNode,
      };
      target.items.forEach((item) => {
        if (item.type == 'block') {
          node.blocks.push(item);
          loop(item, node);
        }
      });
      node.count = node.blocks.length;
      node.isLeaf = node.count == 0;
      NODES.push(node);
    };
    // 更新父级block
    const updateBlock = (node) => {
      if (node.parent) {
        node.parent.count -= 1;
        if (node.parent.count == 0) {
          node.parent.view.getNewTransform();
          updateBlock(node.parent);
        }
      }
    };
    loop(this.properties);
    let LEAF_NODES = NODES.filter((item) => item.isLeaf);
    LEAF_NODES.forEach((item) => {
      item.view.getNewTransform();
      updateBlock(item);
    });
  };
  updateParentBlockTransform = () => {
    let parent = this._parent;
    while (parent) {
      parent.getNewTransform();
      parent = parent._parent;
    }
  };

  rotationEnd() {
    this.updateBlockTransform();
    Event.dispatch(component_show_resizer, this);
  }

  resizeEnd() {
    this.updateBlockTransform();
    Event.dispatch(component_show_resizer, this);
  }

  updateBlockTransform = () => {
    this.updateChildBlockTransform();
    this.updateParentBlockTransform();
  };

  setRotation(angle) {
    let group = this.properties.transform;
    let rad = ((180 - angle) / 180) * Math.PI;
    super._setTransform(group.x, group.y, group.width, group.height, angle);
    this.properties.items.forEach((item) => {
      let t1 = item.transform;
      let x = Math.round(Math.cos(rad + item._a) * item._c + group.x + group.width / 2),
        y = Math.round(-Math.sin(rad + item._a) * item._c + group.y + group.height / 2),
        a = angle + item._sa;
      item.view.setTransform(x - t1.width / 2, y - t1.height / 2, t1.width, t1.height, a);
      if (item.type == 'block') item.view.setRotation(angle);
    });
  }

  _setTransform(x, y, w, h, t) {
    //  绘制自身位置
    super._setTransform(x, y, w, h, t);
    //  绘制分组下组件的位置
    this.properties.items.forEach((item) => {
      let t = item.transform;
      let tx = Math.round(x + item._xPercent * w),
        ty = Math.round(y + item._yPercent * h),
        tw = Math.round(item._wPercent * w),
        th = Math.round(item._hPercent * h);
      // FontIcon only
      if (item.settings.ratio) {
        th = tw;
      }
      item.view.setTransform(tx, ty, tw < 0 ? 0 : tw, th < 0 ? 0 : th, item.rotation);
    });
  }

  render() {
    const { items } = this.properties || [];
    const { width, height, x, y, rotation } = this.properties.transform;
    return (
      <React.Fragment>
        <div className={'block-view'} style={{ position: 'absolute', boxSizing: 'border-box', left: x, top: y, width, height }} ref={'container'}></div>
        {items.map((item) => {
          return <View parent={this} key={item.id} type={item.type} properties={item} />;
        })}
      </React.Fragment>
    );
  }
}

export class MasterView extends ViewController {
  state = {
    items: [],
  };

  getContextMenu() {
    let menus = super.getContextMenu();
    menus.splice(1, 1, {
      name: '脱离母版',
      action: workspace_part_master,
      check: () => !!getFirstResponder(),
    });
    return menus;
  }

  componentWillMount() {
    super.componentWillMount();
    Event.listen(context_outline_delete_master, this.handleMasterDel);
    let data = getMasterFromStore(this.properties.masterId);
    if (data) {
      let items = parseJSON(data.content.data.items);
      this.mark(items);
      this.setState({ items });
    } else {
      this.setState({ items: [] });
    }
  }

  handleMasterDel = (masterid) => {
    if (this.properties.masterId === masterid) {
      this.setState({ items: [] });
    }
  };
  mark = (items) => {
    items.forEach((item) => {
      item.isInMaster = true;
      if (item.type == 'block') {
        this.mark(item.items);
      }
    });
  };

  componentWillUnmount() {
    super.componentWillUnmount();
    Event.destroy(context_outline_delete_master, this.handleMasterDel);
  }

  render() {
    const { x, y, height, width, rotation } = this.properties.transform;
    return (
      <div
        style={{
          position: 'absolute',
          boxSizing: 'border-box',
          left: x,
          top: y,
          width,
          height,
          transform: `rotate(${rotation}deg)`,
          overflow: 'hidden',
        }}
        {...this.getMouseEvent()}
        ref={'container'}
      >
        {this.state.items.map((item) => {
          return <View key={item.id} properties={item} type={item.type} />;
        })}
      </div>
    );
  }
}
