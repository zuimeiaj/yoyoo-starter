// jQuery 已移除：深拷贝/纯对象判断内联实现（properties 数据为纯 JSON 结构，JSON 方案安全）
const isPlainObject = (obj) => {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  let proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
};
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

export const DEFAULT_COLOR = 'rgba(221,221,221,1)';
// 流程图节点规范：黑色边框、不填充（透明背景）—— flow 类形状统一默认
export const FLOW_BORDER = 'rgba(0,0,0,1)';
export const FLOW_BG = 'rgba(255,255,255,0)';
// 流程图节点文本字体默认（属性面板「字体」项：字号 + 颜色）
export const FLOW_FONT = { color: '#333333', size: 14 };
// 流程图形状 resize 白名单：无旋转手柄（流程图节点一般不旋转），四角 + 边热区保留
//（连线模式下 applyResizeHandles 再剔除 tm/bm/l/r，只留四角）
export const FLOW_RESIZE = ['tl', 'tm', 'tr', 'r', 'br', 'bm', 'bl', 'l', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'];
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
    // 连线（出边）：{ id, anchor, targetId, targetAnchor }，anchor 为当前组件锚点方向（left/top/right/bottom）
    this.connections = [];
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
          if (isPlainObject(obj)) {
            result[key] = deepClone(obj);
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

// 基础「矩形」：div 实现（ViewContainer，基类应用背景/圆角/阴影），有背景色、属性全可调。
// 流程图直角矩形用 flowrect（SVG 渲染，见 flow.js）
export class Rect extends ViewProperties {
  constructor() {
    super();
    this.border.width = 1;
    this.border.color = DEFAULT_COLOR;
    this.bg = DEFAULT_COLOR;
    // 双击编辑的文本（节点文字）+ 字体样式（属性面板字体项）
    this.text = '';
    this.font = FLOW_FONT;
  }
}

// 「直线」组件独立 type（lineShape）：line 被图表折线图占用（ViewChart/LineProperties），
// 原 line 注册到图表后直线拖出来是折线图（曾踩坑）
// resize 白名单空：无 resize/rotate 手柄，选中时用两端编辑圆点（ViewLine 拖动端点改长度/角度）
export class Line extends ViewProperties {
  constructor() {
    super();
    this.type = 'lineShape';
    this.alias = '直线';
    this.settings.resize = [];
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
    this.border.color = FLOW_BORDER;
    this.bg = FLOW_BG;
    this.text = '';
    this.font = FLOW_FONT;
    this.settings.resize = FLOW_RESIZE;
    delete this.shadow;
    delete this.corner;
  }
}

// 流程图图形：菱形（判断）、平行四边形（输入/输出）、六边形（循环/准备），均可双击编辑文本
export class Diamond extends ViewProperties {
  constructor() {
    super();
    this.type = 'diamond';
    this.alias = '菱形';
    this.transform.width = 200;
    this.transform.height = 120;
    this.border.width = 1;
    this.border.color = FLOW_BORDER;
    this.bg = FLOW_BG;
    this.text = '';
    this.font = FLOW_FONT;
    this.settings.resize = FLOW_RESIZE;
    delete this.shadow;
    delete this.corner;
  }
}

export class Parallelogram extends ViewProperties {
  constructor() {
    super();
    this.type = 'parallelogram';
    this.alias = '四边形';
    this.transform.width = 240;
    this.transform.height = 120;
    this.border.width = 1;
    this.border.color = FLOW_BORDER;
    this.bg = FLOW_BG;
    this.text = '';
    this.font = FLOW_FONT;
    this.settings.resize = FLOW_RESIZE;
    delete this.shadow;
    delete this.corner;
  }
}

export class Hexagon extends ViewProperties {
  constructor() {
    super();
    this.type = 'hexagon';
    this.alias = '六边形';
    this.transform.width = 220;
    this.transform.height = 120;
    this.border.width = 1;
    this.border.color = FLOW_BORDER;
    this.bg = FLOW_BG;
    this.text = '';
    this.font = FLOW_FONT;
    this.settings.resize = FLOW_RESIZE;
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
    this.border.color = FLOW_BORDER;
    this.bg = FLOW_BG; // 气泡默认不填充（透明）
    // 三角沿内矩形周线（[10,10]→[w-10,h-10]）的像素弧长，0 = 顶边左端，顺时针；可绕主体一圈
    // 不写默认值：模板会覆盖构造宽高（如 300×100），写死像素值会漂移；
    // 新组件由 ViewPolygon._getPos 按实际尺寸兜底为底部中间
    this.font = FLOW_FONT;
    this.settings.resize = FLOW_RESIZE;
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
  connections: 1,
  text: 1,
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
  // 数据展示组件（antd 封装）专有配置
  tagConfig: 1,
  rateConfig: 1,
  progressConfig: 1,
  statisticConfig: 1,
  badgeConfig: 1,
  avatarConfig: 1,
  alertConfig: 1,
  stepsConfig: 1,
  direction: 1,
  triangle: 1,
  curve: 1,
  circle: 1,
  path: 1,
  flowShape: 1,
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
  flowrect: 'rect',
  lineShape: 'line',
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
