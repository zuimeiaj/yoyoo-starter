import {
  canvas_draggable,
  component_alignment,
  component_properties_change,
  context_checkall,
  context_copy,
  context_copypaste,
  context_cut,
  context_delete,
  context_paste,
  context_redo,
  context_save,
  context_undo,
  context_zoom_in,
  context_zoom_out,
  coverage_back,
  coverage_backward,
  coverage_forward,
  coverage_front,
  guide_toggle,
  workspace_scroll_center,
} from '../util/actions'
import Event from '../Base/Event'
import { getFirstResponder } from '../global/instance'
import KeyEvent, { getKeyCodeFormat, KeyCode } from './KeyEvent'
import { app_toggle_selection_type, context_pack, context_unpack } from '@/lib/util/actions'

const transformArrowKeys = {
  move_top: 'y',
  move_right: 'x',
  move_left: 'x',
  move_bottom: 'y',
}
const transformArrowFlag = {
  move_top: -1,
  move_left: -1,
  move_right: 1,
  move_bottom: 1,
}
export const CombomKeyNumber = {
  [KeyEvent.DOM_VK_SHIFT]: 1,
  [KeyEvent.DOM_VK_CONTROL]: 4,
  [KeyEvent.DOM_VK_ALT]: 2,
  [KeyEvent.DOM_VK_COMMAND]: 4,
}
export const CombomKeys = {
  4: 'Ctrl',
  2: 'Alt',
  1: 'Shift',
}
const CTRL_KEY = 'Ctrl'
const ALT_KEY = 'Alt'
const SHIFT_KEY = 'Shift'
const NONE_FUNCTION = 0
export const CombomKeysArray = Object.keys(CombomKeys)
  .sort((a, b) => b - a)
  .map((item) => +item)
// 可配置的组合快捷键
const ActionKeyMaps = {
  block: [4, KeyEvent.DOM_VK_G],
  unblock: [4 | 1, KeyEvent.DOM_VK_G],
  selection: [4 | 1, KeyEvent.DOM_VK_O],
  showline: [4 | 1, KeyEvent.DOM_VK_L],
  zoomin: [4, KeyEvent.DOM_VK_PLUS],
  zoomout: [4, KeyEvent.DOM_VK_MINUS],
  viewcenter: [4 | 1, KeyEvent.DOM_VK_F],
  hide: [4, KeyEvent.DOM_VK_H],
  lock: [4, KeyEvent.DOM_VK_L],
  canvas_draggable: [0, KeyEvent.DOM_VK_SPACE],
  delete: [0, KeyEvent.DOM_VK_BACK_SPACE],
  redo: [4 | 1, KeyEvent.DOM_VK_Z],
  undo: [4, KeyEvent.DOM_VK_Z],
  copy: [4, KeyEvent.DOM_VK_C],
  duplicate: [4, KeyEvent.DOM_VK_D],
  paste: [4, KeyEvent.DOM_VK_V],
  clip: [4, KeyEvent.DOM_VK_X],
  save: [4, KeyEvent.DOM_VK_S],
  select_all: [4, KeyEvent.DOM_VK_A],
  move: {
    left: [0, KeyEvent.DOM_VK_LEFT],
    right: [0, KeyEvent.DOM_VK_RIGHT],
    top: [0, KeyEvent.DOM_VK_UP],
    bottom: [0, KeyEvent.DOM_VK_DOWN],
  },
  alignment: {
    top: [0, KeyEvent.DOM_VK_T],
    bottom: [0, KeyEvent.DOM_VK_B],
    middle: [0, KeyEvent.DOM_VK_M],
    left: [0, KeyEvent.DOM_VK_L],
    right: [0, KeyEvent.DOM_VK_R],
    center: [0, KeyEvent.DOM_VK_C],
  },
  coverage: {
    forward: [1, KeyEvent.DOM_VK_UP],
    front: [1 | 2 | 4, KeyEvent.DOM_VK_UP],
    backward: [1, KeyEvent.DOM_VK_DOWN],
    back: [1 | 2 | 4, KeyEvent.DOM_VK_DOWN],
  },
}
/**
 * @description 定义所有的快捷键事件，
 *
 */
