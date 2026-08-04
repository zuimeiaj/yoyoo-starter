/**
 *  created by yaojun on 2019/8/3
 *
 */
import React from 'react'
import ViewController from './ViewController'
import { setCurrentEditor } from '../global/instance'
import { getScreeTransform } from '../global'
import Event from '../Base/Event'
import {
  component_edit_mode,
  component_empty,
  component_inactive,
  component_properties_change,
  component_show_resizer,
  table_insert_row_above,
  table_insert_row_below,
  table_insert_col_left,
  table_insert_col_right,
  table_delete_row,
  table_delete_col,
  table_clear_text,
  table_merge_cells,
  table_unmerge_cells,
  table_cell_selection_change,
} from '../util/actions'
import './ViewTable.scss'

// 拖线时 cell 的最小尺寸（组件像素空间），相邻两行/列均不小于此值
const MIN_CELL_SIZE = 20

/**
 * 交互模型（约定，勿随意改动）：
 * 非编辑模式：纯组件交互（无 cell 高亮）
 *   双击 cell → 进入编辑模式，选中该 cell（无 input）
 * 编辑模式（_cellMode=true，_editingCell=null）
 *   单击 cell → 仅选中（切换高亮，不出现 input）
 *   双击 cell → 进入该 cell 的 input 编辑
 *   拖动     → 框选多 cell
 *   右键     → 菜单（选区保留，批量删除/清除文本）
 *   行左侧/列上方 + → 快速插入行（上方）/列（左侧）
 *   行/列分隔线     → 拖动调整 cell 宽高（总尺寸守恒）
 * input 编辑中（_editingCell 非 null）
 *   单击其他 cell → 退出 input + 仅选中该 cell（双击才再进 input）
 *   单击自己 cell → 保持编辑
 *   双击其他 cell → 切换 input 到该 cell（第一次单击已退出，dblclick 进入）
 *   拖动         → 框选（input 保持）
 * 点组件外（component_inactive / component_empty）→ 退出编辑模式，清空所有高亮
 */
export default class ViewTable extends ViewController {
  constructor(props) {
    super(props)
    // 矩形选区 { row1, col1, row2, col2 } 已归一化（min/max），(row1,col1) 为 anchor
    this._selection = null
    // cell 选择模式：双击 cell 进入（选中、可单击切换、可拖动框选）；双击已选中 cell 进入 input 编辑
    this._cellMode = false
    this._editingCell = null
    this._contextCell = null
    // 编辑模式下的框选状态（按下时挂 document 监听，区分单击切换编辑 / 拖动框选）
    this._pendingCell = null
    this._mouseDownPos = null
    this._mouseMoved = false
    // 编辑态右键标记：右键时 input blur 不退出编辑、不清空选区（保证框选后右键批量操作生效）
    this._rightClicking = false
    // 行/列分隔线拖动状态 { dir: 'row'|'col', index, base: 比例拷贝, startClient, deltaRatio }；
    // 拖动中不写 properties，渲染叠加 deltaRatio，mouseup 一次性提交
    this._dragLine = null
  }

  // ==================== EventBus handlers ====================
  // 注意：ContextMenu dispatch 的 target 是右键时刻的 properties 引用，
  // 而 this.properties 会被 componentWillReceiveProps 替换成新对象，
  // 因此不能用引用比较，必须用 id 比较（id 稳定不变）

  _handleInsertRowAbove = (target) => {
    if (!target || target.id !== this.properties.id) return
    if (this._contextCell) this.insertRowAbove(this._contextCell.row)
  }

  _handleInsertRowBelow = (target) => {
    if (!target || target.id !== this.properties.id) return
    if (this._contextCell) this.insertRowBelow(this._contextCell.row)
  }

  _handleInsertColLeft = (target) => {
    if (!target || target.id !== this.properties.id) return
    if (this._contextCell) this.insertColLeft(this._contextCell.col)
  }

  _handleInsertColRight = (target) => {
    if (!target || target.id !== this.properties.id) return
    if (this._contextCell) this.insertColRight(this._contextCell.col)
  }

  _handleDeleteRow = (target) => {
    if (!target || target.id !== this.properties.id) return
    this.deleteRow()
  }

  _handleDeleteCol = (target) => {
    if (!target || target.id !== this.properties.id) return
    this.deleteCol()
  }

  _handleClearText = (target) => {
    if (!target || target.id !== this.properties.id) return
    this.clearText()
  }

  _handleMergeCells = (target) => {
    if (!target || target.id !== this.properties.id) return
    this.mergeCells()
  }

  _handleUnmergeCells = (target) => {
    if (!target || target.id !== this.properties.id) return
    this.unmergeCells()
  }

  /**
   * 选中变化（点击画布空白/切换组件）时退出选择模式并清空选区。
   * 必须 forceUpdate：清掉 cell 高亮/选中态；编辑模式标记清除后
   * _handleContainerMouseDown 不再拦截，mousedown 自然回到 Draggable 组件选中。
   * 注意：不在这里 dispatch component_close_edit_mode —— 该事件在 NeedResponderAction
   * 中，取消选中（component_empty）时 firstResponder 已为 null 会被静默丢弃（且打日志）。
   * resize 手柄由 ViewResizable 管理：下次 component_active 时自动 show(true) 恢复。
   *
   * 兜底强制退出 input 编辑：正常流程靠 input blur → setEditorBlur 退出，但该路径可能
   * 不触发 —— 其他组件 Draggable 的 preventDefault 阻止焦点转移、或 _rightClicking
   * 残留导致 blur 被忽略。若不在此清 _editingCell，input 会残留、组件无法再被选中
   * （僵尸态，无恢复路径）。
   */
  _handleInactive = () => {
    if (this._editingCell) {
      this._commitEditingCell()
      this._editingCell = null
    }
    // 取消进行中的拖线（点组件外取消交互，不提交）；mouseup 兜底：_dragLine 为空直接 return
    if (this._dragLine) {
      this._dragLine = null
      document.removeEventListener('mousemove', this._handleLineDragMove)
      document.removeEventListener('mouseup', this._handleLineDragUp)
    }
    this._rightClicking = false
    this._cellMode = false
    this._selection = null
    this._pendingCell = null
    this._mouseMoved = false
    this._notifyCellSelection()
    this.forceUpdate()
  }

  // ==================== Lifecycle ====================

  componentDidMount() {
    super.componentDidMount()
    // 容器可编程聚焦（tabindex=-1 不参与 Tab 导航），用于接收键盘扩展选区（框选态）
    this.refs.container.tabIndex = -1
    this.refs.container.addEventListener('keydown', this._handleContainerKeyDown, false)
    // 原生监听 contextmenu：在 ContextMenu.js（layout-editor-view）解析菜单之前
    // 设置 _contextCell，保证 getContextMenu() 的 check() 正确生效
    this.refs.container.addEventListener('contextmenu', this._handleNativeContextMenu, false)
    // 编辑模式优先拦截 mousedown：capture 阶段先于 Draggable（container 冒泡监听）执行，
    // stopPropagation 后 Draggable / 画布框选 / document 级监听全部收不到，
    // cell 交互完全由自身处理，不再依赖 data-drag + React document 委托
    this.refs.container.addEventListener('mousedown', this._handleContainerMouseDown, true)
    // click 单独拦截：编辑模式下阻止冒泡到 document（Root 的 context_hide_menu 等）
    this.refs.container.addEventListener('click', this._handleContainerClick, false)
    Event.listen(component_inactive, this._handleInactive)
    // 点击画布空白取消选中走的是 component_empty（setFirstResponder(null)），
    // 必须同时监听才能退出选择模式
    Event.listen(component_empty, this._handleInactive)
    Event.listen(table_insert_row_above, this._handleInsertRowAbove)
    Event.listen(table_insert_row_below, this._handleInsertRowBelow)
    Event.listen(table_insert_col_left, this._handleInsertColLeft)
    Event.listen(table_insert_col_right, this._handleInsertColRight)
    Event.listen(table_delete_row, this._handleDeleteRow)
    Event.listen(table_delete_col, this._handleDeleteCol)
    Event.listen(table_clear_text, this._handleClearText)
    Event.listen(table_merge_cells, this._handleMergeCells)
    Event.listen(table_unmerge_cells, this._handleUnmergeCells)
  }

