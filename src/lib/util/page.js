import { getQuery, uuid } from './helper'
import { getCurrentControllersByPage, getCurrentPage, setCurrentPage } from '../global/instance'
import { parseJSON } from '../properties/types'
import { createPage, deletePage as deletePageApi, savePage } from '../../api/page'
import Event from '../Base/Event'
import { context_save_failed, context_save_start, context_save_success, outline_page_select_end, show_create_project } from './actions'
import config from './preference'
import { isArray } from '@/lib/util/helper'

export const storage_page_key = (id) => 'page_data_' + id
var LocalPageData = []
//from server
export const getPageData = () => {
  return LocalPageData
}
export const setPageData = (pages) => {
  LocalPageData = pages
}
export const getPageDataWithId = (pageid) => {
  return getPageData().find((item) => item.id == pageid)
}
window.__GET_PAGE_DATA__ = getPageData
export const refresLocalPageObject = (id, object) => {
  try {
    let pages = getPageData()
    let index = pages.findIndex((item) => item.id == id)
    if (index == -1) return
    let page = pages[index]
    let node = Object.assign({}, object)
    delete node.nodes
    page = Object.assign({}, node, { nodes: page.nodes })
    pages[index] = page
    console.log(pages)
  } catch (e) {
    console.log('Refresh Error', id)
  }
}
export const selectPage = (pageid) => {
  if (getCurrentPage() == pageid) return Promise.reject('already selected')
  return new Promise((resolve) => {
    setCurrentPage(pageid)
    getCurrentControllersByPage(pageid).then((data) => {
      let items = parseJSON(data)
      Event.dispatch(outline_page_select_end, { id: pageid, data: getPageData().find((item) => item.id == pageid) })
      resolve(items)
    })
  })
}

/**
 * 创建页面之前，项目必须存在
 * @param pid
 * @return {Promise<any>}
 */
export const createNewPage = (pid, state) => {
  return new Promise(async (resolve) => {
    let pages = getPageData()
    let data = generateNewPage(pid)
    data.projectid = 'testid'
    data.type = state || 'PAGE'
    data.alias = data.type == 'PAGE' ? '新页面' : '新状态'
    data.width = config.viewport.width
    pages.push(data)
    resolve()
  })
}

export const duplicatePageState = (id, pid) => {
  return new Promise((resolve) => {
    let page = getPageData().find((item) => item.id == id)
    let copyofPage = JSON.parse(JSON.stringify(page))
    copyofPage.id = uuid('page_')
    let prefix = copyofPage.alias.split(' ')[0]
    let name = copyofPage.alias.split(' ')[1]
    name = +(name ? name.trim() : 0) + 1
    copyofPage.alias = prefix + ' ' + name
    if (pid) copyofPage.parentid = pid
    copyofPage.type = 'STATE'
    createPage(copyofPage).then((res) => {
      res.data.nodes = copyofPage.nodes
      copyofPage = null
      getPageData().push(res.data)
      resolve()
    })
  })
}

const batchDeletePage = (ids) => {
  let maps = {}
  ids.forEach((item) => {
    maps[item] = true
    deletePageFromStorage(item)
  })

  let pages = getPageData()
  let realIds = []
  pages = pages.filter((item) => {
    let matched = maps[item.id]
    if (matched) realIds.push(item._id)
    return !matched
  })
  setPageData(pages)
  return Promise.resolve()
}

//delte
export const deletePage = (id) => {
  return new Promise((resolve) => {
    if (isArray(id)) return batchDeletePage(id).then(resolve)
    let pages = getPageData()
    let index = pages.findIndex((item) => item.id == id)
    pages.splice(index, 1)
    deletePageFromStorage(id)
    resolve()
  })
}

