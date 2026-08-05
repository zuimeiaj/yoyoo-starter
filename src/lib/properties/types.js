import Group from './group';
import DefaultView, { Bubble, Circle, Line, Path, Rect, Triangle } from './base';
import Text, { ButtonProperties, FontIconProperties, InputProperties, TextAreaProperties } from './text';
import { isArray, isPlainObject, uuid } from '../util/helper';
import Image from './image';
import SelectProperties from './select';
import RadioProperties from './radio';
import CheckboxProperties from './checkbox';
import Chart, { BarProperties, LineProperties, AreaProperties, PieProperties, RadarProperties } from './chart';
import jQuery from 'jquery';
import { BlockProperties, MasterProperties } from '@/lib/properties/group';
import { CommentProperties } from '@/lib/properties/text';
import TableProperties from './table';

const ViewTypes = {
  group: Group,
  rect: Rect,
  text: Text,
  image: Image,
  input: InputProperties,
  icon: FontIconProperties,
  textarea: TextAreaProperties,
  button: ButtonProperties,
  select: SelectProperties,
  radio: RadioProperties,
  checkbox: CheckboxProperties,
  line: Line,
  triangle: Triangle,
  bubble: Bubble,
  circle: Circle,
  path: Path,
  block: BlockProperties,
  master: MasterProperties,
  comment: CommentProperties,
  table: TableProperties,
  // 图表：chart 为基类（反序列化用，chartType 区分具体图表），bar/line/area/pie/radar 为模板创建用子类
  chart: Chart,
  bar: BarProperties,
  line: LineProperties,
  area: AreaProperties,
  pie: PieProperties,
  radar: RadarProperties,
};
/**
 *
 * @param {ViewProperties | Array<ViewProperties>} properties
 */
export const toString = (properties) => {
  return Array.isArray(properties) ? JSON.stringify(properties.map((item) => item.toJSON())) : properties.toString();
};
/**
 *
 * @param {ViewProperties | Array<ViewProperties>} properties
 */
export const toJSON = (properties) => {
  let result = [];
  if (Array.isArray(properties)) {
    result = properties.map((item) => {
      try {
        let obj = item.toJSON();
        return obj;
      } catch (e) {}
      return null;
    });
    result = result.filter((item) => item);
  } else {
    result = properties.toJSON();
  }
  return result;
};
export const parseJSON = (json, isGenerateId) => {
  if (typeof json === 'string') {
    json = JSON.parse(json);
  }
  if (!Array.isArray(json)) json = [json];
  let result = [];
  for (let i = 0, j = json.length; i < j; i++) {
    let item = json[i];
    // 仅无 id 时生成：避免覆盖已保存数据的 id（组件索引/母版引用依赖 id 稳定）
    if (isGenerateId && !item.id) item.id = uuid('sb_');
    let View = ViewTypes[item.type] || DefaultView;
    // Default rect
    if (!ViewTypes[item.type]) item.type = 'rect';
    let view = new View();
    for (let key in item) {
      view[key] = item[key];
      if (key === 'items' && item[key].length > 0) {
        // 已废弃
        view[key] = parseJSON(item[key], isGenerateId);
        view[key].forEach((item) => {
          item.parent = view;
          item.settings.isLock = true;
        });
      }
    }
    result[i] = view;
  }
  return result;
};
/**
 *
 * @param {Object} jsonObject
 * @param {boolean} isGenerateId  是否生成新的ID
 * @return {ViewProperties}
 */
export const parseOjbect = (jsonObject, isGenerateId) => {
  if (typeof jsonObject === 'string') jsonObject = JSON.parse(jsonObject);
  return parseJSON([jsonObject], isGenerateId)[0];
};
/**
 *
 * @param view {ViewProperties}
 *
 */
export const refreshViewId = (view) => {
  view.id = uuid('sb_');
  if (view.items) {
    for (let i = 0, j = view.items.length; i < j; i++) {
      let item = view.items[i];
      if (item.items && item.items.length > 0) refreshViewId(item);
      else item.id = uuid('sb_');
    }
  }
};
export const deepCopyPages = (page) => {};