  componentDidUpdate() {
    // 进入编辑模式后自动聚焦 input
    if (this._editingCell && this.refs.cellInput) {
      const input = this.refs.cellInput
      input.focus()
      input.select()
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount()
    clearTimeout(this._switchingTimer)
    document.removeEventListener('mousemove', this._handleCellMouseMove)
    document.removeEventListener('mouseup', this._handleCellMouseUp)
    document.removeEventListener('mousemove', this._handleLineDragMove)
    document.removeEventListener('mouseup', this._handleLineDragUp)
    if (this.refs.container) {
      this.refs.container.removeEventListener('keydown', this._handleContainerKeyDown, false)
      this.refs.container.removeEventListener('contextmenu', this._handleNativeContextMenu, false)
      this.refs.container.removeEventListener('mousedown', this._handleContainerMouseDown, true)
      this.refs.container.removeEventListener('click', this._handleContainerClick, false)
    }
    Event.destroy(component_inactive, this._handleInactive)
    Event.destroy(component_empty, this._handleInactive)
    Event.destroy(table_insert_row_above, this._handleInsertRowAbove)
    Event.destroy(table_insert_row_below, this._handleInsertRowBelow)
    Event.destroy(table_insert_col_left, this._handleInsertColLeft)
    Event.destroy(table_insert_col_right, this._handleInsertColRight)
    Event.destroy(table_delete_row, this._handleDeleteRow)
    Event.destroy(table_delete_col, this._handleDeleteCol)
    Event.destroy(table_clear_text, this._handleClearText)
    Event.destroy(table_merge_cells, this._handleMergeCells)
    Event.destroy(table_unmerge_cells, this._handleUnmergeCells)
    setCurrentEditor(null)
  }

  // ==================== Selection helpers ====================

  /** 设置选区并归一化（anchor 始终为 row1,col1） */
  _setSelection(r1, c1, r2, c2) {
    this._selection = {
      row1: Math.min(r1, r2),
      col1: Math.min(c1, c2),
      row2: Math.max(r1, r2),
      col2: Math.max(c1, c2),
    }
    this._notifyCellSelection()
  }

  _isInSelection(ri, ci) {
    const s = this._selection
    return !!s && ri >= s.row1 && ri <= s.row2 && ci >= s.col1 && ci <= s.col2
  }

  _rangeRows() {
    if (!this._selection) return null
    return { from: this._selection.row1, count: this._selection.row2 - this._selection.row1 + 1 }
  }

  _rangeCols() {
    if (!this._selection) return null
    return { from: this._selection.col1, count: this._selection.col2 - this._selection.col1 + 1 }
  }

  _focusContainer() {
    const c = this.refs.container
    if (c && document.activeElement !== c) c.focus()
  }

  // ==================== Drag ====================
  // 非编辑模式是纯组件交互（基类 onDragStart 处理选中/拖拽移动），无 cell 选区；
  // cell 选区只在编辑模式（双击进入）存在：单击切换编辑、拖动框选多 cell。
  // 编辑模式不拦截 onDragStart：mousedown 已在 capture 阶段被 _handleContainerMouseDown
  // 吞掉（见 componentDidMount），Draggable 根本收不到事件，组件不会被误拖拽

  // ==================== 键盘扩展选区（非编辑模式） ====================

  _handleContainerKeyDown = (e) => {
    // 编辑态由 input 处理，容器 keydown 不拦截
    if (this._editingCell) return
    const data = this.properties.tableData
    const rows = data.length
    const cols = (data[0] || []).length

    // Ctrl+A 全选
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      e.stopPropagation()
      this._setSelection(0, 0, rows - 1, cols - 1)
      this.forceUpdate()
      return
    }
    // Escape 取消框选
    if (e.key === 'Escape' && this._selection) {
      e.preventDefault()
      e.stopPropagation()
      this._selection = null
      this.forceUpdate()
      return
    }
    // Shift+方向键扩展选区（anchor 固定，扩展角移动）
    const DIRS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (e.shiftKey && DIRS[e.key] && this._selection) {
      e.preventDefault()
      e.stopPropagation()
      const [dr, dc] = DIRS[e.key]
      const row2 = Math.min(rows - 1, Math.max(0, this._selection.row2 + dr))
      const col2 = Math.min(cols - 1, Math.max(0, this._selection.col2 + dc))
      this._setSelection(this._selection.row1, this._selection.col1, row2, col2)
      this.forceUpdate()
    }
  }

  /** 原生 contextmenu 监听：在 ContextMenu.js 之前设置右键 cell */
  _handleNativeContextMenu = (e) => {
    // 右键完成，清除标记（blur 已发生且被忽略）
    this._rightClicking = false
    const target = e.target
    if (!target || !target.closest) return
    const td = target.closest('td')
    if (!td) return
    const row = parseInt(td.dataset.row, 10)
    const col = parseInt(td.dataset.col, 10)
    if (!isNaN(row) && !isNaN(col)) {
      this._contextCell = { row, col }
      this._notifyCellSelection()
    }
  }

  // ==================== Cell editing ====================

  /**
   * @override ViewController.onDBClick
   */
  onDBClick(e) {
    if (this._parent && this._parent.isLockChildren) {
      super.onDBClick(e)
      return
    }
    e.stopPropagation()

    // 找到被双击的 cell
    const td = e.target.closest('td')
    if (!td) {
      super.onDBClick(e)
      return
    }
    const row = parseInt(td.dataset.row, 10)
    const col = parseInt(td.dataset.col, 10)
    if (isNaN(row) || isNaN(col)) return

    if (this._editingCell) {
      // 已在 input 编辑：双击切换编辑到该 cell
      // 如果已经在编辑同一个 cell，不做重复操作
      if (this._editingCell.row === row && this._editingCell.col === col) return
      // 如果正在编辑其他 cell，先保存
      this._commitEditingCell()
      this._selection = { row1: row, col1: col, row2: row, col2: col }
      this._editingCell = { row, col }
      this._notifyCellSelection()
      this.forceUpdate()
      return
    }

    if (this._cellMode) {
      // 选择模式中双击：进入 input 编辑该 cell
      this._selection = { row1: row, col1: col, row2: row, col2: col }
      this._editingCell = { row, col }
      setCurrentEditor(this)
      Event.dispatch(component_edit_mode)
      this._notifyCellSelection()
      this.forceUpdate()
      return
    }

    // 非编辑模式双击：进入 cell 选择模式并选中该 cell（不进入 input 编辑），
    // 这样可立即拖动多选 cell；再次双击选中 cell 才进入编辑
    this._cellMode = true
    this._selection = { row1: row, col1: col, row2: row, col2: col }
    this._focusContainer()
    // 选择模式下隐藏 resize 手柄（正在操作 cell）
    Event.dispatch(component_edit_mode)
    this._notifyCellSelection()
    this.forceUpdate()
  }

