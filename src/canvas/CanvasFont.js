import CanvasView from './CanvasView';

export default class CanvasFont extends CanvasView {
  draw() {
    this.ctx.save();
    this.drawRect();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.beginPath();
    let type = this.data.type;
    if (type === 'textarea') {
      this.data.spacing = { width: 0, height: 1 };
      this.data.fontStyle = [];
      this.data.align = {
        x: 'flex-start',
        y: 'flex-start',
      };
      this.drawTextarea();
    } else {
      this.drawFont();
    }
    this.ctx.restore();
  }

  drawTextarea() {
    this.rect.x += 10;
    this.rect.y += 6;
    this.drawFont();
    let { x, y, width, height } = this.rect;
    x = this.rect.x -= 10;
    y = this.rect.y -= 6;
    let edge = x + width,
      b = y + height;
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#d3d3d3';
    this.ctx.lineWidth = 1;
    this.ctx.moveTo(edge, y + height - 8);
    this.ctx.lineTo(edge - 8, b);
    this.ctx.moveTo(edge, y + height - 5);
    this.ctx.lineTo(x + width - 5, b);
    this.ctx.stroke();
    this.ctx.closePath();
  }

  drawLabel(data, x, y, width, height, h) {
    let alignX, alignY;
    let {
      align,
      font: { size, color },
      decorator,
    } = this.data;
    let length = data.length;
    data = data.data;
    if (align.y === 'center') {
      alignY = 'middle';
      data = data.map((item) => {
        item.y = y + height / 2 - h / 2 + size / 2;
        return item;
      });
    } else if (align.y === 'flex-start') {
      alignY = 'top';
      data = data.map((item) => {
        item.y = y;
        return item;
      });
    } else {
      // flex-end
      alignY = 'bottom';
      data = data.map((item) => {
        item.y = height + y - h + size;
        return item;
      });
    }
    if (align.x === 'center') {
      alignX = 'center';
      data = data.map((item) => {
        item.x = x + item.x - length / 2 + width / 2 + item.width / 2;
        return item;
      });
    } else if (align.x === 'flex-start') {
      alignX = 'left';
      data = data.map((item) => {
        item.x = item.x + x;
        return item;
      });
    } else if (align.x === 'flex-end') {
      alignX = 'start';
      data = data.map((item) => {
        item.x = item.x + x + width - length;
        return item;
      });
    }
    this.ctx.textAlign = alignX;
    this.ctx.textBaseline = alignY;
    data.forEach((item) => {
      this.ctx.fillText(item.char, item.x, item.y);
    });
    let y2 = data[0].y;
    if (align.y == 'flex-start') y2 += size;
    else if (align.y == 'center') y2 += size / 2;
    if (decorator == 'line-through') y2 -= size / 2 - 2;
    if (decorator && decorator != 'none') {
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.moveTo(x, y2);
      this.ctx.lineTo(x + width, y2);
      this.ctx.stroke();
    }
  }

  drawFont() {
    let {
      font: { size, color },
      spacing,
      fontStyle: style = [],
      decorator,
    } = this.data;
    let lineHeight = (spacing || {}).height || 1;
    let { x, y, width, height } = this.rect;
    this.ctx.font = `${style.join(' ')} ${size}px Arial`;
    this.ctx.fillStyle = color;
    let rows = this.getRowsWithBreak();
    let h = rows.length * size * lineHeight;
    let ctx = this.ctx;
    for (let i = 0; i < rows.length; i++) {
      let col = rows[i];
      this.drawLabel(col, x, y, width, height, h);
      y += size * lineHeight;
    }
  }

  getRowsWithBreak() {
    let rows = [];
    this.data.fontData.split('<br>').forEach((item) => {
      rows = rows.concat(this.getRows(item.replace(/&nbsp;/g, ' ')));
    });
    return rows;
  }

  getRows(data) {
    data = data || this.data.fontData;
    let width = this.rect.width;
    let {
      font: { size },
      spacing,
    } = this.data;
    let { width: spacingWidth = 0 } = spacing || {};
    let realWith = this.ctx.measureText(data).width + data.length * spacingWidth;
    let rows = Math.ceil(realWith / width);
    let k = size,
      length = data.length,
      index = 0,
      result = [];
    for (let i = 0; i < rows; i++) {
      let col = [];
      let j = 0;
      for (; j < width; ) {
        if (index >= length) break;
        let char = data.charAt(index);
        if (!char) break;
        if (char.charCodeAt(0) < 256) {
          k = this.ctx.measureText(char).width;
        } else {
          k = size;
        }
        col.push({
          x: j,
          char: char,
          width: k,
        });
        index += 1;
        k += spacingWidth;
        j += k;
        if (j > width) {
          j -= k;
          index -= 1;
          col.pop();
          break;
        }
      }
      if (col.length > 0) {
        result.push({
          length: j,
          data: col,
        });
      }
    }
    return result;
  }
}
