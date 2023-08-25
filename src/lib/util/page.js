import { getQuery, uuid } from './helper'
import {
  getCurrentControllersByPage,
  getCurrentPage,
  saveCurrentControllersByPage,
  setCurrentPage,
} from '../global/instance'
import { parseJSON } from '../properties/types'
import { createPage, deletePage as deletePageApi, savePage } from '../../api/page'
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
  let pages = getPageData()
  let data = generateNewPage(pid)
  data.projectid = 'testid'
  data.type = state || 'PAGE'
  data.alias = data.type == 'PAGE' ? '新页面' : '新状态'
  data.width = config.viewport.width
  pages.push(data)
  localStorage.setItem(storage_page_key(data.id), JSON.stringify(data))
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
    createNewPage()

    return LocalPageData
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
    s
  }
}

export const deletePageFromStorage = (id) => {
  localStorage.removeItem(storage_page_key(id))
}

export async function saveToRemoteFromStorage(pages) {
  Event.dispatch(context_save_success)
}