export const KeyboardActionNameMap = {
  UNBLOCK: 'unblock',
  BLOCK: 'block',
  SELECTION: 'selection',
  LOCK: 'lock',
  SHOW_LINE: 'showline',
  ZOOM_IN: 'zoomin',
  ZOOM_OUT: 'zoomout',
  VIEW_CENTER: 'viewcenter',
  HIDE: 'hide',
  DEL: 'delete',
  REDO: 'redo',
  UNDO: 'undo',
  COPY: 'copy',
  DUPLICATE: 'duplicate',
  PASTE: 'paste',
  CLIP: 'clip',
  SAVE: 'save',
  SELECT_ALL: 'select_all',
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
  MOVE_TOP: 'move_top',
  MOVE_BOTTOM: 'move_bottom',
  ALIGNMENT_TOP: 'alignment_top',
  ALIGNMENT_BOTTOM: 'alignment_bottom',
  ALIGNMENT_MIDDLE: 'alignment_middle',
  ALIGNMENT_LEFT: 'alignment_left',
  ALIGNMENT_RIGHT: 'alignment_right',
  ALIGNMENT_CENTER: 'alignment_center',
  COVERAGE_FORWARD: 'coverage_forward',
  COVERAGE_BACKWARD: 'coverage_backward',
  COVERAGE_FRONT: 'coverage_front',
  COVERAGE_BACK: 'coverage_back',
  CANVAS_DRAGGABLE: 'canvas_draggable',
}
/**
 * @description  快捷键对应操作的别名
 * @type {{[p : string] : string}}
 */
export const ActionNames = {
  [KeyboardActionNameMap.UNBLOCK]: '解散',
  [KeyboardActionNameMap.BLOCK]: '组合',
  [KeyboardActionNameMap.SELECTION]: '选中方式(相交/包含)',
  [KeyboardActionNameMap.SHOW_LINE]: '显示/隐藏辅助线',
  [KeyboardActionNameMap.ZOOM_IN]: '放大',
  [KeyboardActionNameMap.ZOOM_OUT]: '缩小',
  [KeyboardActionNameMap.VIEW_CENTER]: '视图居中',
  [KeyboardActionNameMap.HIDE]: '隐藏/显示',
  [KeyboardActionNameMap.DEL]: '删除组件',
  [KeyboardActionNameMap.REDO]: '重做',
  [KeyboardActionNameMap.UNDO]: '撤销',
  [KeyboardActionNameMap.COPY]: '复制',
  [KeyboardActionNameMap.DUPLICATE]: '创建副本',
  [KeyboardActionNameMap.PASTE]: '粘贴',
  [KeyboardActionNameMap.CLIP]: '剪切',
  [KeyboardActionNameMap.SAVE]: '保存',
  [KeyboardActionNameMap.SELECT_ALL]: '全选',
  [KeyboardActionNameMap.MOVE_LEFT]: '组件向左移动',
  [KeyboardActionNameMap.MOVE_RIGHT]: '组件向右移动',
  [KeyboardActionNameMap.MOVE_TOP]: '组件向上移动',
  [KeyboardActionNameMap.MOVE_BOTTOM]: '组件向下移动',
  [KeyboardActionNameMap.LOCK]: '锁定/解锁',
  [KeyboardActionNameMap.ALIGNMENT_TOP]: '顶对齐',
  [KeyboardActionNameMap.ALIGNMENT_MIDDLE]: '垂直居中',
  [KeyboardActionNameMap.ALIGNMENT_BOTTOM]: '底对齐',
  [KeyboardActionNameMap.ALIGNMENT_LEFT]: '左对齐',
  [KeyboardActionNameMap.ALIGNMENT_CENTER]: '水平居中',
  [KeyboardActionNameMap.ALIGNMENT_RIGHT]: '右对齐',
  [KeyboardActionNameMap.COVERAGE_FRONT]: '置为顶层',
  [KeyboardActionNameMap.COVERAGE_FORWARD]: '上移一层',
  [KeyboardActionNameMap.COVERAGE_BACK]: '置为底层',
  [KeyboardActionNameMap.COVERAGE_BACKWARD]: '下移一层',
  [KeyboardActionNameMap.CANVAS_DRAGGABLE]: '拖拽画布',
}
/**
 * @description 配置该事件后，将会直接Dispatch该 键盘事件所对应的 Event 事件
 * @type {{[p : string] : *}}
 */
