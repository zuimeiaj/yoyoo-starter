import html2canvas from 'html2canvas';

/**
 * CanvasRender - 使用 html2canvas 将 DOM 元素渲染为 Canvas 图片
 *
 * 注意：html2canvas 内部使用 iframe 渲染，不能有 body > iframe { display: none } 的全局样式。
 *
 * 使用方式:
 *   const renderer = new CanvasRender();
 *   await renderer.renderFromDOM(domElement, { width, height, backgroundColor });
 *   const dataUrl = renderer.toImage();
 *   renderer.destroy();
 */
export default class CanvasRender {
  canvas = null;
  context = null;

  /**
   * 从 DOM 元素渲染为 Canvas
   *
   * @param {HTMLElement} element  - 要截图的 DOM 元素
   * @param {Object} options - { width, height, backgroundColor, scale }
   * @returns {Promise<CanvasRender>}
   */
  async renderFromDOM(element, options = {}) {
    const {
      width,
      height,
      backgroundColor = '#ffffff',
      scale = window.devicePixelRatio || 1,
    } = options;

    const canvas = await html2canvas(element, {
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      scale: scale,
      useCORS: true,
      allowTaint: true,
    });

    this.canvas = canvas;
    this.canvas.className = 'canvas-save-as-image';
    this.context = canvas.getContext('2d');
    return this;
  }

  /**
   * 导出为 base64 DataURL
   * @param {number} quality   - 图片质量 (0-1)
   * @param {string} imageType - 'jpeg' | 'png'
   * @returns {string}
   */
  toImage(quality = 0.92, imageType = 'jpeg') {
    if (!this.canvas) return '';
    return this.canvas.toDataURL(`image/${imageType}`, quality);
  }

  /**
   * 导出为 Blob
   * @param {string} imageType
   * @returns {Promise<Blob|null>}
   */
  toBlob(imageType) {
    if (!this.canvas) return Promise.resolve(null);
    return new Promise((resolve) => {
      this.canvas.toBlob(resolve, `image/${imageType}`);
    });
  }

  /**
   * 清理
   */
  destroy() {
    this.context = null;
    this.canvas = null;
    const el = document.querySelector('.canvas-save-as-image');
    if (el) el.remove();
  }
}
