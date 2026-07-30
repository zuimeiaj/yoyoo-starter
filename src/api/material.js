import { Http } from './config'
import { deflate, infalte } from './zip'
import { getQuery, isArray } from '@/lib/util/helper'
import { setMasterToStore } from '@/api/master'
import { getPageTransform } from '@/lib/global/template'
import CanvasRender from '@/canvas'
export let MATERIAL_LIST = 'material/list/assets'
export let TEMPLATE_LIST = 'material/list/template'
export let UPDATE_MATERIAL_NAME = 'material/name'
export function setDataToCache(url, data) {
  localStorage.setItem(url, deflate(data))
}
export function getDataFromCache(url, defaultData) {
  let list = localStorage.getItem(url)
  if (list) return infalte(list)
  return defaultData
}
export const fetchAssets = (send = {}) => {
  return new Promise((resolve) => {
    let list = getDataFromCache('material/list/assets', [])
    resolve(list)
  })
}
export const fetchTemplate = (send = {}) => {
  return Promise.resolve(getDataFromCache('material/list/template', []))
}

export function infalteContent(res) {
  let docs = res.data.docs ? res.data.docs : res.data
  res.data.docs = docs.map((item) => {
    item.base64 = item.content
    item.content = infalte(item.content)
    return item
  })
  return res
}

export const updateMaterialName = (id, name) => {
  let list = getDataFromCache('material/list/assets', [])
  list.forEach((item) => {
    if (item.id == id) {
      item.name = name
    }
  })
  setDataToCache(MATERIAL_LIST, list)
}

/**
 * 为多个组件创建临时导出 DOM 容器
 * @param {Array} nodes  - 节点数组 (带 .view 的 ViewProperties)
 * @param {Object} page  - { width, height, x, y }
 * @returns {HTMLElement}
 */
function createTempExportWrapper(nodes, page) {
  const wrapper = document.createElement('div');
  wrapper.className = 'temp-export-wrapper canvas-save-as-image';
  // 使用 fixed 放在屏幕内可见位置，确保 html2canvas 能正常渲染
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0px';
  wrapper.style.top = '0px';
  wrapper.style.zIndex = '999999';
  wrapper.style.width = (page.width || 500) + 'px';
  wrapper.style.height = (page.height || 500) + 'px';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.overflow = 'hidden';

  nodes.forEach((node) => {
    const viewController = node.view;
    if (!viewController) return;
    const domEl = viewController.getDomWrapper ? viewController.getDomWrapper() : null;
    if (!domEl) return;
    const clone = domEl.cloneNode(true);
    const t = node.transform;
    clone.style.position = 'absolute';
    clone.style.left = (t.x - (page.x || 0)) + 'px';
    clone.style.top = (t.y - (page.y || 0)) + 'px';
    wrapper.appendChild(clone);
  });

  document.body.appendChild(wrapper);
  return wrapper;
}

const optMaterial = (send, uri) => {
  let content = send.content
  return Http.post(uri, zipContent(send)).then(async (res) => {
    if (send.type == 'MASTER') {
      send.base64 = send.content
      send.content = content
      send._id = (res.data && res.data._id) || send._id
      content.Image = new Image()
      content.Image.src = content.image
      setMasterToStore(send)
    }
    return res
  })
}
export const createMaterial = (send) => {
  return optMaterial(send, 'material/create')
}
export const saveMaster = async (send) => {
  let id = getQuery().m
  let group = getPageTransform(send.nodes)
  let page = Object.assign({}, group.transform)
  page.isSingleObject = true

  // 使用 html2canvas 从 DOM 渲染
  let element;
  if (send.nodes.length === 1 && send.nodes[0].view) {
    // 单个组件：直接使用其 DOM 元素
    element = send.nodes[0].view.getDomWrapper();
  } else {
    // 多个组件：创建临时容器包裹克隆的 DOM
    element = createTempExportWrapper(send.nodes, page);
  }

  let canvas = new CanvasRender()
  await canvas.renderFromDOM(element, {
    width: page.width,
    height: page.height,
    backgroundColor: '#ffffff',
  })

  let image = canvas.toImage(1, 'png')
  canvas.destroy()

  // 清理临时元素
  if (element.classList && element.classList.contains('temp-export-wrapper')) {
    element.remove();
  }

  return optMaterial(
    {
      _id: id,
      type: 'MASTER',
      content: {
        type: 'AdvanceComponent',
        elementType: 'MASTER',
        data: group,
        page,
        image,
      },
    },
    'project/saveMaster'
  )
}

function zipContent(send) {
  if (send.type != 'ASSET') {
    send = Object.assign({}, send)
    send.content = deflate(send.content)
    send.size = Buffer.byteLength(send.content)
  }
  return send
}

export const deleteMaterial = (id, url) => {
  return Http.post('material/delete', { id, url })
}
export const deleteTemplate = (id) => {
  if (isArray(id)) id = id.join(',')
  return Http.post('material/deleteTemplate', { id })
}
