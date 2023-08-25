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
  let canvas = new CanvasRender()
  await canvas.renderCanvas(group, page)
  let image = canvas.toImage(1, 'png')
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
