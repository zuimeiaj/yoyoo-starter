/**
 *  created by yaojun on 2018/12/1
 *
 */
import React, { Fragment } from 'react';
import View from '../lib/Widget/View';
import Event from '../lib/Base/Event';
import { message } from 'antd';
import {
  component_active,
  component_alignment,
  component_drag,
  component_dragend,
  component_properties_change,
  component_resize_end,
  component_swap,
  context_checkall,
  context_copy,
  context_copypaste,
  context_cut,
  context_delete,
  context_hide,
  context_page_update,
  context_paste,
  context_paste_clear,
  context_paste_mouse,
  context_redo,
  context_save,
  context_undo,
  controllers_append,
  controllers_change,
  controllers_delete,
  controllers_delete_by_id,
  controllers_ready,
  coverage_back,
  coverage_backward,
  coverage_backward_to,
  coverage_backward_to_picked,
  coverage_forward,
  coverage_forward_to,
  coverage_forward_to_picked,
  coverage_front,
  coverage_picked_width_mode,
  editor_guides_change,
  outline_coverage_select,
  outline_page_create,
  outline_page_delete,
  outline_page_select,
  pages_load_end,
  project_initialized,
  project_initilized,
  refresh_editor_config,
  refresh_project_name,
  selection_change,
  selection_group,
  selection_start,
  show_create_project,
  workspace_push,
  workspace_redo,
  workspace_save_template,
  workspace_undo,
} from '../lib/util/actions';
import { getCoveragePickeMode, getScreenOffset, getScreeTransform, pointToWorkspaceCoords, setCoveragePikeMode, setLastCoverageIndex } from '../lib/global';
import ViewSelectGroupBordered, { PropsFilter } from '../lib/Widget/ViewSelectGroupBordered';
import { parseJSON, parseOjbect, refreshViewId, toJSON } from '../lib/properties/types';
import { clearGlobalVariabel, getClipboardData, getCurrentPage, getFirstResponder, saveCurrentControllersByPage, setClipboardData, setCurrentPage, setFirstResponder } from '../lib/global/instance';
import AlignmentService from './AlignmentService';
import { setSelfTemplateData } from '../lib/global/template';
import {
  clearPageStorage,
  createNewPage,
  deletePage,
  getPageListFromStorage,
  refresLocalPageObjectId,
  saveToRemoteFromStorage,
  selectPage,
  setPageData,
  updatePageGuides,
  updatePageInfo,
} from '../lib/util/page';
import qs from 'query-string';
import { fetchProjectInfo } from '../api/project';
import { updateUserInfo } from '../api/user';
import config, { initPageSizeWithProjectType } from '../lib/util/preference';
import { setStore } from '../lib/global/store';
import { getQuery, mergeProps } from '../lib/util/helper';
import {
  app_toggle_selection_type,
  component_empty,
  context_mode_change,
  context_outline_delete_master,
  context_show,
  context_unpack,
  controllers_apply_group,
  workspace_part_master,
  workspace_save_master,
  workspace_scroll_center,
} from '@/lib/util/actions';
import { clearCurrentMasterFromStorage, clearPATHES, clearUnlockedView, getMasterDataFromStorage, getPATHES, saveCurrentControllersByMaster, setPATHES } from '@/lib/global/instance';
import { proxyAllPropsChange, proxyDeleteItems, proxyPropsChange, proxyTransformOffset } from '@/lib/util/controllers';
import { createViewFrom, updateTreeIn } from '@/lib/properties/types';
import { isArray, uuid } from '@/lib/util/helper';
import { clearComponentPosition, setComponentPosition } from '@/lib/global/controllers';
import { fetchMaster, getMasterFromStore } from '@/api/master';
import { MasterProperties } from '@/lib/properties/group';
import ViewController from '@/lib/Widget/ViewController';
import { saveMaster } from '@/api/material';
import { getStore } from '@/lib/global/store';

const HistoryRecord = [];
const RedoRecord = [];
window.allWidgets = {};
const MAX_WIGETS = 1200;

class EditorControllers extends React.Component {
  constructor() {
    super();
    this.state = {
      items: [],
    };
  }