//update
export const updateName = (name = '', id) => {
  if (!name.trim()) return Promise.reject()
  return new Promise((resolve) => {
    let item = getPageDataWithId(id)
    if (!item) return
    item.alias = name
    updatePageToSorage(id, item)
  })
}
export const updatePageInfo = (id, key, value) => {
  return new Promise((resolve) => {
    let pages = getPageData()
    let item = pages.find((item) => item.id == id)
    if (!item) return
    item[key] = value
    updatePageToSorage(id, item)
  })
}
export const updatePageGuides = (id, key, value) => {
  return new Promise((resolve) => {
    let pages = getPageData()
    let item = pages.find((item) => item.id == id)
    if (!item) return
    item.guides[key] = value
    updatePageToSorage(id, item)
  })
}
export const generateNewPage = (pid) => ({
  bg: 'rgba(255,255,255,1)',
  width: 380,
  height: 900,
  id: uuid('page_'),
  alias: '新页面',
  parentid: pid || null,
  projectid: null,
  guides: {
    x: [],
    y: [],
  },
  nodes: [],
})
export const getPageListFromStorage = () => {
  let pages = []
  for (let key in localStorage) {
    if (key.startsWith('page_data')) {
      try {
        pages.push(JSON.parse(localStorage.getItem(key)))
      } catch (e) {
        localStorage.removeItem(key)
      }
    }
  }
  if (pages.length == 0) {
    pages.push({
      bg: 'rgba(255,255,255,1)',
      width: 800,
      height: 900,
      id: 'page_47079690562',
      alias: 'YoYoo设计',
      parentid: null,
      projectid: 'testid',
      guides: { x: [], y: [] },
      nodes: [
        {
          type: 'button',
          alias: '文本',
          zIndex: 1001,
          id: 'sb_4840405997604',
          selected: false,
          transform: { x: 30, y: 60, width: 139, height: 42, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 20, topRight: 20, bottomLeft: 20, bottomRight: 20 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(33,150,243,1)',
          font: { size: 14, color: 'rgba(255,255,255,1)' },
          align: { x: 'center', y: 'center' },
          fontData: '按钮',
        },
        {
          type: 'triangle',
          alias: '三角',
          zIndex: 1003,
          id: 'sb_3421084391031',
          selected: false,
          transform: { x: 40, y: 160, width: 100, height: 100, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(224,224,224,1)', style: 'solid' },
          bg: 'rgba(139,195,74,1)',
        },
        {
          type: 'line',
          alias: '直线',
          zIndex: 1004,
          id: 'sb_6266946859678',
          selected: false,
          transform: { x: 180, y: 220, width: 200, height: 1, rotation: 33 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: false, resize: ['l', 'r', 'rotation'], ratio: false, isHide: false, overflow: '', disableH: true },
          border: { width: 'none', color: 'rgba(139,195,74,1)', style: 'solid' },
        },
        {
          type: 'curve',
          alias: '曲线',
          zIndex: 1005,
          id: 'sb_9621740291683',
          selected: false,
          transform: { x: 370, y: 170.5, width: 200, height: 100, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 4, color: 'rgba(33,150,243,1)', style: 'solid' },
          bg: 'rgba(255,255,255,0)',
          curve: { x: 90, y: -68 },
        },
        {
          type: 'circle',
          alias: '圆',
          zIndex: 1006,
          id: 'sb_4287082928635',
          selected: false,
          transform: { x: 40, y: 280, width: 150, height: 150, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: true, isHide: false, overflow: '' },
          border: { width: 75, color: 'rgba(255,152,0,1)', style: 'none' },
          circle: { array: 235.61944901923448, offset: 59.07148018684032 },
        },
        {
          type: 'input',
          alias: '输入',
          zIndex: 1007,
          id: 'sb_9544294941719',
          selected: false,
          transform: { x: 260, y: 290, width: 179, height: 31, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(158,158,158,1)', style: 'solid' },
          corner: { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          font: { size: 14, color: 'rgba(158,158,158,1)' },
          fontData: '   请输入',
        },
        {
          type: 'textarea',
          alias: '多行输入',
          zIndex: 1008,
          id: 'sb_3196493265366',
          selected: false,
          transform: { x: 260, y: 340, width: 179, height: 84, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(158,158,158,1)', style: 'solid' },
          corner: { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          font: { size: 14, color: 'rgba(158,158,158,1)' },
          fontData: '  请输入',
        },
        {
          type: 'select',
          alias: '下拉选择',
          zIndex: 1009,
          id: 'sb_2695686293827',
          selected: false,
          transform: { x: 260, y: 462, width: 181, height: 34, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(158,158,158,1)', style: 'solid' },
          corner: { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          selectOptions: '',
          font: { size: 12, color: 'rgba(221,221,221,1)' },
        },
        {
          type: 'circle',
          alias: '圆(副本)',
          zIndex: 1006,
          id: 'sb_1557065259780',
          selected: false,
          transform: { x: 640, y: 274, width: 150, height: 150, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: true, isHide: false, overflow: '' },
          border: { width: 27, color: 'rgba(255,152,0,1)', style: 'none' },
          circle: { array: 386.41589639154455, offset: 60.08025728588473 },
        },
        {
          type: 'text',
          alias: '文本',
          zIndex: 1010,
          id: 'sb_3599393888312',
          selected: false,
          transform: { x: 30, y: 20, width: 469, height: 24, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          font: { size: 17, color: 'rgba(244,67,54,1)' },
          align: { x: 'flex-start', y: 'flex-start' },
          fontStyle: ['bold'],
          decorator: 'none',
          fontData: 'YOYOO DESIGN 基于React 打造的在线设计工具',
          spacing: { height: 1, width: 0 },
        },
        {
          type: 'block',
          alias: 'Block',
          zIndex: -1,
          id: 'sb_6114880014942',
          selected: false,
          transform: { x: 530, y: 40, width: 201, height: 82, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          items: [
            {
              type: 'rect',
              alias: '矩形',
              zIndex: 1002,
              id: 'sb_4280114166971',
              selected: false,
              transform: { x: 530, y: 40, width: 201, height: 82, rotation: 0 },
              interactions: [],
              animations: {},
              settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '', isLock: true },
              border: { width: 4, color: 'rgba(33,150,243,1)', style: 'solid' },
              corner: { topLeft: 14, topRight: 14, bottomLeft: 14, bottomRight: 14 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(244,67,54,1)',
            },
            {
              type: 'text',
              alias: '文本',
              zIndex: 1013,
              id: 'sb_5384731396274',
              selected: false,
              transform: { x: 581, y: 67, width: 100, height: 28.000000000000004, rotation: 0 },
              interactions: [],
              animations: {},
              settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '', isLock: true },
              border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
              corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(255,255,255,0)',
              font: { size: 14, color: 'rgba(255,255,255,1)' },
              align: { x: 'center', y: 'center' },
              fontStyle: ['bold'],
              decorator: 'none',
              fontData: 'Drag me',
              spacing: { height: 1, width: 0 },
            },
          ],
        },
      ],
      type: 'PAGE',
    })
  }
  return pages
}

export const getUnsavedPageListFromStorage = () => {
  let pages = getPageListFromStorage()
  return pages.filter((item) => !item.projectid)
}
export const updatePageToSorage = (id, data) => {
  localStorage.setItem(storage_page_key(id), JSON.stringify(data))
}
// 保存到后台之后就清除前端的缓存数据
export const clearPageStorage = () => {
  for (let key in localStorage) {
    if (key.startsWith('page_data')) {
      localStorage.removeItem(key)
    }
  }
}

export const deletePageFromStorage = (id) => {
  localStorage.removeItem(storage_page_key(id))
}

export async function saveToRemoteFromStorage(pages) {
  Event.dispatch(context_save_success)
}