/**
 *
 *
 * 对节点的增删改查，返回一个新的数组
 * @param array {Array<ViewProperties>}
 * @param target {ViewProperties}
 * @param callback {Function}
 * @return {Array<ViewProperties>}
 */
export function updateIn(array, target, callback) {
  return array.map((item) => {
    if (item.id == target.id) {
      return callback(createViewFrom(Object.assign({}, item)));
    }
    return item;
  });
}

function defaultUpdater(item) {
  return createViewFrom(item);
}

export function updateTreeIn(array, path, callback = defaultUpdater) {
  path = path.slice();
  let resultArray = copyArray(array);
  let index = path.shift();
  let firstIndex = index;
  let newData = Object.assign({}, resultArray[index]);
  newData = path.length > 0 ? createViewFrom(newData) : newData;
  let object = newData;
  while (path.length > 0) {
    index = path.shift();
    if (newData.items && newData.items.length > 0) {
      newData.items = copyArray(newData.items);
      if (path.length === 0) {
        let _obj = callback(Object.assign({}, newData.items[index]));
        newData.items[index] = _obj;
        if (!_obj) newData.items.splice(index, 1);
        resultArray[firstIndex] = object;
        return resultArray;
      } else {
        let _obj = createViewFrom(Object.assign({}, newData.items[index]));
        newData.items[index] = _obj;
        newData = _obj;
      }
    }
  }
  let _obj = callback(newData);
  resultArray[index] = _obj;
  if (!_obj) resultArray = resultArray.filter((item) => item);
  return resultArray;
}

/**
 * 数组替换
 * @param stateItems {Array<ViewProperties>}
 * @param updateItems {Array<ViewProperties>}
 * @param callback {Function<Array<ViewProperties>>:Array<ViewProperties>}
 */
export function updateInArray(stateItems, updateItems, callback) {
  let maps = {};
  updateItems.forEach((item) => {
    maps[item.id] = item;
  });
  let indexMap = {};
  let newStateItems = [];
  //  记录当前更新队列的index，然后开始批量更新
  stateItems.forEach((item, index) => {
    if (maps[item.id]) {
      indexMap[item.id] = index;
    }
    newStateItems.push(item);
  });
  // 按顺序更新
  updateItems.forEach((item) => {
    let index = indexMap[item.id];
    //  设置新的组件
    newStateItems[index] = callback(createViewFrom(Object.assign({}, newStateItems[index])), item.id);
  });
  return newStateItems;
}

/**
 *
 *  根据对象找到对象在当前树中的路径
 * @param items {Array<ViewProperties>}
 * @return {Array<Number>}
 */
export function findViewPath(items, target) {
  let path = [],
    found = false;

  function find(items) {
    for (let i = 0; i < items.length; i++) {
      path.push(i);
      if (items[i] === target) {
        found = true;
        break;
      }
      if (items[i].items) {
        find(items[i].items);
      }
      if (found) {
        break;
      }
      path.pop();
    }
  }

  find(items);
  if (path.length === 0) {
    console.warn('[unfind path with ]', target);
  }
  return path;
}

/**
 * 节点被替换后，起父节点引用被修改，导致子元素所对应parent是错误，需要刷新整个树
 */
export function refreshRelation(items, parent) {
  for (let i = 0, j = items.length; i < j; i++) {
    let item = items[i];
    if (parent) item.parent = parent;
    if (item.items && item.items.length > 0) {
      refreshRelation(item.items, item);
    }
  }
}

function copyArray(arr) {
  return arr.slice();
}

export function createViewFrom(data) {
  let view = new ViewTypes[data.type]();
  for (let key in data) {
    let obj = data[key];
    if (isPlainObject(obj)) {
      obj = jQuery.extend(true, {}, obj);
    } else if (isArray(obj)) {
      obj = jQuery.extend(true, [], obj);
    }
    view[key] = obj;
  }
  return view;
}