  setState = (state, callback, options = {}) => {
    super.setState(state, () => {
      let items = this.state.items;
      window.allWidgets = {};
      clearPATHES();
      clearComponentPosition();
      this.eachiItems(items);
      if (!options.nosave) {
        if (getQuery().m) {
          saveCurrentControllersByMaster(toJSON(items));
        } else {
          saveCurrentControllersByPage(toJSON(items));
        }
      }
      typeof callback === 'function' && callback(items);
      Event.dispatch(controllers_change, items);
    });
  };
  eachiItems = (items, parentPath = '') => {
    items.forEach((item, index) => {
      window.allWidgets[item.id] = item;
      let p = parentPath + index;
      setPATHES(item.id, p);
      setComponentPosition('x', item.transform.x);
      setComponentPosition('x', item.transform.x + item.transform.width);
      setComponentPosition('y', item.transform.y);
      setComponentPosition('y', item.transform.y + item.transform.height);
      if (item.type == 'block') {
        this.eachiItems(item.items, p + ',');
      }
    });
  };
  //TODO Move component to target position
  handleSwapComponent = ({ target, move, asChild }) => {};
  clearHistory = (newItems) => {
    HistoryRecord.length = 0;
    RedoRecord.length = 0;
    this.pushHistory(newItems);
  };
  _initializingProject = () => {};

  componentWillMount() {
    let pages = getPageListFromStorage();
    let info = { type: 'PAD' };
    setStore('project', info);
    setStore('pages', pages);
    initPageSizeWithProjectType(info);
    Event.dispatch(project_initialized, {});
    Event.dispatch(refresh_project_name, 'YOYOO DESIGN');
    //Add event listener
    Event.listen(selection_change, this.handleSelection);
    Event.listen(selection_start, this.handleSelectionStart);
    Event.listen(controllers_append, this.handleAppendChild);
    Event.listen(controllers_delete, this.handleDeleteChild);
    Event.listen(context_copy, this.handleCopy);
    Event.listen(context_paste, this.handlePaste);
    Event.listen(context_paste_mouse, this.handlePasteToMouse);
    Event.listen(context_paste_clear, this.handleClearClipboard);
    Event.listen(context_copypaste, this.handleDuplicate);
    Event.listen(context_cut, this.handleClip);
    Event.listen(context_delete, this.handleDelete);
    Event.listen(context_hide, this.handleHide);
    Event.listen(context_show, this.handleShow);
    Event.listen(context_checkall, this.handleCheckAll);
    Event.listen(component_properties_change, this.handlePropsChange);
    Event.listen(component_active, this.handleComponentActive);
    Event.listen(component_resize_end, this.handleComponentResizend);
    Event.listen(component_dragend, this.handleComponentDragend);
    Event.listen(context_undo, this.handleUndo);
    Event.listen(context_redo, this.handleRedo);
    Event.listen(outline_page_select, this.handlePageSelect);
    Event.listen(outline_page_create, this.handlePageCreate);
    Event.listen(outline_page_delete, this.handlePageDelete);
    Event.listen(outline_coverage_select, this.handleCoverageSelect);
    Event.listen(controllers_delete_by_id, this.handleDeleteById);
    Event.listen(component_swap, this.handleSwapComponent);
    Event.listen(component_alignment, this.handleAlignmentChange);
    Event.listen(coverage_back, this.coverageBack);
    Event.listen(coverage_backward, this.coverageBackward);
    Event.listen(coverage_front, this.coverageFront);
    Event.listen(coverage_forward, this.coverageForward);
    Event.listen(coverage_backward_to, this.coverageBackwardTo);
    Event.listen(coverage_forward_to, this.coverageForwardTo);
    Event.listen(coverage_picked_width_mode, this.coveragePickedWithMode);
    Event.listen(workspace_save_template, this.handleSaveTemplate);
    Event.listen(context_page_update, this.handlePageInfoUpdate);
    Event.listen(refresh_editor_config, this.handleEditorConfig);
    Event.listen(editor_guides_change, this.handleGuidesChange);
    Event.listen(context_save, this.handleSaveWorkspace);
    Event.listen(app_toggle_selection_type, this.handleSelectionTypeChange);
    Event.listen(controllers_apply_group, this.handleApplyGroup);
    Event.listen(component_empty, this.handleEmpty);
    Event.listen(context_unpack, this.handleApplyUngroup);
    Event.listen(workspace_save_master, this.handleSaveMaster);
    Event.listen(workspace_part_master, this.handlePartMaster);
    Event.listen(context_mode_change, this.handleEditorModeChange);
    Event.listen(context_outline_delete_master, this.handleDeleMaster);
    setTimeout(() => {
      Event.dispatch(pages_load_end, pages);
    });
  }

