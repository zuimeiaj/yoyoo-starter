import CanvasView from './CanvasView';

export default class CanvasSelect extends CanvasView {
  draw() {
    this.ctx.save();
    this.drawRect();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.clip();
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
    let value = '请选择';
    let defaultSelect = this.data.selectOptions.split(/\n/).filter((item) => item.trim().startsWith('>'));
    if (defaultSelect && defaultSelect[0]) {
      value = defaultSelect[0].trim().slice(1);
    }
    let { x, y, width, height } = this.rect;
    let edge = x + width - 10,
      hc = y + height / 2 - 2,
      hcd = y + height / 2 + 2;
    this.ctx.beginPath();
    let { size, color } = this.data.font;
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px`;
    this.ctx.fillText(value, x + 5, y + height / 2);
    // 上三角
    this.ctx.moveTo(edge, hc);
    this.ctx.lineTo(edge - 5, hc - 5);
    this.ctx.lineTo(edge - 10, hc);
    this.ctx.lineTo(edge, hc);
    this.ctx.fill();

    this.ctx.moveTo(edge, hcd);
    this.ctx.lineTo(edge - 5, hcd + 5);
    this.ctx.lineTo(edge - 10, hcd);
    this.ctx.lineTo(edge, hcd);
    this.ctx.fill();
    this.ctx.restore();
  }
}