  /** 提交编辑：读取 input 值写回 tableData 并 dispatch 变更事件 */
  _commitEditingCell() {
    if (!this._editingCell) return
    const { row, col } = this._editingCell
    const input = this.refs.cellInput
    const newValue = input ? input.value : ''
    const oldValue = this.properties.tableData[row][col]

    if (newValue !== oldValue) {
      // 深拷贝 tableData，更新目标 cell
      const newTableData = this.properties.tableData.map((r) => [...r])
      newTableData[row][col] = newValue
      this.properties.tableData = newTableData

      // 通知属性变更（用于撤销历史记录）
      Event.dispatch(component_properties_change, {
        target: this,
        key: 'tableData',
        value: newTableData.map((r) => [...r]),
      })
    }
  }

  setEditorBlur() {
    this._commitEditingCell()
    this._editingCell = null
    // 退出 input 编辑后取消 cell 选中高亮
    this._selection = null
    // 不 dispatch component_close_edit_mode：仍在选择模式手柄保持隐藏，
    // 手柄由 ViewResizable 在下次 component_active 时自动恢复显示
    this._notifyCellSelection()
    this.forceUpdate()
  }

  // ==================== Input event handlers ====================

  /**
   * 编辑模式下按下 cell（原生监听，capture 阶段，见 componentDidMount）：
   * 在事件到达 Draggable（container 冒泡监听）之前 stopPropagation，
   * 组件拖拽、画布框选、document 级监听全部收不到 mousedown。
   * 按下时不立即切换，挂 document 监听区分：单击 → 切换编辑 cell；拖动 → 框选多 cell。
   * preventDefault 的取舍：
   *   - 非 input 目标 preventDefault：阻止框选时选中 cell 文本、保持焦点稳定
   *     （点击 cell 不再触发 input blur，消除 blur 时序竞争）
   *   - input 本身不 preventDefault：保留光标定位能力
   *   - 右键不 preventDefault：保留原生 contextmenu 事件
   */
  _handleContainerMouseDown = (e) => {
    // 非编辑模式：不拦截，交给 Draggable（组件选中/拖拽移动）
    if (!this._editingCell && !this._cellMode) return
    e.stopPropagation()
    // 右键（button=2）：只打开菜单，标记 _rightClicking 让 blur 忽略（不退出编辑、不清空选区）
    if (e.button !== 0) {
      this._rightClicking = true
      return
    }
    const target = e.target
    // 快速插入按钮：点击立即插入行/列（行 + 上方插入、列 + 左侧插入），
    // 复用 insertRowAbove/insertColLeft（内部已清选区/编辑态/拖线）
    const quickEl = target && target.closest ? target.closest('[data-quick-insert]') : null
    if (quickEl) {
      e.preventDefault()
      const index = parseInt(quickEl.dataset.index, 10)
      if (!isNaN(index)) {
        if (quickEl.dataset.quickInsert === 'row') this.insertRowAbove(index)
        else this.insertColLeft(index)
      }
      return
    }
    // 分隔线手柄：进入拖线（与 cell 框选互斥，不设 _pendingCell）
    const lineEl = target && target.closest ? target.closest('[data-resize-line]') : null
    if (lineEl) {
      e.preventDefault()
      this._startLineDrag(lineEl, e)
      return
    }
    // 正在编辑的 input：不 preventDefault，保留光标定位；其余交互交给默认行为
    if (target === this.refs.cellInput) return
    // 阻止拖选时选中 cell 文本；同时焦点稳定（点击 cell 不产生 blur，无需 blur 时序兜底）
    e.preventDefault()
    const td = target && target.closest ? target.closest('td') : null
    if (!td) return
    const row = parseInt(td.dataset.row, 10)
    const col = parseInt(td.dataset.col, 10)
    if (isNaN(row) || isNaN(col)) return
    // 点击当前编辑 cell：保持编辑
    if (this._editingCell && this._editingCell.row === row && this._editingCell.col === col) return
    this._pendingCell = { row, col }
    this._mouseDownPos = { x: e.clientX, y: e.clientY }
    this._mouseMoved = false
    document.addEventListener('mousemove', this._handleCellMouseMove)
    document.addEventListener('mouseup', this._handleCellMouseUp)
  }

  /** 编辑模式下点击 cell（原生监听）：阻止 click 冒泡到 document（Root 的 context_hide_menu 等），cell 交互完全由自身处理 */
  _handleContainerClick = (e) => {
    if (!this._editingCell && !this._cellMode) return
    e.stopPropagation()
  }

  // ==================== Row/Col 分隔线拖动 ====================
  // 总尺寸守恒：拖某行边界，该行变大、相邻行等量变小，transform 不变。
  // 拖动中不写 properties（渲染叠加 _dragLine.deltaRatio），mouseup 一次提交一条撤销历史。

  /** 开始拖线：拷贝 base 比例（properties 数组视为不可变）、清 cell 框选状态、挂 document 监听 */
  _startLineDrag(lineEl, e) {
    const dir = lineEl.dataset.resizeLine
    const index = parseInt(lineEl.dataset.index, 10)
    if ((dir !== 'row' && dir !== 'col') || isNaN(index)) return
    const base = dir === 'row' ? this._getRowRatios() : this._getColRatios()
    if (base[index] === undefined || base[index + 1] === undefined) return
    // 与 cell 框选互斥：清 pendingCell + 移除框选监听
    this._pendingCell = null
    this._mouseMoved = false
    document.removeEventListener('mousemove', this._handleCellMouseMove)
    document.removeEventListener('mouseup', this._handleCellMouseUp)
    this._dragLine = { dir, index, base, startClient: { x: e.clientX, y: e.clientY }, deltaRatio: 0 }
    document.addEventListener('mousemove', this._handleLineDragMove)
    document.addEventListener('mouseup', this._handleLineDragUp)
  }

  _handleLineDragMove = (e) => {
    const d = this._dragLine
    if (!d) return
    const t = this.properties.transform
    const dim = d.dir === 'row' ? t.height : t.width
    if (!dim) return
    // 屏幕 delta → 组件坐标（÷画布缩放）
    const scale = getScreeTransform().scale || 1
    const dx = (e.clientX - d.startClient.x) / scale
    const dy = (e.clientY - d.startClient.y) / scale
    // 投影到组件本地轴（项目旋转约定 M=[[cos,sin],[-sin,cos]]，M^T 作用于屏幕 delta）
    const a = (t.rotation / 180) * Math.PI
    const localDelta =
      d.dir === 'row' ? Math.sin(a) * dx + Math.cos(a) * dy : Math.cos(a) * dx - Math.sin(a) * dy
    // clamp：相邻两行/列均不小于 MIN_CELL_SIZE（区间反转时不可拖）
    const minRatio = MIN_CELL_SIZE / dim
    const lo = minRatio - d.base[d.index]
    const hi = d.base[d.index + 1] - minRatio
    d.deltaRatio = lo > hi ? 0 : Math.min(hi, Math.max(lo, localDelta / dim))
    this.forceUpdate()
  }

