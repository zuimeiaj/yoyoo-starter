import CanvasFont from './CanvasFont';
import CanvasView from './CanvasView';
import jQuery from 'jquery';
import CanvasImage, { ImageLoader } from './CanvasImage';
import CanvasLine from './CanvasLine';
import CanvasTriangle from './CanvasTriangle';
import CanvasBubble from './CanvasBubble';
import CanvasCurve from './CanvasCurve';
import CanvasCircle from './CanvasCircle';
import CanvasIcon from './CanvasIcon';
import CanvasInput from './CanvasInput';
import CanvasSelect from './CanvasSelect';
import CanvasBlock, { CanvasMaster } from '@/canvas/CanvasBlock';

let viewMap = {
  image: CanvasImage,
  text: CanvasFont,
  textarea: CanvasFont,
  icon: CanvasIcon,
  radio: CanvasFont,
  input: CanvasInput,
  select: CanvasSelect,
  button: CanvasFont,
  checkbox: CanvasFont,
  rect: CanvasView,
  line: CanvasLine,
  triangle: CanvasTriangle,
  bubble: CanvasBubble,
  curve: CanvasCurve,
  circle: CanvasCircle,
  block: CanvasBlock,
  master: CanvasMaster,
};
export default class CanvasRender {
  /**
   *
   * @type {HTMLCanvasElement}
   */
  canvas = null;
  /**
   *g
   * @type {CanvasRenderingContext2D}
   */
  context = null;
  /**
   *
   * @type {ImageLoader}
   */
  assets = null;

  createCanvas(width, height) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    let ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.scale(ratio, ratio);
    return { canvas, context };
  }

  toImage(quality = 0.92, imageType = 'jpeg') {
    return this.canvas.toDataURL(`image/${imageType}`, quality);
  }

  toBlob(imageType) {
    return new Promise((resolve) => {
      this.canvas.toBlob(resolve, `image/${imageType}`);
    });
  }

  render(data, parent, isSingleObject = false) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    data.forEach((item) => {
      try {
        let CanvasClass = viewMap[item.type] || CanvasView;
        let view = new CanvasClass(item, parent);
        view.isSingleObject = isSingleObject;
        view.ctx = this.context;
        view.canvas = this.canvas;
        view.assets = this.assets;
        view.draw();
        if (item.items && item.items.length > 0) {
          this.render(item.items, view);
        }
      } catch (e) {
        console.error('render error', e, item);
      }
    });
  }

  destroy() {
    this.context = null;
    this.canvas = null;
    jQuery('.canvas-save-as-image').remove();
  }

  sortDataWithZIndex = (data) => {
    if (!Array.isArray(data)) data = [data];
    data = data.sort((a, b) => a.zIndex - b.zIndex);
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      if (item.items && item.items.length > 0) {
        item.items = this.sortDataWithZIndex(item.items);
      }
    }
    return data;
  };
  _filterImage = (arr) => {
    if (!Array.isArray(arr)) arr = [arr];
    let images = [];
    const filter = (data) => {
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].type == 'image') {
          images.push({ id: data[i].id, url: data[i].image.source });
        } else {
          if (data[i].items && data[i].items.length > 0) {
            filter(data[i].items);
          }
        }
      }
    };
    filter(arr);
    return images;
  };
  renderCanvas = async (data, page = { width: 380, height: 1000, isSingleObject: false }) => {
    data = jQuery.extend(true, Array.isArray(data) ? [] : {}, data);
    let rendered = this;
    let canvas = rendered.createCanvas(page.width, page.height);
    rendered.canvas = canvas.canvas;
    rendered.canvas.className = 'canvas-save-as-image';
    document.body.appendChild(rendered.canvas);
    rendered.context = canvas.context;
    rendered.context.fillStyle = '#ffffff';
    rendered.context.fillRect(0, 0, page.width, page.height);
    rendered.assets = new ImageLoader(rendered._filterImage(data));
    await rendered.assets.load();
    rendered.render(rendered.sortDataWithZIndex(data), null, page.isSingleObject);
    return rendered;
  };
}
