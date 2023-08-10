/**
 *  created by yaojun on 2018/12/2
 *
 */
import React from 'react';
import ViewController from './ViewController';
import Event from '../Base/Event';
import { component_active, component_inactive, component_resize_end, component_show_resizer, context_pack, context_shiftkey_press, selection_group } from '../util/actions';
import ViewProperties from '../properties/base';
import GroupProperties from '../properties/group';
import { setFirstResponder, setTemporaryGroup } from '../global/instance';
import { getGroupId, setGroupId } from '../global/selection';
import './ViewSelectGroupBordered.scss';
import { BlockProperties } from '@/lib/properties/group';
import { uuid } from '@/lib/util/helper';
import { controllers_apply_group } from '@/lib/util/actions';
import { getFirstResponder } from '@/lib/global/instance';

const ColorFilter = {
  fontColor: (item) => item.properties.type == 'text',
  border: (item) => {
    let type = item.properties.type;
    return !(type == 'icon' || type == 'master');
  },
  shadow: (item) => {
    let type = item.properties.type;
    return !(type == 'master' || type == 'icon' || type == 'circle' || type == 'line' || type == 'curve' || type == 'bubble' || type == 'triangle');
  },
  bg: (item) => {
    let type = item.properties.type;
    return !(type == 'circle' || type == 'line' || type == 'image' || type == 'master');
  },
};
export const PropsFilter = {
  animations: ({ type }) => type != 'master',
  interactions: ({ type }) => type != 'master',
  transform: () => true,
  shadow: (item) => {
    let type = item.type;
    return !(type == 'master' || type == 'icon' || type == 'circle' || type == 'line' || type == 'curve' || type == 'bubble' || type == 'triangle');
  },
  corner: (item) => {
    let type = item.type;
    return !(type == 'master' || type == 'icon' || type == 'circle' || type == 'line' || type == 'curve' || type == 'bubble' || type == 'triangle');
  },
  bg: (item) => {
    let type = item.type;
    return !(type == 'master' || type == 'circle' || type == 'line' || type == 'image');
  },
  border: (item) => {
    let type = item.type;
    return !(type == 'icon' || type == 'master');
  },
  align: (item) => item.type == 'text',
  fontStyle: (item) => item.type == 'text',
  decorator: (item) => item.type == 'text',
  spacing: (item) => item.type == 'text',
  font: ({ type }) => type == 'button' || type == 'text' || type == 'input' || type == 'select' || type == 'textarea',
};
/**
 * @description 执行区域选择后合成的一个view组件
 *
 */
export default class ViewSelectGroupBordered extends ViewController {
  componentWillMount() {
    this.properties = new GroupProperties();
    this.properties.view = this;
    //this.properties.settings.resize = ['tl', 'tm', 'tr', 'r', 'br', 'bm', 'bl', 'l', 'borderTop', 'borderLeft', 'borderRight', 'borderBottom']
    this.target = null; // 当前选中的元素
    this.isShiftPresse = false;
    this.isLockChildren = true;
    this.properties.bg = 'rgba(255,255,255,0)';
    this.group = [];
    //  临时分组，需要遍历group元素操作
    /**
     *
     * @type { boolean }
     */
    this.properties.isTemporaryGroup = true;
    Event.listen(selection_group, this.handleSelectionGroupChange);
    Event.listen(context_pack, this.makeGroup);
    Event.listen(component_active, this.handleActive);
    Event.listen(component_inactive, this.handleInactive);
    Event.listen(context_shiftkey_press, this.handleShiftPress);
    Event.listen(component_resize_end, this.handleResizeEnd);
    window._group = this;
    setTemporaryGroup(this);
  }