  _handleLineDragUp = () => {
    document.removeEventListener('mousemove', this._handleLineDragMove)
    document.removeEventListener('mouseup', this._handleLineDragUp)
    const d = this._dragLine
    if (!d) return
    this._dragLine = null
    const t = this.properties.transform
    const dim = d.dir === 'row' ? t.height : t.width
    // 零位移（< 0.5px）跳过提交，避免无意义撤销条目
    if (Math.abs(d.deltaRatio * dim) < 0.5) {
      this.forceUpdate()
      return
    }
    this._commitRatios(d)
  }

  /** 提交拖线结果：全新拷贝数组（不可变，防污染撤销历史）写回 properties 并 dispatch 一条历史 */
  _commitRatios(d) {
    const key = d.dir === 'row' ? 'rowRatios' : 'colRatios'
    const ratios = d.base.map((v, i) => {
      if (i === d.index) return v + d.deltaRatio
      if (i === d.index + 1) return v - d.deltaRatio
      return v
    })
    const sum = ratios.reduce((a, b) => a + b, 0)
    const normalized = sum > 0 ? ratios.map((v) => v / sum) : ratios
    // 本地同步（dispatch 后 componentWillReceiveProps 会替换 properties）
    this.properties[key] = normalized
    Event.dispatch(component_properties_change, {
      target: this,
      key: [key],
      value: [[...normalized]],
    })
    this.forceUpdate()
  }

  /** 编辑模式按下后的 mousemove：超过阈值开始框选，实时扩展选区（不退出编辑模式） */
  _handleCellMouseMove = (e) => {
    if (!this._pendingCell) return
    const dx = Math.abs(e.clientX - this._mouseDownPos.x)
    const dy = Math.abs(e.clientY - this._mouseDownPos.y)
    // 5px 阈值内视为单击
    if (dx + dy < 5) return
    this._mouseMoved = true
    const target = e.target
    const td = target && target.closest ? target.closest('td') : null
    if (td) {
      const row = parseInt(td.dataset.row, 10)
      const col = parseInt(td.dataset.col, 10)
      if (!isNaN(row) && !isNaN(col)) {
        this._setSelection(this._pendingCell.row, this._pendingCell.col, row, col)
        this.forceUpdate()
      }
    }
  }

  /** 按下后的 mouseup：单击 → 选中/切换编辑；拖动 → 框选完成 */
  _handleCellMouseUp = () => {
    document.removeEventListener('mousemove', this._handleCellMouseMove)
    document.removeEventListener('mouseup', this._handleCellMouseUp)
    if (this._pendingCell && !this._mouseMoved) {
      // 单击
      const { row, col } = this._pendingCell
      if (this._editingCell) {
        // input 编辑中单击其他 cell：提交并退出 input，仅选中该 cell（双击才再次进入 input 编辑）
        // 切换期间旧 input 会触发 blur，标记 _switching 让 blur 忽略，避免误退出编辑模式
        this._switching = true
        this._commitEditingCell()
        this._editingCell = null
        this._selection = { row1: row, col1: col, row2: row, col2: col }
        this._notifyCellSelection()
        this.forceUpdate()
        // blur 在 mousedown 的默认行为阶段触发（早于下一个宏任务），随后清除标记
        clearTimeout(this._switchingTimer)
        this._switchingTimer = setTimeout(() => {
          this._switching = false
        }, 0)
      } else if (this._cellMode) {
        // 编辑模式中单击：选中该 cell（单 cell 选区，不进入 input 编辑）
        this._selection = { row1: row, col1: col, row2: row, col2: col }
        this._focusContainer()
        this._notifyCellSelection()
        this.forceUpdate()
      }
    } else if (this._pendingCell && this._mouseMoved) {
      // 框选完成：不退出编辑模式（编辑 input 保持、resize 手柄保持隐藏），
      // 容器聚焦以便键盘扩展选区（Ctrl+A / Shift+方向键 / Escape）
      this._focusContainer()
    }
    this._pendingCell = null
    this._mouseMoved = false
  }

  _handleInputBlur = (e) => {
    // 切换 cell 期间（旧 input 失焦）忽略，避免误退出编辑模式；
    // 按下待定状态（_pendingCell）也忽略，等 mouseup 决定是单击切换还是框选；
    // 编辑态右键（_rightClicking）也忽略，保证框选后右键批量操作时选区不被清空
    if (this._switching || this._pendingCell || this._rightClicking) return
    // 记录 blur 来源，延迟判断：只有 blur 的 input 仍是当前编辑 input 时才退出编辑
    this._blurredInput = e.target
    setTimeout(() => {
      if (this._editingCell && this.refs.cellInput === this._blurredInput) {
        this.setEditorBlur()
      }
      this._blurredInput = null
    }, 0)
  }

