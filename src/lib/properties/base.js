import jQuery from 'jquery';

export const DEFAULT_COLOR = 'rgba(221,221,221,1)';
/**
 *  created by yaojun on 2018/12/1
 *
 */
export default class ViewProperties {
  constructor() {
    this.type = 'view';
    this.alias = '矩形';
    this.zIndex = -1;
    this.id = 1;
    this.selected = false;
    this.transform = {
      x: 0,
      y: 0,
      width: 100,
      height: 200,
      rotation: 0,
    };
    this.interactions = [];
    this.animations = {};
    // resize  默认为全部
    // null = ['rotation', 'tl', 'tm', 'tr', 'r', 'br', 'bm', 'bl', 'l', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft']
    this.settings = {
      fixation: false,
      hover: true,
      resize: null,
      ratio: false,
      isHide: false,
      overflow: '', // auto | scroll-x | scroll-y | hidden
    };
    this.border = {
      width: 0,
      color: 'rgba(224,224,224,1)',
      style: 'solid', // 为none表示不能修改
    };
    this.corner = {
      topLeft: 0,
      topRight: 0,
      bottomLeft: 0,
      bottomRight: 0,
    };
    this.shadow = {
      blur: 0,
      spread: 0,
      offsetX: 0,
      offsetY: 0,
      color: 'rgba(255,255,255,1)',
      type: 'outset', // inset | outset
    };
    this.bg = 'rgba(255,255,255,0)';
  }

  /**
   * @abstract
   */
  init() {}

  clone() {
    return new this.constructor(JSON.parse(this.toString()));
  }

  toJSON() {
    let result = {};
    for (let key in this) {
      if (SerializableKeys[key]) {
        if (key === 'items') {
          result[key] = this.items.map((item) => JSON.parse(item.toString()));
        } else {
          let obj = this[key];
          if (jQuery.isPlainObject(obj)) {
            result[key] = jQuery.extend(true, {}, obj);
          } else {
            result[key] = obj;
          }
        }
      }
    }
    return result;
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}

export class Rect extends ViewProperties {
  constructor() {
    super();
    this.border.width = 1;
    this.border.color = DEFAULT_COLOR;
    this.bg = DEFAULT_COLOR;
  }
}

export class Line extends ViewProperties {
  constructor() {
    super();
    this.type = 'line';
    this.alias = '直线';
    this.settings.resize = ['l', 'r', 'rotation'];
    this.settings.disableH = true;
    this.transform.height = 1;
    this.transform.width = 200;
    this.settings.hover = false;
    this.border.width = 'none';
    delete this.shadow;
    delete this.corner;
    delete this.bg;
  }
}

export class Triangle extends ViewProperties {
  constructor() {
    super();
    this.type = 'triangle';
    this.alias = '三角';
    this.transform.width = 200;
    this.border.width = 1;
    delete this.shadow;
    delete this.corner;
  }
}

export class Path extends ViewProperties {
  constructor() {
    super();
    this.type = 'path';
    this.alias = '路径';
    this.transform.width = 200;
    this.transform.height = 100;
    this.border.width = 2;
    this.border.color = 'rgba(33,150,243,1)';
    // path 数据：points 为局部坐标（相对 transform.x/y），每个锚点 {x,y,inX,inY,outX,outY}
    // in/out 为相对锚点的偏移（贝塞尔控制手柄），全零表示直线段；closed v1 留字段不做交互
    this.path = {
      points: [],
      closed: false,
    };
    delete this.shadow;
    delete this.corner;
  }
}

export class Circle extends ViewProperties {
  constructor() {
    super();
    this.type = 'curve';
    this.alias = '圆';
    this.transform.width = 150;
    this.transform.height = 150;
    this.settings.ratio = true;
    this.border.width = 1;
    this.border.style = 'none';
    // stroke-dasharray , stroke-dashoffset
    this.circle = {
      array: 150 * Math.PI,
      offset: 0,
    };
    delete this.shadow;
    delete this.corner;
    delete this.bg;
  }
}

export class Bubble extends ViewProperties {
  constructor() {
    super();
    this.type = 'bubble';
    this.alias = '气泡';
    this.transform.width = 400;
    this.border.width = 1;
    // 三角沿内矩形周线（[10,10]→[w-10,h-10]）的像素弧长，0 = 顶边左端，顺时针；可绕主体一圈
    // 不写默认值：模板会覆盖构造宽高（如 300×100），写死像素值会漂移；
    // 新组件由 ViewPolygon._getPos 按实际尺寸兜底为底部中间
    this.bubble = {};
    delete this.shadow;
    delete this.corner;
  }
}

const SerializableKeys = {
  zIndex: 1,
  id: 1,
  gid: 1,
  alias: 1,
  type: 1,
  transform: 1,
  interactions: 1,
  animations: 1,
  border: 1,
  shadow: 1,
  corner: 1,
  bg: 1,
  items: 1,
  settings: 1,
  selected: 1,
  icon: 1,
  font: 1,
  align: 1,
  fontData: 1,
  fontContent: 1,
  fontStyle: 1,
  decorator: 1,
  spacing: 1,
  image: 1,
  bubble: 1,
  selectOptions: 1,
  radioOptions: 1,
  checkboxOptions: 1,
  direction: 1,
  triangle: 1,
  curve: 1,
  circle: 1,
  path: 1,
  masterId: 1,
  chartData: 1,
  chartType: 1,
  chartSeries: 1,
  chartAxis: 1,
  chartColors: 1, // 旧版维度颜色（chartSeries 兼容回退）
  tableData: 1,
  rowRatios: 1,
  colRatios: 1,
  mergedCells: 1,
  cellStyles: 1,
};
export const ViewIconMaps = {
  switch: 'switch',
  image: 'image',
  rect: 'rect',
  text: 'text',
  group: 'group',
  view: 'rect',
  input: 'Input',
  map: 'map',
  line: 'line',
  textarea: 'textarea',
  select: 'select',
  checkbox: 'checkboxlist',
  radio: 'radio',
  icon: 'favorite',
  button: 'anniu',
  radiogroup: 'OBARadioGroup_sys_iconA2',
  checkboxgroup: 'group',
  buttongroup: '',
  slider: 'slider',
  range: 'slider1',
  path: 'miaobian',
};
