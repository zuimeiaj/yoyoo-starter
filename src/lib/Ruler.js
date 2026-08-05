/**
 *  created by yaojun on 2018/12/1
 *
 */
import BaseCanvas from './Base/BaseCanvas';
import config from './util/preference';
import { getScreeTransform } from './global';

// 选中组件包围盒缩影：半透明高亮 + 两端边界线（与项目主色 $primary-bg 一致）
const SELECTION_COLOR = '#009688';
const SELECTION_FILL = 'rgba(0, 150, 136, 0.15)';

class Ruler extends BaseCanvas {
  init() {
    super.init();
    this.scale = getScreeTransform().scale;
    this.segment = 10;
    this.step = 10;
    this.realSegment = this.getRealSegment();
    this.offset = this.getScaleOffset();
    this.selection = null; // 选中组件包围盒（workspace 绝对坐标 {x,y,width,height}），null 表示无选中
  }

  /**
   * 设置选中组件包围盒并重绘（workspace 绝对坐标，与标尺同一坐标系）
   * @param {null | {x:number,y:number,width:number,height:number}} rect
   */
  setSelection(rect) {
    this.selection = rect;
    this.draw();
  }

  update() {
    // Reset the size of the canvas
    super.init();
    this.draw();
  }

  getScaleOffset() {
    return (this.getRealSegment() * this.scale) / this.step - this.step;
  }

  getRealSegment() {
    return Math.round(this.step / this.scale) * this.step;
  }

  setScale(n) {
    this.scale = n;
    this.realSegment = this.getRealSegment();
    this.offset = this.getScaleOffset();
    this.draw();
  }

  translate(start) {
    this.start = start;
    this.draw();
  }

  draw() {
    let { fontColor = '#989898', lineColor = '#d3d3d3' } = this.options;
    this.context.strokeStyle = lineColor;
    this.context.fillStyle = fontColor;
    this.context.clearRect(0, 0, this.width, this.height);
  }
}

export class HorizontalRuler extends Ruler {
  constructor(canvas, options) {
    super(canvas, options);
    this.start = -config.originCoords.x; // 默认从0 开始
    this.draw();
  }

  draw() {
    super.draw();
    let width = this.width + this.start,
      height = this.height,
      segment = this.segment,
      step = this.step + this.offset,
      steps = this.width / this.step,
      ctx = this.context,
      short = height / 1.5,
      realSegment = this.realSegment;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(this.width, height);
    // 起点往前多画几个刻度：刻度线出界但数字文本（画在刻度右侧 x+2）仍在画布内时，
    // 数字能平滑滑出左边界而不是瞬间消失（边界冗余）
    let startIndex = Math.ceil((this.start * this.scale) / step) - Math.ceil(50 / step);
    steps += startIndex + 20;
    for (let i = startIndex; i < steps; i += 1) {
      let x = i * step;
      x -= this.start * this.scale;
      if (i % segment === 0) {
        ctx.moveTo(x, 0);
        // 刻度值 = i * realSegment / segment（绝对序数直接换算；不能用相对计数器，扩展后 i 可能为负）
        // 数字右端滑出画布时按可见比例渐隐，避免被画布硬切（半截数字/生硬消失）
        let text = String((i * realSegment) / segment);
        let textWidth = ctx.measureText(text).width;
        let tx = x + 2;
        let visible = Math.min(tx + textWidth, this.width) - Math.max(tx, 0);
        if (visible > 0 && visible < textWidth) ctx.globalAlpha = visible / textWidth;
        ctx.fillText(text, tx, 10);
        ctx.globalAlpha = 1;
      } else ctx.moveTo(x, short);
      ctx.lineTo(x, height);
    }
    ctx.stroke();
    ctx.closePath();
    this.drawSelection();
  }

  // 水平标尺上的投影：workspace x 的像素 = (x - start) * scale（与刻度绘制同一换算）
  drawSelection() {
    let s = this.selection;
    if (!s) return;
    let x1 = (s.x - this.start) * this.scale;
    let x2 = (s.x + s.width - this.start) * this.scale;
    if (x2 < 0 || x1 > this.width) return; // 完全在视口外，跳过
    let ctx = this.context;
    ctx.fillStyle = SELECTION_FILL;
    ctx.fillRect(x1, 0, Math.max(x2 - x1, 1), this.height);
    ctx.fillStyle = SELECTION_COLOR;
    ctx.fillRect(x1, 0, 1, this.height); // 左端边界
    ctx.fillRect(x2 - 1, 0, 1, this.height); // 右端边界
  }
}

export class VerticalRuler extends Ruler {
  constructor(canvas, options) {
    super(canvas, options);
    this.start = -config.originCoords.y; // 默认从0 开始
    this.draw();
  }

  draw() {
    super.draw();
    let width = this.width,
      height = this.height,
      start = this.start,
      segment = this.segment,
      step = this.step + this.offset,
      steps = height / this.step,
      ctx = this.context,
      short = width / 1.5,
      realSegment = this.realSegment;
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width, height);
    // 起点往前多画几个刻度：刻度线出界但旋转后的数字文本（沿 -y 延伸）仍在画布内时，
    // 数字能平滑滑出顶部边界而不是瞬间消失（边界冗余）
    let startIndex = Math.ceil((this.start * this.scale) / step) - Math.ceil(50 / step);
    steps += startIndex + 20;
    for (let i = startIndex; i < steps; i += 1) {
      let y = i * step;
      y -= this.start * this.scale;
      if (i % segment === 0) {
        ctx.moveTo(0, y);
        ctx.save();
        ctx.translate(3, y + 2);
        ctx.rotate(Math.PI / 2);
        // 刻度值 = i * realSegment / segment（绝对序数直接换算；不能用相对计数器，扩展后 i 可能为负）
        // 旋转后数字沿 -y 方向延伸 textWidth：顶端滑出画布时按可见比例渐隐
        let text = String((i * realSegment) / segment);
        let textWidth = ctx.measureText(text).width;
        let top = y + 2 - textWidth;
        let visible = Math.min(y + 2, this.height) - Math.max(top, 0);
        if (visible > 0 && visible < textWidth) ctx.globalAlpha = visible / textWidth;
        ctx.fillText(text, 0, 0);
        ctx.globalAlpha = 1;
        ctx.restore();
      } else ctx.moveTo(short, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.closePath();
    this.drawSelection();
  }

  // 垂直标尺上的投影：workspace y 的像素 = (y - start) * scale
  drawSelection() {
    let s = this.selection;
    if (!s) return;
    let y1 = (s.y - this.start) * this.scale;
    let y2 = (s.y + s.height - this.start) * this.scale;
    if (y2 < 0 || y1 > this.height) return; // 完全在视口外，跳过
    let ctx = this.context;
    ctx.fillStyle = SELECTION_FILL;
    ctx.fillRect(0, y1, this.width, Math.max(y2 - y1, 1));
    ctx.fillStyle = SELECTION_COLOR;
    ctx.fillRect(0, y1, this.width, 1); // 上端边界
    ctx.fillRect(0, y2 - 1, this.width, 1); // 下端边界
  }
}
