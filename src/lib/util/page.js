import { getQuery, uuid } from './helper'
import {
  getCurrentControllersByPage,
  getCurrentPage,
  saveCurrentControllersByPage,
  setCurrentPage,
} from '../global/instance'
import { parseJSON } from '../properties/types'
import { createPage, savePage } from '../../api/page'
import Event from '../Base/Event'
import {
  context_save_failed,
  context_save_start,
  context_save_success,
  outline_page_add,
  outline_page_select_end,
  show_create_project,
} from './actions'
import config from './preference'
import { isArray } from '@/lib/util/helper'
import { addPage, getPages, updatePage, deletePage as delPageApi } from '../../db'

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
      // isGenerateId：外部数据（如默认 dashboard JSON）可能无 id，加载时自动生成唯一 id（已有 id 保留）
      let items = parseJSON(data, true)
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
  let pages = getPageData()
  let data = generateNewPage(pid)
  data.projectid = 'testid'
  data.type = state || 'PAGE'
  data.alias = data.type == 'PAGE' ? '新页面' : '新状态'
  data.width = config.viewport.width
  pages.push(data)
  return addPage(data)
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
  })

  let pages = getPageData()
  let realIds = []
  pages = pages.filter((item) => {
    let matched = maps[item.id]
    if (matched) realIds.push(item._id)
    return !matched
  })
  setPageData(pages)
  return Promise.all(ids.map(delPageApi))
}

//delte
export const deletePage = (id) => {
  return new Promise((resolve) => {
    if (isArray(id)) return batchDeletePage(id).then(resolve)
    let pages = getPageData()
    let index = pages.findIndex((item) => item.id == id)
    pages.splice(index, 1)
    delPageApi(id).then(resolve)
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
  id: Date.now(),
  alias: '新页面',
  parentid: pid || null,
  projectid: null,
  guides: {
    x: [],
    y: [],
  },
  nodes: [],
})
// 无任何页面时的默认数据源：public/user-profile-dashboard.json（用户画像看板示例）
const DEFAULT_PAGE_URL = (process.env.PUBLIC_URL || '') + '/user-profile-dashboard.json'

const loadDefaultPage = async () => {
  try {
    let res = await fetch(DEFAULT_PAGE_URL)
    if (!res.ok) throw new Error('default page not found')
    let data = await res.json()
    data.id = Date.now() // 覆盖 id 避免与历史数据冲突
    data.alias = data.alias || '用户画像'
    data.parentid = null
    await addPage(data)
  } catch (e) {
    // 默认页加载失败（文件缺失/网络）时兜底：创建空白页
    await createNewPage()
  }
}

export const getPageListFromStorage = async () => {
  let pages = await getPages()
  if (pages.length == 0) {
    await loadDefaultPage()
    pages = await getPages()
    if (pages.length == 0) {
      await createNewPage()
      pages = await getPages()
    }
  }
  return pages
}

export const getUnsavedPageListFromStorage = () => {
  let pages = getPageListFromStorage()
  return pages.filter((item) => !item.projectid)
}
export const updatePageToSorage = (id, data) => {
  data.id = id
  return updatePage(data)
}
// 保存到后台之后就清除前端的缓存数据
export const clearPageStorage = () => {
  for (let key in localStorage) {
    if (key.startsWith('page_data')) {
      localStorage.removeItem(key)
    }
    s
  }
}

export const deletePageFromStorage = (id) => {
  localStorage.removeItem(storage_page_key(id))
}

export async function saveToRemoteFromStorage(pages) {
  Event.dispatch(context_save_success)
}
