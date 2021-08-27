import { getQuery, uuid } from './helper'
import { getCurrentControllersByPage, getCurrentPage, setCurrentPage } from '../global/instance'
import { parseJSON } from '../properties/types'
import { createPage, deletePage as deletePageApi, savePage } from '../../api/page'
import Event from '../Base/Event'
import {
  context_save_failed,
  context_save_start,
  context_save_success,
  outline_page_select_end,
  show_create_project,
} from './actions'
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
      height: 1010.5999999999998,
      id: 'page_47079690562',
      alias: 'YoYoo设计',
      parentid: null,
      projectid: 'testid',
      guides: { x: [], y: [] },
      nodes: [
        {
          type: 'button',
          alias: '文本',
          zIndex: 1013,
          id: 'sb_8847421171964',
          selected: false,
          transform: { x: 56, y: 160, width: 247, height: 37, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(244,67,54,1)', style: 'solid' },
          corner: { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(244,67,54,0.29)',
          font: { size: 14, color: 'rgba(0,0,0,1)' },
          align: { x: 'center', y: 'center' },
          fontData: '按钮',
        },
        {
          type: 'text',
          alias: '文本',
          zIndex: 1016,
          id: 'sb_1850610841450',
          selected: false,
          transform: { x: -252, y: 168, width: 247, height: 491, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          font: { size: 14, color: 'rgba(21,57,255,1)' },
          align: { x: 'flex-start', y: 'flex-start' },
          fontStyle: [],
          decorator: 'none',
          fontData:
            '快捷键：<br><br>1、Ctrl Z&nbsp; 撤销<br>2、Ctrl Shift Z 重做<br>3、Ctrl Shift F 组件居中显示<br>4、Del 删除组件<br>5、Ctrl G&nbsp; 多个组件分组<br>6、Ctrl Shift G 解散分组<br>7、L 组件左对齐<br>8、R 组件右对齐<br>9、T 组件顶部对齐<br>10、B 组件底部对齐<br>11、C 组件水平居中对齐<br>12、M 组件垂直居中对齐<br>13、Shift 上 组件图层上移<br>14、Shift 下 组件图层下移<br>15、Ctrl D 创建组件副本<br>16、Ctrl S 保存<br>17、Ctrl C 复制组件<br>18、Ctrl v 粘贴组件到鼠标位置<br>19、Ctrl x 剪切组件<br><br>',
          spacing: { height: 1.5, width: 0 },
        },
        {
          type: 'triangle',
          alias: '三角',
          zIndex: 1017,
          id: 'sb_0379353132215',
          selected: false,
          transform: { x: 496, y: 350, width: 100, height: 100, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(224,224,224,1)', style: 'solid' },
          bg: 'rgba(255,255,255,0)',
        },
        {
          type: 'block',
          alias: 'Block',
          zIndex: -1,
          id: 'sb_9088901861580',
          selected: false,
          transform: { x: 56, y: 330, width: 245, height: 65, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          items: [
            {
              type: 'bubble',
              alias: '气泡',
              zIndex: 1018,
              id: 'sb_7923204819989',
              selected: false,
              transform: { x: 56, y: 330, width: 245, height: 65, rotation: 0 },
              interactions: [],
              animations: {},
              settings: {
                fixation: false,
                hover: true,
                resize: null,
                ratio: false,
                isHide: false,
                overflow: '',
                isLock: true,
              },
              border: { width: 1, color: 'rgba(224,224,224,1)', style: 'solid' },
              bg: 'rgba(255,255,255,0)',
              bubble: { left: 20 },
            },
            {
              type: 'text',
              alias: '文本',
              zIndex: 1019,
              id: 'sb_1048410869725',
              selected: false,
              transform: { x: 69, y: 350, width: 81, height: 28, rotation: 0 },
              interactions: [],
              animations: {},
              settings: {
                fixation: false,
                hover: true,
                resize: null,
                ratio: false,
                isHide: false,
                overflow: '',
                isLock: true,
              },
              border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
              corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(255,255,255,0)',
              font: { size: 14, color: 'rgba(0,0,0,1)' },
              align: { x: 'flex-start', y: 'flex-start' },
              fontStyle: [],
              decorator: 'none',
              fontData: '聊天气泡',
              spacing: { height: 1, width: 0 },
            },
          ],
        },
        {
          type: 'block',
          alias: 'Block',
          zIndex: -1,
          id: 'sb_0611042438726',
          selected: false,
          transform: { x: 57, y: 200, width: 246, height: 100, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          items: [
            {
              type: 'text',
              alias: '文本',
              zIndex: 1015,
              id: 'sb_3128843305720',
              selected: false,
              transform: { x: 130, y: 236, width: 100, height: 28, rotation: 0 },
              interactions: [],
              animations: {},
              settings: {
                fixation: false,
                hover: true,
                resize: null,
                ratio: false,
                isHide: false,
                overflow: '',
                isLock: true,
              },
              border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
              corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(255,255,255,0)',
              font: { size: 14, color: 'rgba(0,0,0,1)' },
              align: { x: 'center', y: 'center' },
              fontStyle: [],
              decorator: 'none',
              fontData: '矩形',
              spacing: { height: 1, width: 0 },
            },
            {
              type: 'rect',
              alias: '矩形',
              zIndex: 1014,
              id: 'sb_4342932402227',
              selected: false,
              transform: { x: 57, y: 200, width: 246, height: 100, rotation: 0 },
              interactions: [],
              animations: {},
              settings: {
                fixation: false,
                hover: true,
                resize: null,
                ratio: false,
                isHide: false,
                overflow: '',
                isLock: true,
              },
              border: { width: 1, color: 'rgba(106,106,106,1)', style: 'solid' },
              corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(221,221,221,1)',
            },
          ],
        },
        {
          type: 'block',
          alias: 'Block',
          zIndex: -1,
          id: 'sb_0275360663270',
          selected: false,
          transform: { x: 409, y: 630, width: 297, height: 75, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          items: [
            {
              type: 'text',
              alias: '文本',
              zIndex: 1021,
              id: 'sb_3478348147542',
              selected: false,
              transform: { x: 505, y: 635, width: 127, height: 16, rotation: 0 },
              interactions: [],
              animations: {},
              settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
              border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
              corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(255,255,255,0)',
              font: { size: 14, color: 'rgba(0,0,0,1)' },
              align: { x: 'flex-start', y: 'flex-start' },
              fontStyle: [],
              decorator: 'none',
              fontData: '线条',
              spacing: { height: 1, width: 0 },
            },
            {
              type: 'line',
              alias: '直线',
              zIndex: 1020,
              id: 'sb_0856564553908',
              selected: false,
              transform: { x: 405, y: 667, width: 306, height: 1, rotation: 14 },
              interactions: [],
              animations: {},
              settings: {
                fixation: false,
                hover: false,
                resize: ['l', 'r', 'rotation'],
                ratio: false,
                isHide: false,
                overflow: '',
                disableH: true,
              },
              border: { width: 'none', color: 'rgba(224,224,224,1)', style: 'solid' },
            },
          ],
        },
        {
          type: 'block',
          alias: 'Block',
          zIndex: -1,
          id: 'sb_5130810609101',
          selected: false,
          transform: { x: 561, y: 200, width: 145, height: 145, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          items: [
            {
              type: 'circle',
              alias: '圆',
              zIndex: 1029,
              id: 'sb_6378578517460',
              selected: false,
              transform: { x: 561, y: 200, width: 145, height: 145, rotation: 0 },
              interactions: [],
              animations: {},
              settings: { fixation: false, hover: true, resize: null, ratio: true, isHide: false, overflow: '' },
              border: { width: 8.700000000000001, color: 'rgba(224,224,224,1)', style: 'none' },
              circle: { array: 428.19907868428885, offset: 0 },
            },
            {
              type: 'text',
              alias: '文本',
              zIndex: 1030,
              id: 'sb_2188096132207',
              selected: false,
              transform: { x: 606, y: 259, width: 54, height: 27, rotation: 0 },
              interactions: [],
              animations: {},
              settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
              border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
              corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(255,255,255,0)',
              font: { size: 14, color: 'rgba(0,0,0,1)' },
              align: { x: 'center', y: 'center' },
              fontStyle: [],
              decorator: 'none',
              fontData: '75%',
              spacing: { height: 1, width: 0 },
            },
            {
              type: 'circle',
              alias: '圆(副本)',
              zIndex: 1029,
              id: 'sb_6539265902454',
              selected: false,
              transform: { x: 561, y: 200, width: 145, height: 145, rotation: 0 },
              interactions: [],
              animations: {},
              settings: { fixation: false, hover: true, resize: null, ratio: true, isHide: false, overflow: '' },
              border: { width: 8.700000000000001, color: 'rgba(255,152,0,1)', style: 'none' },
              circle: { array: 428.19907868428885, offset: 108.30970064960958 },
            },
          ],
        },
        {
          type: 'block',
          alias: 'Block',
          zIndex: -1,
          id: 'sb_0443209510711',
          selected: false,
          transform: { x: 364, y: 176, width: 187, height: 187, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          items: [
            {
              type: 'text',
              alias: '文本',
              zIndex: 1028,
              id: 'sb_2034683414892',
              selected: false,
              transform: { x: 408, y: 256, width: 100, height: 28, rotation: 0 },
              interactions: [],
              animations: {},
              settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
              border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
              corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(255,255,255,0)',
              font: { size: 14, color: 'rgba(0,0,0,1)' },
              align: { x: 'center', y: 'center' },
              fontStyle: [],
              decorator: 'none',
              fontData: '饼图',
              spacing: { height: 1, width: 0 },
            },
            {
              type: 'block',
              alias: 'Block',
              zIndex: -1,
              id: 'sb_8153017219445',
              selected: false,
              transform: { x: 364, y: 176, width: 187, height: 187, rotation: 0 },
              interactions: [],
              animations: {},
              settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
              border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
              corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
              bg: 'rgba(255,255,255,0)',
              items: [
                {
                  type: 'circle',
                  alias: '圆',
                  zIndex: 1027,
                  id: 'sb_0633412036701',
                  selected: false,
                  transform: { x: 383, y: 195, width: 150, height: 150, rotation: 2 },
                  interactions: [],
                  animations: {},
                  settings: { fixation: false, hover: true, resize: null, ratio: true, isHide: false, overflow: '' },
                  border: { width: 31.800000000000015, color: 'rgba(244,67,54,1)', style: 'none' },
                  circle: { array: 371.3362516543135, offset: 205.2945967831937 },
                },
                {
                  type: 'circle',
                  alias: '圆(副本)',
                  zIndex: 1027,
                  id: 'sb_5585497727624',
                  selected: false,
                  transform: { x: 383, y: 195, width: 150, height: 150, rotation: 163 },
                  interactions: [],
                  animations: {},
                  settings: { fixation: false, hover: true, resize: null, ratio: true, isHide: false, overflow: '' },
                  border: { width: 31.800000000000015, color: 'rgba(63,81,181,1)', style: 'none' },
                  circle: { array: 371.3362516543135, offset: 205.2945967831937 },
                },
                {
                  type: 'circle',
                  alias: '圆(副本)',
                  zIndex: 1027,
                  id: 'sb_4451616308093',
                  selected: false,
                  transform: { x: 383, y: 195, width: 150, height: 150, rotation: 260 },
                  interactions: [],
                  animations: {},
                  settings: { fixation: false, hover: true, resize: null, ratio: true, isHide: false, overflow: '' },
                  border: { width: 31.800000000000015, color: 'rgba(255,152,0,1)', style: 'none' },
                  circle: { array: 371.3362516543135, offset: 205.2945967831937 },
                },
              ],
            },
          ],
        },
        {
          type: 'block',
          alias: 'Block',
          zIndex: -1,
          id: 'sb_0956098201361',
          selected: false,
          transform: { x: 396, y: 99, width: 337, height: 87, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          items: [
            {
              type: 'curve',
              alias: '曲线',
              zIndex: 1022,
              id: 'sb_6376600902376',
              selected: false,
              transform: { x: 396, y: 99, width: 170, height: 44, rotation: 0 },
              interactions: [],
              animations: {},
              settings: {
                fixation: false,
                hover: true,
                resize: null,
                ratio: false,
                isHide: false,
                overflow: '',
                isLock: true,
              },
              border: { width: 1, color: 'rgba(255,152,0,1)', style: 'solid' },
              bg: 'rgba(255,255,255,0)',
              curve: { x: 100, y: 10 },
            },
            {
              type: 'curve',
              alias: '曲线(副本)',
              zIndex: 1022,
              id: 'sb_8329751435203',
              selected: false,
              transform: { x: 563, y: 142, width: 170, height: 44, rotation: 180 },
              interactions: [],
              animations: {},
              settings: {
                fixation: false,
                hover: true,
                resize: null,
                ratio: false,
                isHide: false,
                overflow: '',
                isLock: true,
              },
              border: { width: 1, color: 'rgba(255,152,0,1)', style: 'solid' },
              bg: 'rgba(255,255,255,0)',
              curve: { x: 100, y: 10 },
            },
          ],
        },
        {
          type: 'curve',
          alias: '曲线',
          zIndex: 1031,
          id: 'sb_5296448478287',
          selected: false,
          transform: { x: 452, y: 473, width: 200, height: 100, rotation: 180 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 5, color: 'rgba(255,152,0,1)', style: 'solid' },
          bg: 'rgba(255,255,255,0)',
          curve: { x: 100, y: 10 },
        },
        {
          type: 'input',
          alias: '输入',
          zIndex: 1032,
          id: 'sb_5008260250405',
          selected: false,
          transform: { x: 57, y: 420, width: 180, height: 36, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          font: { size: 14, color: 'rgba(224,224,224,1)' },
          fontData: '请输入',
        },
        {
          type: 'textarea',
          alias: '多行输入',
          zIndex: 1033,
          id: 'sb_6186193521309',
          selected: false,
          transform: { x: 57, y: 476, width: 180, height: 42, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          font: { size: 14, color: 'rgba(224,224,224,1)' },
          fontData: '请输入',
        },
        {
          type: 'select',
          alias: '下拉选择',
          zIndex: 1034,
          id: 'sb_3013610461907',
          selected: false,
          transform: { x: 57, y: 532, width: 180, height: 35, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 1, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          selectOptions: '',
          font: { size: 12, color: 'rgba(221,221,221,1)' },
        },
        {
          type: 'text',
          alias: '文本',
          zIndex: 1035,
          id: 'sb_9180175862506',
          selected: false,
          transform: { x: 56, y: 28, width: 320, height: 32, rotation: 0 },
          interactions: [],
          animations: {},
          settings: { fixation: false, hover: true, resize: null, ratio: false, isHide: false, overflow: '' },
          border: { width: 0, color: 'rgba(224,224,224,1)', style: 'solid' },
          corner: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          shadow: { blur: 0, spread: 0, offsetX: 0, offsetY: 0, color: 'rgba(255,255,255,1)', type: 'outset' },
          bg: 'rgba(255,255,255,0)',
          font: { size: 28, color: 'rgba(244,67,54,1)' },
          align: { x: 'flex-start', y: 'flex-start' },
          fontStyle: ['bold'],
          decorator: 'none',
          fontData: 'YOYOO DESIGN',
          spacing: { height: 1, width: 0 },
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