  handleEmpty = () => {
    clearUnlockedView();
  };
  _currentPage = null;
  handleEditorModeChange = (type, masterId) => {
    HistoryRecord.length = 0;
    RedoRecord.length = 0;
    if (type == 'PROJECT') {
      setTimeout(() => {
        let pages = getStore('pages');
        Event.dispatch(pages_load_end, pages);
        this.handlePageSelect(this._currentPage);
      });
    } else {
      // MASTER
      setFirstResponder(null);
      this._currentPage = getCurrentPage();
      setCurrentPage(null);
      let data = getMasterFromStore(getQuery().m);
      data = parseJSON(data.content.data.items);
      this.setState({ items: data });
      setTimeout(() => {
        if (data.length > 0) {
          Event.dispatch(
            selection_group,
            data.map((item) => item.view)
          );
        } else {
          setFirstResponder(data[0].view);
        }
        setTimeout(() => {
          Event.dispatch(workspace_scroll_center);
        }, 1000);
      });
    }
  };
  /**
   *
   * @param {Array} masterItems - Master 组件的子元素信息
   * @param {Object} t - Master 组件的位置信息
   * @return {*}
   * @private
   */
  _calcBlockTransform = (masterItems, t) => {
    let rad = ((180 - t.rotation) / 180) * Math.PI;
    const calc = (masterItems) => {
      return masterItems.map((item) => {
        item = createViewFrom(item);
        item.id = uuid('sb_');
        let x1 = item.transform.x + t.x;
        let y1 = item.transform.y + t.y;
        let cx = t.x + t.width / 2 - (x1 + item.transform.width / 2),
          cy = t.y + t.height / 2 - (y1 + item.transform.height / 2);
        let a = Math.atan2(-cy, cx);
        let c = Math.hypot(cx, cy);
        let x = Math.round(Math.cos(rad + a) * c + t.x + t.width / 2),
          y = Math.round(-Math.sin(rad + a) * c + t.y + t.height / 2);
        item.transform.x = x - item.transform.width / 2;
        item.transform.y = y - item.transform.height / 2;
        item.transform.rotation += t.rotation;
        if (item.type == 'block') {
          item.items = calc(item.items);
        }
        return item;
      });
    };
    return calc(masterItems);
  };
  handlePartMaster = () => {
    let responder = getFirstResponder();
    let pElement = responder._parent;
    let parent = pElement ? pElement.properties.id : null;
    let data = getMasterFromStore(responder.properties.masterId);
    let items = this._calcBlockTransform(data.content.data.items, responder.properties.transform);
    let stateItems = this._deleteItems(this.state.items, responder.properties.id, false);
    stateItems = this._appendItems(stateItems, items, parent);
    this.setState({ items: stateItems }, this.pushHistory);
    setTimeout(() => {
      if (pElement) {
        pElement.updateBlockTransform();
      } else {
        items.forEach((item) => {
          if (item.type == 'block') {
            item.view.updateBlockTransform();
          }
        });
      }
      setFirstResponder(null);
    });
  };
  handleSaveMaster = () => {
    let transform = Object.assign({}, getFirstResponder().properties.transform);
    let { ids, parent } = this._getTargetIdsAndParent(getFirstResponder());
    setSelfTemplateData('MASTER').then((res) => {
      let master = new MasterProperties();
      master.id = uuid('sb_');
      master.transform = transform;
      master.masterId = res.data._id;
      let stateItems = this._deleteItems(this.state.items, ids, false);
      stateItems = this._appendItems(stateItems, master, parent ? parent.properties.id : null);
      this.setState({ items: stateItems }, this.pushHistory);
      setTimeout(() => {
        setFirstResponder(master.view);
      });
    });
  };
  handleApplyUngroup = (block) => {
    let target = getFirstResponder();
    setFirstResponder(null);
    let delId = target.properties.id;
    let parent = target._parent ? target._parent : null;
    let pid = parent ? parent.properties.id : null;
    let items = target.properties.items.map((item) => parseOjbect(item.toString()));
    let stateItems = this._deleteItems(this.state.items, delId, false);
    stateItems = this._appendItems(stateItems, items, pid);
    this.setState({ items: stateItems }, this.pushHistory);
    setTimeout(() => {
      if (parent) parent.updateChildrenPosition();
      else
        Event.dispatch(
          selection_group,
          items.map((item) => item.view)
        );
    });
  };
  handleApplyGroup = (block) => {
    setFirstResponder(null);
    let items = block.items;
    let map = {};
    items.forEach((item) => {
      map[item.id] = true;
    });
    let stateItems = this.state.items.filter((item) => !map[item.id]);
    stateItems.push(block);
    this.setState({ items: stateItems }, this.pushHistory);
    setTimeout(() => {
      setFirstResponder(block.view);
    });
  };
  handleClearClipboard = () => {
    setClipboardData(null);
  };
  _applyBlockOffset = (view, x, y) => {
    proxyTransformOffset(view, x, y);
  };
  handlePasteToMouse = (target, event) => {
    let data = getClipboardData();
    if (!data) return;
    let views = parseJSON(data, true);
    let { x, y } = pointToWorkspaceCoords(event);
    let diffx = x - views[0].transform.x;
    let diffy = y - views[0].transform.y;
    views = views.map((item) => {
      this._applyBlockOffset(item, diffx, diffy);
      return item;
    });
    this.handleAppendChild(views);
    setTimeout(() => {
      if (data.length > 1) {
        Event.dispatch(
          selection_group,
          views.map((item) => item.view)
        );
      } else {
        setFirstResponder(views[0].view);
      }
    });
  };

