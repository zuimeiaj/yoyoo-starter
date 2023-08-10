import Event from '../Base/Event';
import { component_active, component_empty, component_inactive } from '../util/actions';
import jQuery from 'jquery';
import ViewSelectGroupBordered from '../Widget/ViewSelectGroupBordered';
import { getPageData, storage_page_key } from '../util/page';
import { findPageDetail } from '../../api/page';
import { getQuery } from '@/lib/util/helper';
import { setMasterNodes } from '@/api/master';

/**
 *
 * @type {ViewSelectGroupBordered}
 */
let group = null;
export const setTemporaryGroup = (i) => {
  group = i;
};
/**
 *
 * @return {ViewSelectGroupBordered}
 */
export const getTemporaryGroup = () => {
  return group;
};
/**
 * 暂时先写到内存
 * @type {ViewProperties | Arrary<ViewProperties>}
 */
let clipboard = null;
/**
 *
 * @return {ViewProperties | Arrary<ViewProperties>}
 */
export const getClipboardData = () => {
  return clipboard ? JSON.parse(clipboard) : clipboard;
};
/**
 *
 * @param c {ViewProperties | Array<ViewProperties>}
 */
export const setClipboardData = (c) => {
  if (c) c = JSON.stringify(c);
  clipboard = c;
};
/**
 *
 * @type {ViewText}
 */
let currentEditor = null;
/**
 *
 * @return {ViewText}
 */
export const getCurrentEditor = () => {
  return currentEditor;
};
/**
 *
 * @param editor {ViewText}
 */
export const setCurrentEditor = (editor) => {
  if (currentEditor && currentEditor !== editor) {
    currentEditor.setEditorBlur();
  }
  currentEditor = editor;
};
/**
 *
 * @type {ViewController}
 */
let firstResponder = null;
/**
 *
 * @return {ViewController | ViewSelectGroupBordered}
 */
export const getFirstResponder = () => {
  return firstResponder;
};
/**
 *
 * Set the component that is currently operating
 * @param responder {ViewController }
 */
export const setFirstResponder = (responder, options) => {
  if (firstResponder && firstResponder !== responder) {
    Event.dispatch(component_inactive, firstResponder, responder);
    let dom = firstResponder.getIndexDomWrapper();
    jQuery(dom).removeClass('component-active');
  }
  if (responder) {
    firstResponder = responder;
    Event.dispatch(component_active, responder, options);
    let dom = responder.getIndexDomWrapper();
    jQuery(dom).addClass('component-active');
  } else {
    firstResponder = null;
    Event.dispatch(component_empty);
  }
};
let viewPickedStatus = false;
export const setViewPickedStatus = (status) => {
  viewPickedStatus = status;
};
export const getViewPickedStatus = () => {
  return viewPickedStatus;
};
// 页面管理=======================
let pageid = null;
export const getCurrentPage = () => {
  return pageid;
};
export const setCurrentPage = (id) => {
  pageid = id;
  if (id) localStorage.setItem('selected-page', pageid);
  else {
    localStorage.removeItem('selected-page');
  }
};
export const clearCurrentPage = () => {
  pageid = null;
};
export const getCurrentPageConfig = () => {
  if (pageid) {
    return getPageData().find((item) => item.id == pageid);
  }
  return {};
};
/**
 * 获取选中页面数据
 * @param pageid
 * @return {*}
 */
export const getCurrentControllersByPage = (_pageid) => {
  _pageid = _pageid || pageid;
  if (_pageid) {
    let page = getPageData().find((item) => item.id == _pageid);
    if (page.nodes == void 0) {
      return findPageDetail(page._id).then((result) => {
        Object.assign(page, result.data);
        return result.data.nodes;
      });
    } else {
      return Promise.resolve(page.nodes);
    }
  } else {
    console.info('Page not found');
    return Promise.resolve([]);
  }
};
export const saveCurrentControllersByMaster = (data) => {
  let m = getQuery().m;
  if (data) {
    setMasterNodes(m, data); // 同步内存数据
    localStorage.setItem(m, JSON.stringify(data));
  } else {
    localStorage.removeItem(m);
  }
};
export const getMasterDataFromStorage = () => {
  let data = getMasterStringDataFromStorage();
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
};
export const clearCurrentMasterFromStorage = () => {
  localStorage.removeItem(getQuery().m);
};
export const getMasterStringDataFromStorage = () => {
  return localStorage.getItem(getQuery().m);
};
export const saveCurrentControllersByPage = (data) => {
  if (pageid) {
    let page = getPageData().find((item) => item.id == pageid);
    try {
      if (page) {
        page.nodes = data;
        localStorage.setItem(storage_page_key(pageid), JSON.stringify(page));
      }
    } catch (e) {
      alert('超过浏览器存储限制');
    }
  } else {
    console.log('Page not found');
  }
};
let globalShiftKeyPressed = false;
export const isShiftKeyBePressed = () => {
  return globalShiftKeyPressed;
};
export const setShiftKeyPressed = (p) => {
  globalShiftKeyPressed = p;
};
let lockedView = [];
export const pushUnlockedView = (view) => {
  lockedView.push(view);
};
export const clearUnlockedView = () => {
  lockedView.forEach((item) => (item.isLockChildren = true));
  lockedView = [];
};
let PATHES = {};
export const clearPATHES = () => {
  PATHES = {};
};
export const getPATHES = () => {
  return PATHES;
};
export const setPATHES = (k, v) => {
  PATHES[k] = v;
};
export const clearGlobalVariabel = () => {
  pageid = null;
  globalShiftKeyPressed = false;
  viewPickedStatus = false;
  clipboard = null;
  group = null;
  currentEditor = null;
  firstResponder = null;
  lockedView = [];
  PATHES = {};
};
