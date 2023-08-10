/**
 *  created by yaojun on 2018/11/29
 *
 */

class BaseCanvas {
  /**
   *
   * @param canvas {HTMLCanvasElement}
   */
  constructor(canvas, options) {
    this.canvas = canvas;
    this.options = Object.assign({}, options || {});
    this.width = 0;
    this.height = 0;
    this.scale = 1;
    this.context = canvas.getContext('2d');
    this.init();
  }

  init() {
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = this.canvas.parentNode.getBoundingClientRect();
    this.width = width;
    this.height = height;
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.context.scale(ratio, ratio);
  }
}

export default BaseCanvas;