export const KeyboradEvents = {
  [KeyboardActionNameMap.UNBLOCK]: context_unpack,
  [KeyboardActionNameMap.BLOCK]: context_pack,
  [KeyboardActionNameMap.SELECTION]: app_toggle_selection_type,
  [KeyboardActionNameMap.SHOW_LINE]: guide_toggle,
  [KeyboardActionNameMap.ZOOM_IN]: context_zoom_in,
  [KeyboardActionNameMap.ZOOM_OUT]: context_zoom_out,
  [KeyboardActionNameMap.VIEW_CENTER]: workspace_scroll_center,
  [KeyboardActionNameMap.DEL]: context_delete,
  [KeyboardActionNameMap.REDO]: context_redo,
  [KeyboardActionNameMap.UNDO]: context_undo,
  [KeyboardActionNameMap.COPY]: context_copy,
  [KeyboardActionNameMap.DUPLICATE]: context_copypaste,
  [KeyboardActionNameMap.PASTE]: context_paste,
  [KeyboardActionNameMap.CLIP]: context_cut,
  [KeyboardActionNameMap.SAVE]: context_save,
  [KeyboardActionNameMap.SELECT_ALL]: context_checkall,
  [KeyboardActionNameMap.COVERAGE_BACK]: coverage_back,
  [KeyboardActionNameMap.COVERAGE_BACKWARD]: coverage_backward,
  [KeyboardActionNameMap.COVERAGE_FORWARD]: coverage_forward,
  [KeyboardActionNameMap.COVERAGE_FRONT]: coverage_front,
  [KeyboardActionNameMap.CANVAS_DRAGGABLE]: canvas_draggable,
}
/**
 * @description  该事件需要一个选中的组件，
 * @type {{[p : string] : number}}
 */
export const NeedSelectedViewActions = {
  [KeyboardActionNameMap.UNBLOCK]: 1,
  [KeyboardActionNameMap.BLOCK]: 1,
  [KeyboardActionNameMap.DEL]: 1,
  [KeyboardActionNameMap.COPY]: 1,
  [KeyboardActionNameMap.DUPLICATE]: 1,
  [KeyboardActionNameMap.CLIP]: 1,
  [KeyboardActionNameMap.MOVE_LEFT]: 1,
  [KeyboardActionNameMap.MOVE_RIGHT]: 1,
  [KeyboardActionNameMap.MOVE_TOP]: 1,
  [KeyboardActionNameMap.MOVE_BOTTOM]: 1,
  [KeyboardActionNameMap.ALIGNMENT_RIGHT]: 1,
  [KeyboardActionNameMap.ALIGNMENT_LEFT]: 1,
  [KeyboardActionNameMap.ALIGNMENT_CENTER]: 1,
  [KeyboardActionNameMap.ALIGNMENT_TOP]: 1,
  [KeyboardActionNameMap.ALIGNMENT_BOTTOM]: 1,
  [KeyboardActionNameMap.ALIGNMENT_MIDDLE]: 1,
  [KeyboardActionNameMap.HIDE]: 1,
}
/**
 *
 *  {keyboard_event : [combo,keyCode ] } ->  {combo,keyCode : keyboard_event}
 * @description 将配置文件的key value 调换，value变 key ，key 变value。通过键盘的key直接找到对应的事件
 * @param maps
 */
export const convertActionKeyMaps = (maps) => {
  maps = maps || ActionKeyMaps
  let result = {}
  for (let action in maps) {
    let key = maps[action]
    if (Array.isArray(key)) {
      result[key.join(',')] = action
    } else {
      let group = convertActionKeyMaps(key)
      for (let i in group) {
        result[i] = action + '_' + group[i]
      }
    }
  }
  return result
}
/**
 * {combo,keyCode : keyboard_event} -> {keyboard_event:combo,keyCode}
 * @param actionHandler 转为事件 对应 code，方便根据 事件名称获取 快捷键
 */
export const convertActionKeyCodeMaps = (actionHandler) => {
  let result = {}
  for (let key in actionHandler) {
    result[actionHandler[key]] = key
  }
  return result
}
/**
 * @description {combo,keyCode : keyboard_event} 方便被键盘KeyCode 找到
 */
