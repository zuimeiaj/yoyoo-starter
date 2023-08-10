import { createViewFrom, updateTreeIn } from '@/lib/properties/types';
import { getPATHES } from '@/lib/global/instance';
import { isArray } from '@/lib/util/helper';

export const proxyPropsChange = (stateitems, target, cb) => {
  let items = isArray(target) ? target : target.properties.isTemporaryGroup ? target.getItems() : [target.properties];
  items.forEach((item) => {
    stateitems = updateTreeIn(stateitems, getPATHES()[item.id].split(','), (view) => {
      return cb(createViewFrom(view));
    });
  });
  return stateitems;
};
/**
 * 批量修改目标属性，如果是block 将遍历其所有子元素
 * @param {Array<ViewProperties>} stateitems 当前状态
 * @param {ViewController} target 需要修改的目标
 * @param {String | Function<ViewProperties>} key 目标属性
 * @param { any | Function<ViewProperties>:any } value  新的值
 * @return {Array<ViewProperties>} 返回一个全新的状态
 */
export const proxyAllPropsChange = (stateitems, target, key, value) => {
  let items = isArray(target) ? target : target.properties.isTemporaryGroup ? target.getItems() : [target.properties];
  items.forEach((item) => {
    stateitems = updateTreeIn(stateitems, getPATHES()[item.id].split(','), (view) => {
      view = createViewFrom(view);
      if (key) {
        if (typeof key == 'function') {
          view = key(view);
        } else {
          view[key] = typeof value == 'function' ? value(view) : value;
        }
      }
      if (view.type == 'block') {
        view.items = proxyBlockViewChildrenProps(view);
      }
      return view;
    });
  });

  function proxyBlockViewChildrenProps(view) {
    return view.items.map((item) => {
      item = createViewFrom(item);
      if (key) {
        if (typeof key == 'function') {
          item = key(item);
        } else {
          item[key] = typeof value == 'function' ? value(item) : value;
        }
      }
      if (item.type == 'block') {
        item.items = proxyBlockViewChildrenProps(item);
      }
      return item;
    });
  }

  return stateitems;
};
/**
 * 删除状态中所有给定id的元素
 * @param stateItems
 * @param ids
 * @param clearLeafBlock 默认情况下如果只有一个子节点了，就删除当前当前block
 * @return {*}
 */
export const proxyDeleteItems = (stateItems, ids, clearLeafBlock = true) => {
  let path = getPATHES()[ids[0]];
  let pathes = path.split(',');
  if (pathes.length == 1) {
    // 当前元素在第一层，直接删除
    return stateItems.filter((item) => ids.indexOf(item.id) == -1);
  }
  let index = pathes.pop();
  // 嵌套层级时，找到该元素的block元素，
  return updateTreeIn(stateItems, pathes, (block) => {
    block = createViewFrom(block);
    block.items = block.items.filter((item) => ids.indexOf(item.id) == -1);
    if (block.items.length == 1 && clearLeafBlock) {
      return block.items[0];
    } else if (block.items.length == 0) {
      return null;
    }
    return block;
  });
};
export const proxyTransformOffset = (view, x, y, dindex, rotation) => {
  view.transform.x += x;
  view.transform.y += y;
  if (dindex !== void 0) {
    view.zIndex += dindex;
  }
  if (rotation !== void 0) {
    view.transform.rotation += rotation;
  }
  if (view.type == 'block') {
    view.items.forEach((item) => {
      proxyTransformOffset(item, x, y, dindex, rotation);
    });
  }
};