  componentDidMount() {
    Event.dispatch(controllers_ready, this);
  }

  // Guide -  delete | create | move
  handleGuidesChange = ({ key, value }) => {
    updatePageGuides(getCurrentPage(), key, value);
  };
  // 编辑器偏好设置变化
  handleEditorConfig = ({ key, value }) => {
    updateUserInfo({ [key]: value }).then(() => message.success('操作成功'));
  };
  // BG WIDTH GUIDES
  handlePageInfoUpdate = ({ id, key, value }) => {
    updatePageInfo(id, key, value);
  };
  /**
   *  Ctrl S (保存当前操作到服务器，需要验证是否登录了)
   */
  handleSaveWorkspace = async () => {};
  handleSaveTemplate = () => {
    setSelfTemplateData();
  };
  coverageBackwardTo = () => {
    setCoveragePikeMode(-1);
  };
  /**
   * Start coverage pick mode
   * @param target
   */
  coveragePickedWithMode = (target) => {
    let mode = getCoveragePickeMode();
    setCoveragePikeMode(0); // reset
    if (getFirstResponder() === target) return;
    this._coverageHanlder(null, target.properties.zIndex + mode);
  };
  /**
   *  To some component
   */
  coverageForwardTo = () => {
    setCoveragePikeMode(1);
  };
  _coverageHanlder = (level, zIndex) => {
    let view = getFirstResponder();
    let stateItems = proxyAllPropsChange(this.state.items, view, 'zIndex', (item) => (typeof zIndex === 'undefined' ? item.zIndex + level : zIndex));
    this.setState({ items: stateItems }, this.pushHistory);
  };
  /**
   * send to backward
   */
  coverageBackward = () => {
    this._coverageHanlder(-1);
  };
  /**
   * Bring to front
   */
  coverageFront = () => {
    let max =
      Math.max.apply(
        null,
        this.state.items.map((item) => item.zIndex)
      ) + 1;
    setLastCoverageIndex(max + 1);
    this._coverageHanlder(null, max);
  };
  /**
   * Send to back
   */
  coverageBack = () => {
    let min =
      Math.min.apply(
        null,
        this.state.items.map((item) => item.zIndex)
      ) - 1;
    setLastCoverageIndex(min);
    this._coverageHanlder(null, min);
  };
  /**
   * Forward
   */
  coverageForward = () => {
    this._coverageHanlder(1);
  };
  /**
   * Use id to remove components
   * @param id
   */
  handleDeleteById = (id) => {
    this.handleDeleteChild(id);
    setFirstResponder(null);
  };
  /**
   * Use id to find component properties
   * @param id
   * @param stateItems
   * @return {*}
   * @private
   */
  _findPropertiesById = (id, stateItems) => {
    stateItems = stateItems || this.state.items;
    const find = (items) => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          return items[i];
        }
        if (items[i].items && items[i].items.length > 0) {
          let v = find(items[i].items);
          if (v) return v;
        }
      }
    };
    return find(stateItems);
  };
  /**
   * Use id to find component
   * @param id
   * @param stateItems
   * @return {null}
   * @private
   */
  _findViewById = (id, stateItems) => {
    let props = this._findPropertiesById(id, stateItems);
    return props ? props.view : null;
  };
  /**
   * Select coverage
   * @param id
   */
  handleCoverageSelect = (id) => {
    let prop = window.allWidgets[id];
    if (prop) setFirstResponder(prop.view);
    // TODO Select group
  };
  /**
   * Select page
   * @param pageid
   */
  handlePageSelect = (pageid) => {
    selectPage(pageid).then(async (items) => {
      // 页面变化后，由于组件id未改变，导致component数据被共享了。
      // 需要 彻底卸载之前的数据
      await super.setState({ items: [] });
      this.setState({ items: items }, this.pushHistory, { nosave: true });
      if (items.length > 0) {
        let max =
          Math.max.apply(
            null,
            items.map((item) => item.zIndex)
          ) + 1;
        setLastCoverageIndex(max + 1);
      } else {
        setLastCoverageIndex(1000);
      }
      setFirstResponder(null);
    });
  };
  handlePageCreate = (pid) => {
    let q = qs.parse(location.search);
    if (q.p) {
      createNewPage(pid);
    } else {
      Event.dispatch(show_create_project, { pages: [], from: 'App' });
    }
  };
  /**
   * Delete page
   */
  handlePageDelete = (id) => {
    deletePage(id).then(() => {
      setFirstResponder(null);
      this.setState({ items: [] });
      setCurrentPage(null);
    });
  };
  /**
   * Select all
   */
  handleCheckAll = () => {
    let items = this.state.items;
    if (items.length == 1) {
      setFirstResponder(items[0].view);
    } else if (items.length > 1) {
      Event.dispatch(
        selection_group,
        items.map((item) => item.view)
      );
    }
  };
  _getTargetIdsAndParent = (target) => {
    target = target instanceof ViewController ? target.properties : target;
    let ids = [],
      parent = null;
    if (target.isTemporaryGroup) {
      ids = target.view.getItems().map((item) => item.id);
      parent = target.view.group[0]._parent;
    } else {
      ids = target.id;
      parent = target.view._parent;
    }
    return { ids, parent };
  };
  // Delete
  handleDelete = (target) => {
    let { ids, parent } = this._getTargetIdsAndParent(target);
    this.handleDeleteChild(ids);
    setFirstResponder(null);
    setTimeout(() => {
      if (parent) parent.updateBlockTransform();
    });
  };
  /**
   *  Copy component , 添加对block 的支持
   * @param target
   */
  handleCopy = (target) => {
    if (target.isTemporaryGroup) {
      let viewItems = target.view.getItems();
      let data = viewItems.map((item) => toJSON(item));
      setClipboardData(data);
    } else {
      let data = toJSON(target);
      setClipboardData(data);
    }
  };
  // Paste 添加对block 的支持
  handlePaste = () => {
    let data = getClipboardData();
    if (!data) return;
    let views = parseJSON(data, true);
    views = views.map((item) => {
      this._applyBlockOffset(item, 0, views[0].transform.height);
      return item;
    });
    this.handleAppendChild(views);
    setTimeout(() => {
      if (data.length > 1) {
        Event.dispatch(
          selection_group,
          views.map((item) => item.view)
        );
      } else {
        setFirstResponder(views[0].view);
      }
    });
  };
  /**
   *
   * @param data {ViewProperties}
   * @return {ViewProperties} 具有新id的view
   *
   * @private
   */
  _clone = (data) => {
    if (!data) return;
    let copy = parseOjbect(data.toString());
    refreshViewId(copy);
    this._applyBlockOffset(copy, 10, 10);
    if (!copy.alias.endsWith('(副本)')) {
      copy.alias += '(副本)';
    }
    return copy;
  };
  /**
   * Add to clipboard (memory version)
   * @param target
   */
  handleClip = (target) => {
    if (target.isTemporaryGroup) {
      let data = target.view.getItems().map((item) => toJSON(item));
      setClipboardData(data);
      this.handleDeleteChild(target.view.getItems().map((item) => item.id));
    } else {
      setClipboardData(toJSON(target));
      this.handleDeleteChild(target.id);
    }
    setFirstResponder(null);
  };
  // Duplicate,支持在block中使用
  handleDuplicate = (target) => {
    let views = [];
    let block = null;
    if (target.isTemporaryGroup) {
      views = target.view.getItems().map((item) => this._clone(item));
      if (target.view.group[0]._parent) {
        block = target.view.group[0]._parent.properties.id;
      }
    } else {
      views = this._clone(target);
      if (target.view._parent) {
        block = target.view._parent.properties.id;
      }
    }
    this.handleAppendChild(views, block);
    setTimeout(() => {
      if (target.isTemporaryGroup) {
        Event.dispatch(
          selection_group,
          views.map((item) => item.view)
        );
      } else {
        setFirstResponder(views.view);
      }
      let child = null;
      if (isArray(views)) {
        child = views[0];
      } else {
        child = views;
      }
      if (child.view._parent) {
        console.log('block updated');
        child.view._parent.updateBlockTransform();
      }
    });
  };
  /**
   *  Hide  | Show
   * @param target
   */
  handleHide = (target) => {
    this._applyComponentHideStatus(target, true);
  };
  _applyComponentHideStatus = (target, status) => {
    let stateItems = this.state.items;
    stateItems = proxyAllPropsChange(stateItems, target.view, 'settings', (item) => {
      let settings = item.settings;
      settings.isHide = status;
      return settings;
    });
    if (status) {
      setFirstResponder(null);
    }
    this.setState({ items: stateItems }, this.pushHistory);
  };
  handleShow = (target) => {
    this._applyComponentHideStatus(target, false);
  };
  /**
   * 批量删除、单个删除
   * @param stateItems {Array<ViewProperties>}
   * @param ids {Array}
   * @return {Array<ViewProperties>}  返回一个新的状态
   * @private
   *
   */
  _deleteItems = (stateItems, ids, clearLeafBlock) => {
    return proxyDeleteItems(stateItems, Array.isArray(ids) ? ids : [ids], clearLeafBlock);
  };
  /**
   * 添加、批量添加
   *
   * @param stateItems {Array<ViewProperties>}
   * @param target {ViewProperties | Array}
   * @return {Array} 返回新的state
   *
   * @private
   */
  _appendItems = (stateItems, target, block) => {
    let items = [];
    target = Array.isArray(target) ? target : [target];
    if (block && getPATHES()[block]) {
      items = updateTreeIn(stateItems, getPATHES()[block].split(','), (block) => {
        block = createViewFrom(block);
        block.items = block.items.concat(target);
        return block;
      });
    } else {
      items = stateItems.concat(target);
    }
    return items;
  };
  handleDeleteChild = (ids) => {
    let items = this._deleteItems(this.state.items, ids);
    this.setState({ items }, this.pushHistory);
  };
  handleAppendChild = (target, block) => {
    let items = this._appendItems(this.state.items, target, block);
    this.setState({ items }, this.pushHistory);
  };
  _handleSelectionWithType = (t, screen, offset, rect) => {
    let x = t.x - screen.x + offset.x;
    let y = t.y - screen.y + offset.y;
    if (config.selection == 'cross') {
      return x + t.width > rect.x && rect.x + rect.width > x && y + t.height > rect.y && rect.y + rect.height > y;
    }
    return x > rect.x && x + t.width < rect.x + rect.width && y > rect.y && y + t.height < rect.height + rect.y;
  };
  /**
   * Ctrl Shift O
   */
  handleSelectionTypeChange = () => {
    const map = {};
    config.selection = config.selection == 'cross' ? 'inner' : 'cross';
    message.success(`已切换至${config.selection == 'cross' ? '相交' : '包含'}选择模式`);
  };
  /**
   * 框选.暂时没有缓存位置信息
   * @param rect
   */
  handleSelection = (rect) => {
    let screen = getScreeTransform();
    let offset = getScreenOffset();
    let group = this.state.items
      .filter((item) => {
        // 不能选中已锁定的和隐藏的
        if (item.settings.isHide) return false;
        return this._handleSelectionWithType(item.view.getOffsetTransform(), screen, offset, rect);
      })
      .map((item) => item.view);
    if (group.length > 1) Event.dispatch(selection_group, group);
    else if (group.length === 0) {
      setFirstResponder(null);
    } else {
      setFirstResponder(group[0]);
    }
  };
  handleSelectionStart = () => {
    setFirstResponder(null);
  };

  componentWillUnmount() {
    //clear global variable
    setPageData([]);
    clearGlobalVariabel();
    HistoryRecord.splice(0);
    RedoRecord.splice(0);
    window.allWidgets = {};
    Event.destroy(selection_change, this.handleSelection);
    Event.destroy(selection_start, this.handleSelectionStart);
    Event.destroy(controllers_append, this.handleAppendChild);
    Event.destroy(controllers_delete, this.handleDeleteChild);
    Event.destroy(context_copy, this.handleCopy);
    Event.destroy(context_paste, this.handlePaste);
    Event.destroy(context_paste_clear, this.handleClearClipboard);
    Event.destroy(context_paste_mouse, this.handlePasteToMouse);
    Event.destroy(context_copypaste, this.handleDuplicate);
    Event.destroy(context_cut, this.handleClip);
    Event.destroy(context_delete, this.handleDelete);
    Event.destroy(context_hide, this.handleHide);
    Event.destroy(context_show, this.handleShow);
    Event.destroy(context_checkall, this.handleCheckAll);
    Event.destroy(component_properties_change, this.handlePropsChange);
    Event.destroy(component_active, this.handleComponentActive);
    Event.destroy(component_resize_end, this.handleComponentDragend);
    Event.destroy(component_dragend, this.handleComponentDragend);
    Event.destroy(context_undo, this.handleUndo);
    Event.destroy(context_redo, this.handleRedo);
    Event.destroy(outline_page_select, this.handlePageSelect);
    Event.destroy(outline_page_create, this.handlePageCreate);
    Event.destroy(outline_coverage_select, this.handleCoverageSelect);
    Event.destroy(controllers_delete_by_id, this.handleDeleteById);
    Event.destroy(outline_page_delete, this.handlePageDelete);
    Event.destroy(component_swap, this.handleSwapComponent);
    Event.destroy(component_alignment, this.handleAlignmentChange);
    Event.destroy(coverage_back, this.coverageBack);
    Event.destroy(coverage_backward, this.coverageBackward);
    Event.destroy(coverage_front, this.coverageFront);
    Event.destroy(coverage_forward, this.coverageForward);
    Event.destroy(coverage_backward_to, this.coverageBackwardTo);
    Event.destroy(coverage_forward_to, this.coverageForwardTo);
    Event.destroy(coverage_picked_width_mode, this.coveragePickedWithMode);
    Event.destroy(workspace_save_template, this.handleSaveTemplate);
    Event.destroy(context_save, this.handleSaveWorkspace);
    Event.destroy(context_page_update, this.handlePageInfoUpdate);
    Event.destroy(refresh_editor_config, this.handleEditorConfig);
    Event.destroy(editor_guides_change, this.handleGuidesChange);
    Event.destroy(controllers_apply_group, this.handleApplyGroup);
    Event.destroy(component_empty, this.handleEmpty);
    Event.destroy(context_unpack, this.handleApplyUngroup);
    Event.destroy(workspace_save_master, this.handleSaveMaster);
    Event.destroy(workspace_part_master, this.handlePartMaster);
    Event.destroy(context_mode_change, this.handleEditorModeChange);
    Event.destroy(context_outline_delete_master, this.handleDeleMaster);
  }

  handleDeleMaster = (id) => {
    if (getQuery().m == id) {
      Event.dispatch(context_mode_change, 'PROJECT');
    }
  };
  handleComponentActive = (target) => {
    let items = this.state.items;
    items = proxyAllPropsChange(items, target);
    this.setState({ items });
  };
  handleComponentDragend = () => {
    let target = getFirstResponder();
    this.pushHistory(this.state.items);
    this.handleComponentActive(target);
  };
  handleComponentResizend = () => {
    this.handleComponentDragend();
    this.handleComponentActive(getFirstResponder());
  };
  /**
   * 根据block的新
   * @param block
   * @param blockTransform
   * @private
   *
   */
  _handleBlockTransformChange = (block, blockTransform) => {
    return block.items.map((item) => {
      let x = blockTransform.x + item._xPercent * blockTransform.width;
      let y = blockTransform.y + item._yPercent * blockTransform.height;
      let width = blockTransform.width * item._wPercent;
      let height = blockTransform.height * item._hPercent;
      let sub = createViewFrom(item);
      sub.transform = { x, y, width, height, rotation: sub.transform.rotation };
      if (sub.type == 'block') {
        sub.items = this._handleBlockTransformChange(sub, sub.transform);
      }
      return sub;
    });
  };
  /**
   * Save history
   * @param object
   * @param {ViewController} object.target
   * @param {String|Array} object.key
   * @param {Object|Array} object.value 如果是group，则返回{id:Object}
   */
  handlePropsChange = ({ target, key, value, from }) => {
    let items = [];

    function handleItem(item) {
      let id = item.id;
      // 批处理时，先检测当前属性是否使用于目标元素
      if (target.properties.isTemporaryGroup) {
        if (Array.isArray(key)) {
          key.forEach((k, index) => {
            item[k] = value[id][index];
          });
        } else {
          if (PropsFilter[key](item)) {
            item[key] = mergeProps(item[key], value[id]);
          } else {
            console.info(key, 'not in ', item.type);
          }
        }
      } else {
        if (Array.isArray(key)) {
          key.forEach((k, index) => {
            item[k] = value[index];
          });
        } else {
          item[key] = mergeProps(item[key], value);
        }
        return item;
      }
      return item;
    }

    if (!(key == 'transform' || key == 'alias')) {
      items = proxyAllPropsChange(this.state.items, target, handleItem);
    } else {
      // 对transform 特殊处理,block组件需要对子元素进行一次刷新
      items = proxyPropsChange(this.state.items, target, (item) => {
        item = handleItem(item);
        if (item.type == 'block' && key == 'transform') {
          item.items = this._handleBlockTransformChange(item, item.transform);
        }
        return item;
      });
    }
    const pushState = (target, key, items, from) => {
      // refresh tree
      this.setState({ items }, (items) => {
        this.pushHistory(items);
        if (key === 'transform') {
          if (target.properties.isTemporaryGroup) {
            target.updateResizer();
          } else if (target._parent) {
            target._parent.updateBlockTransform();
          } else if (target.properties.type == 'block') {
            target.updateBlockTransform();
          }
          Event.dispatch(component_drag, target, { from, hideGuides: true });
        }
      });
    };
    pushState(target, key, items, from);
  };
  /**
   * 暂时先限制长度为100
   * @param {Array<ViewProperties>} items
   */
  pushHistory = (items) => {
    HistoryRecord.push(items);
    RedoRecord.length = 0;
    Event.dispatch(workspace_push, HistoryRecord.length);
  };
  /**
   * Ctrl Z
   */
  handleUndo = () => {
    if (HistoryRecord.length > 1) {
      let items = HistoryRecord.pop();
      RedoRecord.push(items);
      let current = HistoryRecord[HistoryRecord.length - 1];
      this.setState({ items: current });
      setFirstResponder(null);
    }
    Event.dispatch(workspace_undo, HistoryRecord.length, RedoRecord.length);
  };
  /**
   * Ctrl shift Z
   */
  handleRedo = () => {
    if (RedoRecord.length > 0) {
      let items = RedoRecord.pop();
      HistoryRecord.push(items);
      this.setState({ items });
      setFirstResponder(null);
    }
    Event.dispatch(workspace_redo, HistoryRecord.length, RedoRecord.length);
  };
  /**
   *
   */
  handleAlignmentChange = (type) => {
    let items = AlignmentService.alignment(this.state.items, type);
    this.setState({ items }, () => {
      Event.dispatch(component_drag, getFirstResponder(), {
        hideGuides: true,
      });
    });
    this.pushHistory(items);
  };

  render() {
    return (
      <Fragment>
        <ViewSelectGroupBordered />
        {this.state.items.map((item) => {
          return <View type={item.type} key={item.id} properties={item} />;
        })}
      </Fragment>
    );
  }
}

export default EditorControllers;
