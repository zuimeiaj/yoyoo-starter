import Group from './group';
import DefaultView, { Bubble, Circle, Diamond, Hexagon, Line, Parallelogram, Path, Rect, Triangle } from './base';
import Text, { ButtonProperties, FontIconProperties, InputProperties, TextAreaProperties } from './text';
import { isArray, isPlainObject, uuid } from '../util/helper';
import Image from './image';
import SelectProperties from './select';
import RadioProperties from './radio';
import CheckboxProperties from './checkbox';
import Chart, { BarProperties, LineProperties, AreaProperties, PieProperties, RadarProperties } from './chart';
import { BlockProperties, MasterProperties } from '@/lib/properties/group';
import { CommentProperties } from '@/lib/properties/text';
import TableProperties from './table';
import TagProperties from './tag';
import RateProperties from './rate';
import ProgressProperties from './progress';
import StatisticProperties from './statistic';
import BadgeProperties from './badge';
import AvatarProperties from './avatar';
import AlertProperties from './alert';
import StepsProperties from './steps';
import { Annotation, Capsule, Cylinder, Delay, Document, Ellipse, FlowRect, Person, Predefined, Trapezoid } from './flow';

const ViewTypes = {
  group: Group,
  rect: Rect,
  lineShape: Line,
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
  diamond: Diamond,
  parallelogram: Parallelogram,
  hexagon: Hexagon,
  bubble: Bubble,
  circle: Circle,
  path: Path,
  // 流程图新增形状（边框黑、不填充，ViewFlowShape 渲染）
  flowrect: FlowRect,
  capsule: Capsule,
  ellipse: Ellipse,
  predefined: Predefined,
  document: Document,
  cylinder: Cylinder,
  trapezoid: Trapezoid,
  delay: Delay,
  annotation: Annotation,
  person: Person,
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
  // 数据展示组件（antd 封装）
  tag: TagProperties,
  rate: RateProperties,
  progress: ProgressProperties,
  statistic: StatisticProperties,
  badge: BadgeProperties,
  avatar: AvatarProperties,
  alert: AlertProperties,
  steps: StepsProperties,
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
      // 无边框组件（radio/checkbox，属性类已 delete border）：忽略数据中残留的 border，保证右侧面板不出现边框项
      if (key === 'border' && view.noBorder) continue;
      // 组件明确不需要的面板字段（数据展示类组件按需裁剪）：忽略残留数据，避免右侧面板出现无意义属性项
      if (view.noPanelKeys && view.noPanelKeys.indexOf(key) > -1) continue;
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
 * 重新生成整棵树的组件 id，并重写连线记录（复制/粘贴/副本时调用）：
 * - 连线 id（c.id）必须重新生成 —— 与原件共用会导致 LinkLayer 的 React key 冲突、
 *   hover/选中同时命中两条线、删除互相干扰
 * - targetId 按旧 id → 新 id 映射表改写；目标不在复制集内的连线（指向外部组件）直接丢弃，
 *   否则副本与原件会画出重叠的线
 * @param view {ViewProperties}
 *
 */
export const refreshViewId = (view) => {
  const idMap = {};
  // 第一遍：所有节点（含嵌套 block 子节点）生成新 id，记录旧 id → 新 id 映射
  const assignIds = (v) => {
    idMap[v.id] = uuid('sb_');
    v.id = idMap[v.id];
    if (v.items && v.items.length > 0) v.items.forEach(assignIds);
  };
  assignIds(view);
  // 第二遍：重写连线记录（映射表已完整，父级连线才能正确引用子级新 id）
  const remapLinks = (v) => {
    if (v.connections && v.connections.length > 0) {
      v.connections = v.connections
        .filter((c) => idMap[c.targetId])
        .map((c) => Object.assign({}, c, { id: uuid('lnk_'), targetId: idMap[c.targetId] }));
    }
    if (v.items && v.items.length > 0) v.items.forEach(remapLinks);
  };
  remapLinks(view);
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
      obj = JSON.parse(JSON.stringify(obj));
    } else if (isArray(obj)) {
      obj = JSON.parse(JSON.stringify(obj));
    }
    view[key] = obj;
  }
  return view;
}