  makeGroup = () => {
    let responder = getFirstResponder();
    if (!responder.properties.isTemporaryGroup) {
      return;
    }
    let selfTransform = this.properties.transform;
    let properties = new BlockProperties();
    properties.transform = Object.assign({}, selfTransform);
    properties.items = this.group.map((item) => {
      return item.properties;
    });
    properties.id = uuid('sb_');
    Event.dispatch(controllers_apply_group, properties);
  };
  handleResizeEnd = () => {
    if (this.group.length > 0) {
      this.updateGroupTransform(this.group);
      Event.dispatch(component_show_resizer, this);
    }
  };
  handleShiftPress = (isPressed) => {
    this.isShiftPresse = isPressed;
    if (this.group.length === 0) {
      return;
    }
    this.showRect(!isPressed);
  };
  handleActive = (target) => {
    this.target = target;
  };
  handleInactive = (target, activeTarget) => {
    if (this !== target) {
      if (!activeTarget || !getGroupId()[activeTarget.properties.id]) {
        this.isLockChildren = true;
      }
      return;
    }
    if (!(activeTarget && getGroupId()[activeTarget.properties.id])) {
      this.target = null;
      this.group = [];
      setGroupId({});
    }
    this.showRect(false);
  };
  /**
   * 选择到组件后
   * @param show
   */
  showRect = (show) => {
    this.refs.container.style.display = show ? 'block' : 'none';
  };
  updateResizer = () => {
    this.updateGroupTransform(this.group);
    Event.dispatch(component_show_resizer, this);
  };
  getNewTransform = () => {
    let group = this.getItems();
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
    return { x, y, width, height, rotation: 0 };
  };
  updateGroupTransform = (group) => {
    //Temporary group component could not emit component_inactive event
    this.group = group;
    this.isLockChildren = true;
    group = this.getItems();
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
      GroupId[item.id] = true;
    }
    let x = Math.min.apply(null, xList);
    let y = Math.min.apply(null, yList);
    let x1 = Math.max.apply(null, x1List);
    let y1 = Math.max.apply(null, y1List);
    let width = x1 - x;
    let height = y1 - y;
    setGroupId(GroupId);
    group.forEach((item) => {
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
    //  每次选中后，旋转角度重设置为 0
    super.setTransform(x, y, width, height, 0);
  };
  /**
   *
   * @param group {Array<ViewController>}
   */
  handleSelectionGroupChange = (group) => {
    this.showRect(true);
    this.updateGroupTransform(group);
    setFirstResponder(this);
  };
  /**
   *
   * @param {ViewController} view
   */
  push = (view) => {
    if (view === this) {
      console.warn("Can't add itself to the selection");
      return;
    }
    let index = this.group.indexOf(view);
    let group = this.group.slice();
    if (index > -1) {
      group.splice(index, 1);
      if (group.length === 1) {
        setFirstResponder(group[0]);
        return;
      }
    } else {
      group.push(view);
    }
    this.updateGroupTransform(group);
    Event.dispatch(component_show_resizer, this);
  };

  setColor(key, color) {
    this.group.forEach((item) => {
      if (ColorFilter[key](item)) {
        item.setColor(key, color);
      }
    });
  }

  setRotation(angle) {
    let group = this.properties.transform;
    let rad = ((180 - angle) / 180) * Math.PI;
    super._setTransform(group.x, group.y, group.width, group.height, angle);
    this.getItems().forEach((item) => {
      let t1 = item.transform;
      let x = Math.round(Math.cos(rad + item._a) * item._c + group.x + group.width / 2),
        y = Math.round(-Math.sin(rad + item._a) * item._c + group.y + group.height / 2),
        a = angle + item._sa;
      item.view.setTransform(x - t1.width / 2, y - t1.height / 2, t1.width, t1.height, a);
      if (item.type == 'block') {
        item.view.setRotation(angle);
      }
    });
  }

  onDragStartBefore() {}

  rotationEnd() {
    this.group.forEach((item) => {
      item.rotationEnd();
    });
  }

  resizeEnd() {
    this.group.forEach((item) => {
      item.resizeEnd();
    });
  }

  _setTransform(x, y, w, h, t) {
    //  绘制自身位置
    super._setTransform(x, y, w, h, t);
    //  绘制分组下组件的位置
    this.getItems().forEach((item) => {
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

  componentWillUnmount() {
    Event.destroy(selection_group, this.handleSelectionGroupChange);
    Event.destroy(context_pack, this.makeGroup);
    Event.destroy(component_inactive, this.handleInactive);
    Event.destroy(component_active, this.handleActive);
    Event.destroy(context_shiftkey_press, this.handleShiftPress);
    Event.destroy(component_resize_end, this.handleResizeEnd);
  }

  /**
   *
   * @return {(ViewProperties|TextProperties|ImageProperties|GroupProperties|*|null)[]}
   *
   */
  getItems() {
    return this.group.map((item) => item.properties);
  }

  render() {
    return (
      <div
        data-uid={'temporary-group'}
        className='view-group view-group-batch'
        style={{
          position: 'absolute',
          boxSizing: 'border-box',
        }}
        ref={'container'}
      ></div>
    );
  }
}