  _handleInputKeyDown = (e) => {
    const { row, col } = this._editingCell
    const data = this.properties.tableData
    const maxRow = data.length - 1
    const maxCol = (data[0] || []).length - 1

    const moveTo = (newRow, newCol) => {
      if (newRow < 0 || newRow > maxRow || newCol < 0 || newCol > maxCol) return
      e.preventDefault()
      // 键盘导航修复：目标被合并区覆盖（非 anchor）时重定向到合并区 anchor，
      // 否则该 cell 渲染 return null、input 永不出现，编辑态会卡死
      const m = this._findMerge(newRow, newCol)
      if (m && (m.row1 !== newRow || m.col1 !== newCol)) {
        newRow = m.row1
        newCol = m.col1
      }
      // 切换 cell 期间旧 input 会触发 blur，标记 _switching 让 blur 忽略
      this._switching = true
      this._commitEditingCell()
      this._selection = { row1: newRow, col1: newCol, row2: newRow, col2: newCol }
      this._editingCell = { row: newRow, col: newCol }
      this._notifyCellSelection()
      this.forceUpdate()
      clearTimeout(this._switchingTimer)
      this._switchingTimer = setTimeout(() => {
        this._switching = false
      }, 0)
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        this.setEditorBlur()
        break
      case 'Escape':
        e.preventDefault()
        // 放弃编辑，不保存。注意：不能 dispatch component_close_edit_mode ——
        // 退出 input 后仍在 cell 选择模式，resize 手柄应保持隐藏（同 setEditorBlur）
        this._editingCell = null
        this._notifyCellSelection()
        this.forceUpdate()
        break
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          if (col > 0) moveTo(row, col - 1)
          else if (row > 0) moveTo(row - 1, maxCol)
        } else {
          if (col < maxCol) moveTo(row, col + 1)
          else if (row < maxRow) moveTo(row + 1, 0)
        }
        break
      case 'ArrowUp':
        if (row > 0) moveTo(row - 1, col)
        break
      case 'ArrowDown':
        if (row < maxRow) moveTo(row + 1, col)
        break
      default:
        break
    }
  }

  // ==================== Context menu ====================
  // 无 getMinSize：td 可无限缩小，resize 不受最小尺寸限制（ViewResizable 默认 minWidth/minHeight = 1）

  getContextMenu() {
    const tableMenus = [
      {
        name: '上方插入行',
        action: table_insert_row_above,
        check: () => !!this._contextCell,
      },
      {
        name: '下方插入行',
        action: table_insert_row_below,
        check: () => !!this._contextCell,
      },
      {
        name: '左侧插入列',
        action: table_insert_col_left,
        check: () => !!this._contextCell,
      },
      {
        name: '右侧插入列',
        action: table_insert_col_right,
        check: () => !!this._contextCell,
      },
      { type: 'line' },
      {
        name: '删除行',
        action: table_delete_row,
        check: () => this.canDeleteRow(),
      },
      {
        name: '删除列',
        action: table_delete_col,
        check: () => this.canDeleteCol(),
      },
      { type: 'line' },
      {
        name: '合并单元格',
        action: table_merge_cells,
        check: () =>
          !!this._selection &&
          (this._selection.row2 - this._selection.row1 + 1) * (this._selection.col2 - this._selection.col1 + 1) > 1,
      },
      {
        name: '取消合并',
        action: table_unmerge_cells,
        check: () => !!this._contextCell && !!this._findMerge(this._contextCell.row, this._contextCell.col),
      },
      { type: 'line' },
      {
        name: '清除文本',
        action: table_clear_text,
        check: () => !!this._selection || !!this._contextCell || !!this._editingCell,
      },
      { type: 'line' },
    ]
    return [...tableMenus, ...super.getContextMenu()]
  }

  // ==================== Merged cells ====================

  /**
   * 合并区域数组：长度校验 + 逐元素 bounds 校验（row1<=row2、col1<=col2、在 tableData 维度内），
   * 非法过滤；缺字段（旧数据）返回 []。合并时非 anchor cell 内容被清空，
   * 因此合并区内部 cell 恒为空——移除相交合并区不会复活已丢失内容。
   */
  _getMerges() {
    const data = this.properties.tableData
    const rows = data.length
    const cols = (data[0] || []).length
    const list = this.properties.mergedCells
    if (!Array.isArray(list)) return []
    return list.filter(
      (m) =>
        !!m &&
        typeof m.row1 === 'number' &&
        m.row1 >= 0 && m.col1 >= 0 &&
        m.row1 <= m.row2 && m.col1 <= m.col2 &&
        m.row2 < rows && m.col2 < cols
    )
  }

  /** 返回覆盖 (ri, ci) 的合并区（anchor 或内部 cell 均命中），无则 null */
  _findMerge(ri, ci) {
    const list = this._getMerges()
    for (let i = 0; i < list.length; i++) {
      const m = list[i]
      if (ri >= m.row1 && ri <= m.row2 && ci >= m.col1 && ci <= m.col2) return m
    }
    return null
  }

  /**
   * 插入行列后合并区联动（insertRowAbove 语义，纯函数，基于原坐标映射，无级联依赖）：
   *   index <= m.row1 → 整体下移（row1/row2 +1）
   *   m.row1 < index <= m.row2 → 合并区扩展（row2 +1，Excel 行为：插入行并入合并区）
   *   否则不变
   */
  _shiftMergesForInsert(merges, dir, index) {
    return merges.map((m) => {
      const a = dir === 'row' ? m.row1 : m.col1
      const b = dir === 'row' ? m.row2 : m.col2
      if (index <= a) {
        return dir === 'row'
          ? { row1: m.row1 + 1, col1: m.col1, row2: m.row2 + 1, col2: m.col2 }
          : { row1: m.row1, col1: m.col1 + 1, row2: m.row2, col2: m.col2 + 1 }
      }
      if (index <= b) {
        return dir === 'row'
          ? { row1: m.row1, col1: m.col1, row2: m.row2 + 1, col2: m.col2 }
          : { row1: m.row1, col1: m.col1, row2: m.row2, col2: m.col2 + 1 }
      }
      return m
    })
  }

  // ==================== Cell styles ====================

  /**
   * 克隆 cellStyles（深拷贝样式对象）：维度与 tableData 校验，
   * 非法（旧数据/维度变化）返回全 null 矩阵。所有变更方必须先 clone 再改。
   */
  _cloneCellStyles() {
    const data = this.properties.tableData
    const rows = data.length
    const cols = (data[0] || []).length
    const s = this.properties.cellStyles
    if (Array.isArray(s) && s.length === rows && rows > 0) {
      const valid = s.every((r, ri) => Array.isArray(r) && r.length === (ri < rows ? cols : 0))
      if (valid) return s.map((r) => r.map((x) => (x ? { ...x } : null)))
    }
    return new Array(rows).fill(null).map(() => new Array(cols).fill(null))
  }

  /** 当前样式目标矩形（选区优先）：_selection → _editingCell → _contextCell → null（供面板控件读） */
  getActiveCellRect() {
    if (this._selection) return this._selection
    if (this._editingCell) {
      return { row1: this._editingCell.row, col1: this._editingCell.col, row2: this._editingCell.row, col2: this._editingCell.col }
    }
    if (this._contextCell) {
      return { row1: this._contextCell.row, col1: this._contextCell.col, row2: this._contextCell.row, col2: this._contextCell.col }
    }
    return null
  }

  /** 读取 cell 样式（合并区解析到 anchor，与渲染一致）；越界/无样式返回 null（供面板控件读） */
  getCellStyle(ri, ci) {
    const m = this._findMerge(ri, ci)
    if (m) {
      ri = m.row1
      ci = m.col1
    }
    const s = this.properties.cellStyles
    if (!Array.isArray(s) || !s[ri] || !s[ri][ci]) return null
    return s[ri][ci]
  }

  /**
   * 应用样式字段到当前目标矩形（选区→编辑 cell→右键 cell），一条撤销历史。
   * value 为 '' 表示移除该字段（对象空则整体置 null，保持稀疏）。
   */
  applyCellStyle(field, value) {
    const rect = this.getActiveCellRect()
    if (!rect) return
    const data = this.properties.tableData
    const maxRow = data.length - 1
    const maxCol = (data[0] || []).length - 1
    const row1 = Math.max(0, Math.min(rect.row1, maxRow))
    const col1 = Math.max(0, Math.min(rect.col1, maxCol))
    const row2 = Math.max(0, Math.min(rect.row2, maxRow))
    const col2 = Math.max(0, Math.min(rect.col2, maxCol))
    const styles = this._cloneCellStyles()
    let changed = false
    for (let i = row1; i <= row2; i++) {
      for (let j = col1; j <= col2; j++) {
        const cur = styles[i][j]
        let next
        if (value === '') {
          next = cur ? { ...cur } : null
          if (next) {
            delete next[field]
            if (!Object.keys(next).length) next = null
          }
        } else {
          next = cur ? { ...cur, [field]: value } : { [field]: value }
        }
        if (JSON.stringify(cur) !== JSON.stringify(next)) {
          styles[i][j] = next
          changed = true
        }
      }
    }
    if (!changed) return
    this._applyTableChange(null, null, { cellStyles: styles })
  }

  /** 选区/编辑状态变化通知（InspectorTableCell 面板控件监听刷新） */
  _notifyCellSelection() {
    Event.dispatch(table_cell_selection_change, this)
  }

  /**
   * 删除行列后合并区联动（纯函数），delEnd = from + count - 1：
   *   delEnd < m.row1 → 整体上移 count
   *   from > m.row2   → 不变
   *   from <= m.row1  → 移除（anchor 行/列被删，含完全覆盖）
   *   from > m.row1   → 锚存活：删除区截断尾部 → 收窄到 from-1；删除区完全在内部 → 上移 count
   *                     （delEnd >= row2 时必须用 from-1 而非 row2-count，防下溢）
   */
  _shiftMergesForDelete(merges, dir, from, count) {
    const delEnd = from + count - 1
    const newMerge = (m, a, b) =>
      dir === 'row'
        ? { row1: a, col1: m.col1, row2: b, col2: m.col2 }
        : { row1: m.row1, col1: a, row2: m.row2, col2: b }
    return merges.reduce((acc, m) => {
      const a = dir === 'row' ? m.row1 : m.col1
      const b = dir === 'row' ? m.row2 : m.col2
      if (delEnd < a) acc.push(newMerge(m, a - count, b - count))
      else if (from > b) acc.push(m)
      else if (from <= a) {
        // anchor 被删 → 整个合并区移除（内容随 anchor 行/列删除）
      } else {
        acc.push(newMerge(m, a, delEnd >= b ? from - 1 : b - count))
      }
      return acc
    }, [])
  }

  // ==================== Row/Col ratios ====================

  /**
   * 行高比例数组（元素 = 占比，总和 ≈ 1）。
   * 统一在这里做：长度校验（与 tableData 行数不符 → 均分 fallback，兼容旧数据/撤销/维度变化）
   * + 求和归一化（浮点漂移一次消灭）。渲染、手柄位置、拖线 clamp 全部基于此函数输出。
   * 组件 resize 后行高列宽自动按比例缩放（比例无量纲，像素 = 比例 × transform 尺寸）。
   */
  _getRowRatios() {
    const data = this.properties.tableData
    const n = data.length
    const r = this.properties.rowRatios
    if (Array.isArray(r) && r.length === n && n > 0) {
      const sum = r.reduce((a, b) => a + b, 0)
      if (sum > 0) return r.map((v) => v / sum)
    }
    return new Array(n).fill(1 / n)
  }

  /** 列宽比例数组，逻辑同 _getRowRatios */
  _getColRatios() {
    const data = this.properties.tableData
    const n = (data[0] || []).length
    const c = this.properties.colRatios
    if (Array.isArray(c) && c.length === n && n > 0) {
      const sum = c.reduce((a, b) => a + b, 0)
      if (sum > 0) return c.map((v) => v / sum)
    }
    return new Array(n).fill(1 / n)
  }

  /** 显示层行比例：基础比例叠加拖线 delta（成对加减，总和保持 1） */
  _getDisplayRowRatios() {
    const ratios = this._getRowRatios()
    const d = this._dragLine
    if (d && d.dir === 'row' && ratios[d.index] !== undefined && ratios[d.index + 1] !== undefined) {
      return ratios.map((v, i) => {
        if (i === d.index) return v + d.deltaRatio
        if (i === d.index + 1) return v - d.deltaRatio
        return v
      })
    }
    return ratios
  }

  /** 显示层列比例，逻辑同 _getDisplayRowRatios */
  _getDisplayColRatios() {
    const ratios = this._getColRatios()
    const d = this._dragLine
    if (d && d.dir === 'col' && ratios[d.index] !== undefined && ratios[d.index + 1] !== undefined) {
      return ratios.map((v, i) => {
        if (i === d.index) return v + d.deltaRatio
        if (i === d.index + 1) return v - d.deltaRatio
        return v
      })
    }
    return ratios
  }

  /** 累计比例（前 end 项之和），用于分隔线手柄定位 */
  _cumRatio(ratios, end) {
    let sum = 0
    for (let i = 0; i < end; i++) sum += ratios[i]
    return sum
  }

  // ==================== Table operations ====================

  _cloneTableData() {
    return this.properties.tableData.map((row) => [...row])
  }

  /** 基于当前 transform 生成新宽高（x/y/rotation 不变） */
  _updateTransform(t, width, height) {
    return { x: t.x, y: t.y, width, height, rotation: t.rotation }
  }

  insertRowAbove(row) {
    const data = this._cloneTableData()
    const t = this.properties.transform
    // 插入行（比例守恒）：老行比例等比缩小 ×n/(n+1)，新行 = 1/(n+1)，
    // 总高 ×(n+1)/n（= +平均行高，与旧逻辑一致），老行像素严格不变
    const n = data.length
    const newRatios = this._getRowRatios().map((v) => (v * n) / (n + 1))
    newRatios.splice(row, 0, 1 / (n + 1))
    // 合并区联动：插入在合并区上方 → 整体下移；在合并区内 → 扩展
    const newMerges = this._shiftMergesForInsert(this._getMerges(), 'row', row)
    // 样式联动：与 tableData 同维度插入空行
    const newStyles = this._cloneCellStyles()
    newStyles.splice(row, 0, new Array((data[0] || []).length).fill(null))
    data.splice(row, 0, new Array((data[0] || []).length).fill(''))
    this._selection = null
    this._contextCell = null
    this._editingCell = null
    this._dragLine = null
    this._applyTableChange(data, this._updateTransform(t, t.width, (t.height * (n + 1)) / n), { rowRatios: newRatios, mergedCells: newMerges, cellStyles: newStyles })
  }

  insertRowBelow(row) {
    const data = this._cloneTableData()
    const t = this.properties.transform
    const n = data.length
    const newRatios = this._getRowRatios().map((v) => (v * n) / (n + 1))
    newRatios.splice(row + 1, 0, 1 / (n + 1))
    const newMerges = this._shiftMergesForInsert(this._getMerges(), 'row', row + 1)
    const newStyles = this._cloneCellStyles()
    newStyles.splice(row + 1, 0, new Array((data[0] || []).length).fill(null))
    data.splice(row + 1, 0, new Array((data[0] || []).length).fill(''))
    this._selection = null
    this._contextCell = null
    this._editingCell = null
    this._dragLine = null
    this._applyTableChange(data, this._updateTransform(t, t.width, (t.height * (n + 1)) / n), { rowRatios: newRatios, mergedCells: newMerges, cellStyles: newStyles })
  }

  insertColLeft(col) {
    const data = this._cloneTableData()
    const t = this.properties.transform
    // 插入列（比例守恒）：逻辑同 insertRowAbove
    const m = (data[0] || []).length
    const newRatios = this._getColRatios().map((v) => (v * m) / (m + 1))
    newRatios.splice(col, 0, 1 / (m + 1))
    const newMerges = this._shiftMergesForInsert(this._getMerges(), 'col', col)
    const newStyles = this._cloneCellStyles()
    newStyles.forEach((r) => r.splice(col, 0, null))
    data.forEach((row) => row.splice(col, 0, ''))
    this._selection = null
    this._contextCell = null
    this._editingCell = null
    this._dragLine = null
    this._applyTableChange(data, this._updateTransform(t, (t.width * (m + 1)) / m, t.height), { colRatios: newRatios, mergedCells: newMerges, cellStyles: newStyles })
  }

  insertColRight(col) {
    const data = this._cloneTableData()
    const t = this.properties.transform
    const m = (data[0] || []).length
    const newRatios = this._getColRatios().map((v) => (v * m) / (m + 1))
    newRatios.splice(col + 1, 0, 1 / (m + 1))
    const newMerges = this._shiftMergesForInsert(this._getMerges(), 'col', col + 1)
    const newStyles = this._cloneCellStyles()
    newStyles.forEach((r) => r.splice(col + 1, 0, null))
    data.forEach((row) => row.splice(col + 1, 0, ''))
    this._selection = null
    this._contextCell = null
    this._editingCell = null
    this._dragLine = null
    this._applyTableChange(data, this._updateTransform(t, (t.width * (m + 1)) / m, t.height), { colRatios: newRatios, mergedCells: newMerges, cellStyles: newStyles })
  }

  /** 删除行：优先框选区域（批量），无选区时基于右键 cell（_contextCell）删除单行 */
  deleteRow() {
    let r = this._rangeRows()
    if (!r && this._contextCell) r = { from: this._contextCell.row, count: 1 }
    if (!r) return
    // 至少保留 1 行
    if (this.properties.tableData.length - r.count < 1) return
    const t = this.properties.transform
    // 删除行（比例守恒）：D = 被删行比例和，剩余比例 ÷(1-D) 归一化、总高 ×(1-D) → 剩余行像素不变
    const ratios = this._getRowRatios()
    const D = ratios.slice(r.from, r.from + r.count).reduce((a, b) => a + b, 0)
    const keep = 1 - D
    const newRatios = keep > 0 ? ratios.filter((v, i) => i < r.from || i >= r.from + r.count).map((v) => v / keep) : []
    // 合并区联动：anchor 行被删 → 移除；删除区截断合并区 → 收窄；在上方 → 上移
    const newMerges = this._shiftMergesForDelete(this._getMerges(), 'row', r.from, r.count)
    // 样式联动：与 tableData 同维度删除行
    const newStyles = this._cloneCellStyles()
    newStyles.splice(r.from, r.count)
    const data = this._cloneTableData()
    data.splice(r.from, r.count)
    this._selection = null
    this._contextCell = null
    this._editingCell = null
    this._dragLine = null
    this._applyTableChange(data, this._updateTransform(t, t.width, t.height * keep), { rowRatios: newRatios, mergedCells: newMerges, cellStyles: newStyles })
  }

  /** 删除列：优先框选区域（批量），无选区时基于右键 cell（_contextCell）删除单列 */
  deleteCol() {
    let c = this._rangeCols()
    if (!c && this._contextCell) c = { from: this._contextCell.col, count: 1 }
    if (!c) return
    // 至少保留 1 列
    if ((this.properties.tableData[0] || []).length - c.count < 1) return
    const t = this.properties.transform
    // 删除列（比例守恒）：逻辑同 deleteRow
    const ratios = this._getColRatios()
    const D = ratios.slice(c.from, c.from + c.count).reduce((a, b) => a + b, 0)
    const keep = 1 - D
    const newRatios = keep > 0 ? ratios.filter((v, i) => i < c.from || i >= c.from + c.count).map((v) => v / keep) : []
    const newMerges = this._shiftMergesForDelete(this._getMerges(), 'col', c.from, c.count)
    const newStyles = this._cloneCellStyles()
    newStyles.forEach((r) => r.splice(c.from, c.count))
    const data = this._cloneTableData()
    data.forEach((row) => row.splice(c.from, c.count))
    this._selection = null
    this._contextCell = null
    this._editingCell = null
    this._dragLine = null
    this._applyTableChange(data, this._updateTransform(t, t.width * keep, t.height), { colRatios: newRatios, mergedCells: newMerges, cellStyles: newStyles })
  }

  canDeleteRow() {
    if (this._selection) {
      return this.properties.tableData.length - (this._selection.row2 - this._selection.row1 + 1) >= 1
    }
    return !!this._contextCell && this.properties.tableData.length > 1
  }

  canDeleteCol() {
    if (this._selection) {
      return (this.properties.tableData[0] || []).length - (this._selection.col2 - this._selection.col1 + 1) >= 1
    }
    return !!this._contextCell && (this.properties.tableData[0] || []).length > 1
  }

  /** 清除文本：清空框选区域（优先）/右键 cell/当前编辑 cell 的内容 */
  clearText() {
    let r1, c1, r2, c2
    if (this._selection) {
      r1 = this._selection.row1
      c1 = this._selection.col1
      r2 = this._selection.row2
      c2 = this._selection.col2
    } else if (this._contextCell) {
      r1 = r2 = this._contextCell.row
      c1 = c2 = this._contextCell.col
    } else if (this._editingCell) {
      r1 = r2 = this._editingCell.row
      c1 = c2 = this._editingCell.col
    } else {
      return
    }
    const data = this._cloneTableData()
    let changed = false
    for (let i = r1; i <= r2; i++) {
      for (let j = c1; j <= c2; j++) {
        if (data[i][j] !== '') {
          data[i][j] = ''
          changed = true
        }
      }
    }
    if (!changed) return
    // 清除范围包含正在编辑的 cell 时卸载 input：input 用 defaultValue（只在挂载时生效），
    // 不卸载的话 blur 提交（_commitEditingCell 读 input.value）会把清除前的旧文本写回
    if (
      this._editingCell &&
      this._editingCell.row >= r1 &&
      this._editingCell.row <= r2 &&
      this._editingCell.col >= c1 &&
      this._editingCell.col <= c2
    ) {
      this._editingCell = null
    }
    // 只更新 tableData，不影响 transform
    this._applyTableChange(data)
  }

  /**
   * 合并单元格：基于当前矩形选区（面积 > 1），Excel 式——只保留 anchor 内容，其余清空。
   * 与新选区相交的旧合并区直接移除（合并区内部 cell 恒为空，数据安全，比 Excel 的禁止重叠更宽容）。
   * _selection 保持为合并区（高亮查看结果）。
   */
  mergeCells() {
    const s = this._selection
    if (!s) return
    const data = this.properties.tableData
    const maxRow = data.length - 1
    const maxCol = (data[0] || []).length - 1
    // 防御：选区 clamp 到表格维度
    const row1 = Math.max(0, Math.min(s.row1, maxRow))
    const col1 = Math.max(0, Math.min(s.col1, maxCol))
    const row2 = Math.max(0, Math.min(s.row2, maxRow))
    const col2 = Math.max(0, Math.min(s.col2, maxCol))
    // 面积 1 不合并
    if (row2 - row1 + 1 < 2 && col2 - col1 + 1 < 2) return
    const newMerges = this._getMerges().filter(
      (m) => !(m.row1 <= row2 && m.row2 >= row1 && m.col1 <= col2 && m.col2 >= col1)
    )
    newMerges.push({ row1, col1, row2, col2 })
    // Excel 式：清空非 anchor cell 的内容与样式（与内容清空平行）
    const newData = data.map((r) => [...r])
    const newStyles = this._cloneCellStyles()
    for (let i = row1; i <= row2; i++) {
      for (let j = col1; j <= col2; j++) {
        if (i !== row1 || j !== col1) {
          newData[i][j] = ''
          newStyles[i][j] = null
        }
      }
    }
    this._contextCell = null
    this._applyTableChange(newData, null, { mergedCells: newMerges, cellStyles: newStyles })
  }

  /** 取消合并：移除右键 cell（_contextCell）所在合并区，内容保留在 anchor */
  unmergeCells() {
    const c = this._contextCell
    if (!c) return
    const m = this._findMerge(c.row, c.col)
    if (!m) return
    const newMerges = this._getMerges().filter(
      (x) => !(x.row1 === m.row1 && x.col1 === m.col1 && x.row2 === m.row2 && x.col2 === m.col2)
    )
    this._contextCell = null
    this._selection = null
    this._applyTableChange(this._cloneTableData(), null, { mergedCells: newMerges })
  }

  /**
   * 提交表格变更：一次 dispatch 同时更新 tableData + transform + 行列比例（数组 key），
   * handlePropsChange 支持 Array.isArray(key) 分支，一次 setState + 一次 history。
   * 数组 key 不会触发 pushState 里 key === 'transform' 的分支，
   * 因此主动 dispatch component_show_resizer 让 ViewResizable 刷新包围手柄
   */
  _applyTableChange(newData, newTransform, ratios) {
    // 同步本地 properties（dispatch 后 componentWillReceiveProps 会替换为新对象）。
    // newData 可为 null（纯样式变更，不重写 tableData）
    const key = []
    const value = []
    if (newData) {
      this.properties.tableData = newData
      key.push('tableData')
      value.push(newData.map((row) => [...row]))
    }
    if (newTransform) {
      this.properties.transform = Object.assign({}, newTransform)
      key.push('transform')
      value.push(Object.assign({}, newTransform))
    }
    if (ratios) {
      if (ratios.rowRatios) {
        this.properties.rowRatios = ratios.rowRatios
        key.push('rowRatios')
        value.push([...ratios.rowRatios])
      }
      if (ratios.colRatios) {
        this.properties.colRatios = ratios.colRatios
        key.push('colRatios')
        value.push([...ratios.colRatios])
      }
      if (ratios.mergedCells) {
        this.properties.mergedCells = ratios.mergedCells
        key.push('mergedCells')
        value.push(ratios.mergedCells.map((m) => ({ ...m })))
      }
      if (ratios.cellStyles) {
        this.properties.cellStyles = ratios.cellStyles
        key.push('cellStyles')
        value.push(ratios.cellStyles.map((r) => r.map((s) => (s ? { ...s } : null))))
      }
    }
    if (!key.length) return
    Event.dispatch(component_properties_change, {
      target: this,
      key,
      value,
    })
    // 刷新 resize 手柄包围框（同时会重新读取 getMinSize）
    Event.dispatch(component_show_resizer, this)
    // 通知面板控件刷新（样式/选区变化后的兜底站点：行列操作、clearText、合并、样式应用）
    this._notifyCellSelection()
    this.forceUpdate()
  }

  // ==================== Render ====================

  getWrapperClassName() {
    return super.getWrapperClassName() + ' view-table-container'
  }

  renderContent() {
    const { tableData } = this.properties
    if (!tableData || !tableData.length) return null

    const sel = this._selection
    const edit = this._editingCell
    // 行/列比例（显示层叠加拖线 delta），驱动 tr/td 尺寸与手柄位置
    const rowRatios = this._getDisplayRowRatios()
    const colRatios = this._getDisplayColRatios()
    // 编辑模式（cell 选择 / input 编辑）：渲染内部行/列分隔线手柄，外边界归组件 resize 手柄
    const inEditMode = !!(edit || this._cellMode)

    return (
      <div className="view-table-wrap">
        <table className="view-table">
          {/* colgroup 显式定义列宽：table-layout: fixed 下列宽由第一行决定，
              第一行合并区（colspan）会被浏览器均分到各列，colgroup 优先级更高可保比例 */}
          <colgroup>
            {colRatios.map((v, ci) => (
              <col key={'col' + ci} style={{ width: `${v * 100}%` }} />
            ))}
          </colgroup>
          <tbody>
            {tableData.map((row, ri) => (
              // 行高按比例分配（相对表格高度），有内容的行不挤压其他行（内容由 td overflow hidden 裁剪）
              <tr key={ri} style={{ height: `${rowRatios[ri] * 100}%` }}>
                {row.map((cell, ci) => {
                  // 合并区：被覆盖的 cell 不渲染（rowSpan 占据网格位），anchor 带 rowSpan/colSpan
                  const merge = this._findMerge(ri, ci)
                  if (merge && (ri !== merge.row1 || ci !== merge.col1)) return null
                  // 单元格样式（合并区解析到 anchor；color/字号/字重/字族继承到 cell-content）
                  const cellStyle = this.getCellStyle(ri, ci)
                  const tdStyle = { width: `${colRatios[ci] * 100}%` }
                  if (cellStyle) {
                    if (cellStyle.bg) tdStyle.background = cellStyle.bg
                    if (cellStyle.color) tdStyle.color = cellStyle.color
                    if (cellStyle.size) tdStyle.fontSize = cellStyle.size + 'px'
                    if (cellStyle.bold) tdStyle.fontWeight = 'bold'
                    if (cellStyle.fontFamily) tdStyle.fontFamily = cellStyle.fontFamily
                  }
                  const isEditing = edit && edit.row === ri && edit.col === ci
                  const inSel = this._isInSelection(ri, ci)
                  // anchor（选区起点）：白底蓝框；其余选区 cell：浅蓝
                  const isAnchor = !!sel && sel.row1 === ri && sel.col1 === ci
                  let className = ''
                  if (isEditing) className = 'cell-editing'
                  else if (inSel) className = isAnchor ? 'cell-anchor' : 'cell-selected'

                  return (
                    <td
                      key={ci}
                      data-row={ri}
                      data-col={ci}
                      className={className}
                      style={tdStyle}
                      rowSpan={merge ? merge.row2 - merge.row1 + 1 : undefined}
                      colSpan={merge ? merge.col2 - merge.col1 + 1 : undefined}
                      data-drag={edit || this._cellMode ? 'false' : undefined}
                    >
                    {isEditing ? (
                      <input
                        ref="cellInput"
                        className="cell-input"
                        defaultValue={cell}
                        onBlur={this._handleInputBlur}
                        onKeyDown={this._handleInputKeyDown}
                        data-event="ignore"
                        data-drag="false"
                      />
                    ) : (
                      // 内容绝对定位：不参与行高计算（CSS 表格行高永远 ≥ 内容高度），
                      // 行高严格由表格均分决定，内容超出由 overflow hidden 裁剪
                      <div className="cell-content">{cell}</div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {inEditMode && (
        // 覆盖层 pointer-events: none 不拦截事件，只有手柄（pointer-events: auto）响应；
        // 只渲染内部线（n-1/m-1），外边界归组件 resize 手柄管理
        <div className="table-resize-layer">
          {/* 快速插入按钮：行左侧 +（该行上方插入行）、第一行上方每列 +（该列左侧插入列） */}
          {rowRatios.map((item, ri) => (
            <div
              key={'ri' + ri}
              className="quick-insert-btn row"
              data-quick-insert="row"
              data-index={ri}
              data-drag="false"
              style={{ top: `${(this._cumRatio(rowRatios, ri) + rowRatios[ri] / 2) * 100}%` }}
            >
              <span className="quick-insert-icon" />
            </div>
          ))}
          {colRatios.map((item, ci) => (
            <div
              key={'ci' + ci}
              className="quick-insert-btn col"
              data-quick-insert="col"
              data-index={ci}
              data-drag="false"
              style={{ left: `${(this._cumRatio(colRatios, ci) + colRatios[ci] / 2) * 100}%` }}
            >
              <span className="quick-insert-icon" />
            </div>
          ))}
          {rowRatios.slice(0, -1).map((item, ri) => (
            <div
              key={'row' + ri}
              className="table-resize-line row-line"
              data-resize-line="row"
              data-index={ri}
              data-drag="false"
              style={{ top: `${this._cumRatio(rowRatios, ri + 1) * 100}%` }}
            >
              <span className="resize-line-bar" />
            </div>
          ))}
          {colRatios.slice(0, -1).map((item, ci) => (
            <div
              key={'col' + ci}
              className="table-resize-line col-line"
              data-resize-line="col"
              data-index={ci}
              data-drag="false"
              style={{ left: `${this._cumRatio(colRatios, ci + 1) * 100}%` }}
            >
              <span className="resize-line-bar" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
}