export let ActionHandler = convertActionKeyMaps(ActionKeyMaps)
/**
 * @description {keyboard_event:combo,keyCode} 使用事件名称找到 ，用不显示菜单上
 */
export let ActionKeyCodeMaps = convertActionKeyCodeMaps(ActionHandler)
/**
 * 修改ActionHandler 后需要更新
 * @param actionHandler
 */
export const updateKeyCodeMap = (actionHandler) => {
  ActionHandler = actionHandler
  ActionKeyCodeMaps = convertActionKeyCodeMaps(actionHandler)
}
window.ActionCode = ActionKeyCodeMaps
window.CodeAction = ActionHandler
/**
 * 根据操作获取快捷键
 * @param key
 */
export const getFormatShortcutsWithAction = (key) => {
  let code = ActionKeyCodeMaps[key]
  let arr = code.split(',')
  let combo = +arr[0]
  let k = arr[1]
  return (
    CombomKeysArray.filter((item) => (combo & item) == item)
      .map((item) => getKeyCodeFormat(CombomKeys[item]))
      .join('') +
    '' +
    getKeyCodeFormat(KeyCode[k])
  )
}
//  组合键配置 为 {actino:[0,1]}
//  action 该组合键执行的操作,数组第一个元素为组合键 Control | shift | alt，如果没有则为0 ，数组第二个元素为 实际触发键
export default class KeyboradHandler {
  constructor(isShift, isAlt, isCtrl, keyCode) {
    // 组合键按下时不做任何操作
    if (CombomKeyNumber[keyCode]) {
      // console.info('Key combination pressed', keyCode)
      keyCode = 0 // 没有实际触发键
    }
    let combom = []
    if (isShift) combom.push(CombomKeyNumber[KeyEvent.DOM_VK_SHIFT])
    if (isAlt) combom.push(CombomKeyNumber[KeyEvent.DOM_VK_ALT])
    if (isCtrl) combom.push(CombomKeyNumber[KeyEvent.DOM_VK_CONTROL])
    let combomkey
    if (combom.length > 0) {
      // 使用组合键
      combomkey = combom.reduce((a, b) => a | b)
    } else {
      // 不使用组合键
      combomkey = 0
    }
    let keycode = combomkey + ',' + keyCode
    this.keycode = keycode
    let view = getFirstResponder()
    let handler = ActionHandler[keycode]
    ///
    if (NeedSelectedViewActions[handler]) {
      if (!(view && view.properties)) {
        console.log('Ignore')
        return
      }
    }
    if (this[handler]) {
      this[handler](handler)
    } else {
      //  通用处理逻辑
      this.handle(handler)
    }
  }

  // 分布
  alignment = (action) => Event.dispatch(component_alignment, action)
  alignment_left = this.alignment
  alignment_center = this.alignment
  alignment_right = this.alignment
  alignment_top = this.alignment
  alignment_middle = this.alignment
  alignment_bottom = this.alignment
  //  移动
  move = (action) => {
    let view = getFirstResponder()
    let transform = view.properties.transform
    let value = {}
    if (view.properties.isTemporaryGroup) {
      view.getItems().forEach((item) => {
        let transform = Object.assign({}, item.transform)
        transform[transformArrowKeys[action]] += transformArrowFlag[action]
        value[item.id] = transform
      })
    } else {
      transform = Object.assign({}, transform)
      transform[transformArrowKeys[action]] += transformArrowFlag[action]
      value = transform
    }
    Event.dispatch(component_properties_change, {
      key: 'transform',
      target: view,
      value: value,
      from: 'Keyboard',
    })
  }
  move_left = this.move
  move_top = this.move
  move_right = this.move
  move_bottom = this.move
  // action : key -> key: action
  // 将键盘按键与 操作关联起来
  handle() {
    let view = getFirstResponder()
    let action = ActionHandler[this.keycode]
    if (!action) {
      // console.info('Unspecified operation', this.keycode)
      return
    }
    let eventName = KeyboradEvents[action]
    if (!eventName) {
      console.info('Unspecified event', action)
      return
    }
    let props = view ? view.properties : void 0
    Event.dispatch(eventName, props)
  }
}
