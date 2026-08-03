/**
 *  created by yaojun on 2019/8/3
 *
 */
import React from 'react';
import ViewController from './ViewController';
import { setCurrentEditor } from '../global/instance';
import Event from '../Base/Event';
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
} from '../util/actions';
import './ViewTable.scss';

export default class ViewTable extends ViewController {
  constructor(props) {
    super(props);
    // 矩形选区 { row1, col1, row2, col2 } 已归一化（min/max），(row1,col1) 为 anchor
    this._selection = null;
    // cell 选择模式：双击 cell 进入（选中、可单击切换、可拖动框选）；双击已选中 cell 进入 input 编辑
    this._cellMode = false;
    this._editingCell = null;
    this._contextCell = null;
    // 编辑模式下的框选状态（按下时挂 document 监听，区分单击切换编辑 / 拖动框选）
    this._pendingCell = null;
    this._mouseDownPos = null;
    this._mouseMoved = false;
    // 编辑态右键标记：右键时 input blur 不退出编辑、不清空选区（保证框选后右键批量操作生效）
    this._rightClicking = false;
  }

  // ==================== EventBus handlers ====================
  // 注意：ContextMenu dispatch 的 target 是右键时刻的 properties 引用，
  // 而 this.properties 会被 componentWillReceiveProps 替换成新对象，
  // 因此不能用引用比较，必须用 id 比较（id 稳定不变）

  _handleInsertRowAbove = (target) => {
    if (!target || target.id !== this.properties.id) return;
    if (this._contextCell) this.insertRowAbove(this._contextCell.row);
  };

  _handleInsertRowBelow = (target) => {
    if (!target || target.id !== this.properties.id) return;
    if (this._contextCell) this.insertRowBelow(this._contextCell.row);
  };

  _handleInsertColLeft = (target) => {
    if (!target || target.id !== this.properties.id) return;
    if (this._contextCell) this.insertColLeft(this._contextCell.col);
  };

  _handleInsertColRight = (target) => {
    if (!target || target.id !== this.properties.id) return;
    if (this._contextCell) this.insertColRight(this._contextCell.col);
  };

  _handleDeleteRow = (target) => {
    if (!target || target.id !== this.properties.id) return;
    this.deleteRow();
  };

  _handleDeleteCol = (target) => {
    if (!target || target.id !== this.properties.id) return;
    this.deleteCol();
  };

  _handleClearText = (target) => {
    if (!target || target.id !== this.properties.id) return;
    this.clearText();
  };

  /**
   * 选中变化（点击画布空白/切换组件）时退出选择模式并清空选区。
   * 注意：不在这里 dispatch component_close_edit_mode —— 该事件在 NeedResponderAction
   * 中，取消选中（component_empty）时 firstResponder 已为 null 会被静默丢弃（且打日志）。
   * resize 手柄由 ViewResizable 管理：下次 component_active 时自动 show(true) 恢复。
   */
  _handleInactive = () => {
    this._cellMode = false;
    this._selection = null;
    this._pendingCell = null;
    this._mouseMoved = false;
  };

  // ==================== Lifecycle ====================

  componentDidMount() {
    super.componentDidMount();
    // 容器可编程聚焦（tabindex=-1 不参与 Tab 导航），用于接收键盘扩展选区（框选态）
    this.refs.container.tabIndex = -1;
    this.refs.container.addEventListener('keydown', this._handleContainerKeyDown, false);
    // 原生监听 contextmenu：在 ContextMenu.js（layout-editor-view）解析菜单之前
    // 设置 _contextCell，保证 getContextMenu() 的 check() 正确生效
    this.refs.container.addEventListener('contextmenu', this._handleNativeContextMenu, false);
    Event.listen(component_inactive, this._handleInactive);
    // 点击画布空白取消选中走的是 component_empty（setFirstResponder(null)），
    // 必须同时监听才能退出选择模式
    Event.listen(component_empty, this._handleInactive);
    Event.listen(table_insert_row_above, this._handleInsertRowAbove);
    Event.listen(table_insert_row_below, this._handleInsertRowBelow);
    Event.listen(table_insert_col_left, this._handleInsertColLeft);
    Event.listen(table_insert_col_right, this._handleInsertColRight);
    Event.listen(table_delete_row, this._handleDeleteRow);
    Event.listen(table_delete_col, this._handleDeleteCol);
    Event.listen(table_clear_text, this._handleClearText);
  }

  componentDidUpdate() {
    // 进入编辑模式后自动聚焦 input
    if (this._editingCell && this.refs.cellInput) {
      const input = this.refs.cellInput;
      input.focus();
      input.select();
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    clearTimeout(this._switchingTimer);
    document.removeEventListener('mousemove', this._handleCellMouseMove);
    document.removeEventListener('mouseup', this._handleCellMouseUp);
    if (this.refs.container) {
      this.refs.container.removeEventListener('keydown', this._handleContainerKeyDown, false);
      this.refs.container.removeEventListener('contextmenu', this._handleNativeContextMenu, false);
    }
    Event.destroy(component_inactive, this._handleInactive);
    Event.destroy(component_empty, this._handleInactive);
    Event.destroy(table_insert_row_above, this._handleInsertRowAbove);
    Event.destroy(table_insert_row_below, this._handleInsertRowBelow);
    Event.destroy(table_insert_col_left, this._handleInsertColLeft);
    Event.destroy(table_insert_col_right, this._handleInsertColRight);
    Event.destroy(table_delete_row, this._handleDeleteRow);
    Event.destroy(table_delete_col, this._handleDeleteCol);
    Event.destroy(table_clear_text, this._handleClearText);
    setCurrentEditor(null);
  }

  // ==================== Selection helpers ====================

  /** 设置选区并归一化（anchor 始终为 row1,col1） */
  _setSelection(r1, c1, r2, c2) {
    this._selection = {
      row1: Math.min(r1, r2),
      col1: Math.min(c1, c2),
      row2: Math.max(r1, r2),
      col2: Math.max(c1, c2),
    };
  }

  _isInSelection(ri, ci) {
    const s = this._selection;
    return !!s && ri >= s.row1 && ri <= s.row2 && ci >= s.col1 && ci <= s.col2;
  }

  _rangeRows() {
    if (!this._selection) return null;
    return { from: this._selection.row1, count: this._selection.row2 - this._selection.row1 + 1 };
  }

  _rangeCols() {
    if (!this._selection) return null;
    return { from: this._selection.col1, count: this._selection.col2 - this._selection.col1 + 1 };
  }

  _focusContainer() {
    const c = this.refs.container;
    if (c && document.activeElement !== c) c.focus();
  }

  // ==================== Drag ====================
  // 非编辑模式是纯组件交互（基类 onDragStart 处理选中/拖拽移动），无 cell 选区；
  // cell 选区只在编辑模式（双击进入）存在：单击切换编辑、拖动框选多 cell

  // ==================== 键盘扩展选区（非编辑模式） ====================

  _handleContainerKeyDown = (e) => {
    // 编辑态由 input 处理，容器 keydown 不拦截
    if (this._editingCell) return;
    const data = this.properties.tableData;
    const rows = data.length;
    const cols = (data[0] || []).length;

    // Ctrl+A 全选
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      e.stopPropagation();
      this._setSelection(0, 0, rows - 1, cols - 1);
      this.forceUpdate();
      return;
    }
    // Escape 取消框选
    if (e.key === 'Escape' && this._selection) {
      e.preventDefault();
      e.stopPropagation();
      this._selection = null;
      this.forceUpdate();
      return;
    }
    // Shift+方向键扩展选区（anchor 固定，扩展角移动）
    const DIRS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (e.shiftKey && DIRS[e.key] && this._selection) {
      e.preventDefault();
      e.stopPropagation();
      const [dr, dc] = DIRS[e.key];
      const row2 = Math.min(rows - 1, Math.max(0, this._selection.row2 + dr));
      const col2 = Math.min(cols - 1, Math.max(0, this._selection.col2 + dc));
      this._setSelection(this._selection.row1, this._selection.col1, row2, col2);
      this.forceUpdate();
    }
  };

  /** 原生 contextmenu 监听：在 ContextMenu.js 之前设置右键 cell */
  _handleNativeContextMenu = (e) => {
    // 右键完成，清除标记（blur 已发生且被忽略）
    this._rightClicking = false;
    const target = e.target;
    if (!target || !target.closest) return;
    const td = target.closest('td');
    if (!td) return;
    const row = parseInt(td.dataset.row, 10);
    const col = parseInt(td.dataset.col, 10);
    if (!isNaN(row) && !isNaN(col)) {
      this._contextCell = { row, col };
    }
  };

  // ==================== Cell editing ====================

  /**
   * @override ViewController.onDBClick
   */
  onDBClick(e) {
    if (this._parent && this._parent.isLockChildren) {
      super.onDBClick(e);
      return;
    }
    e.stopPropagation();

    // 找到被双击的 cell
    const td = e.target.closest('td');
    if (!td) {
      super.onDBClick(e);
      return;
    }
    const row = parseInt(td.dataset.row, 10);
    const col = parseInt(td.dataset.col, 10);
    if (isNaN(row) || isNaN(col)) return;

    if (this._editingCell) {
      // 已在 input 编辑：双击切换编辑到该 cell
      // 如果已经在编辑同一个 cell，不做重复操作
      if (this._editingCell.row === row && this._editingCell.col === col) return;
      // 如果正在编辑其他 cell，先保存
      this._commitEditingCell();
      this._selection = { row1: row, col1: col, row2: row, col2: col };
      this._editingCell = { row, col };
      this.forceUpdate();
      return;
    }

    if (this._cellMode) {
      // 选择模式中双击：进入 input 编辑该 cell
      this._selection = { row1: row, col1: col, row2: row, col2: col };
      this._editingCell = { row, col };
      setCurrentEditor(this);
      Event.dispatch(component_edit_mode);
      this.forceUpdate();
      return;
    }

    // 非编辑模式双击：进入 cell 选择模式并选中该 cell（不进入 input 编辑），
    // 这样可立即拖动多选 cell；再次双击选中 cell 才进入编辑
    this._cellMode = true;
    this._selection = { row1: row, col1: col, row2: row, col2: col };
    this._focusContainer();
    // 选择模式下隐藏 resize 手柄（正在操作 cell）
    Event.dispatch(component_edit_mode);
    this.forceUpdate();
  }

  /** 提交编辑：读取 input 值写回 tableData 并 dispatch 变更事件 */
  _commitEditingCell() {
    if (!this._editingCell) return;
    const { row, col } = this._editingCell;
    const input = this.refs.cellInput;
    const newValue = input ? input.value : '';
    const oldValue = this.properties.tableData[row][col];

    if (newValue !== oldValue) {
      // 深拷贝 tableData，更新目标 cell
      const newTableData = this.properties.tableData.map((r) => [...r]);
      newTableData[row][col] = newValue;
      this.properties.tableData = newTableData;

      // 通知属性变更（用于撤销历史记录）
      Event.dispatch(component_properties_change, {
        target: this,
        key: 'tableData',
        value: newTableData.map((r) => [...r]),
      });
    }
  }

  setEditorBlur() {
    this._commitEditingCell();
    this._editingCell = null;
    // 退出 input 编辑后取消 cell 选中高亮
    this._selection = null;
    // 不 dispatch component_close_edit_mode：仍在选择模式手柄保持隐藏，
    // 手柄由 ViewResizable 在下次 component_active 时自动恢复显示
    this.forceUpdate();
  }

  // ==================== Input event handlers ====================

  /**
   * 编辑模式下按下 cell（React 委托，onMouseDown）：
   * 编辑模式下 td 带 data-drag="false"，Draggable 直接 return（不阻止冒泡），
   * 事件能到达 document，React 委托可以收到。
   * 按下时不立即切换，挂 document 监听区分：单击 → 切换编辑 cell；拖动 → 框选多 cell
   */
  handleCellMouseDown = (e) => {
    e.stopPropagation();
    // 仅在选择模式（_cellMode）或 input 编辑中处理 cell 交互
    if (!this._editingCell && !this._cellMode) return;
    // 右键（button=2）：只打开菜单，标记 _rightClicking 让 blur 忽略（不退出编辑、不清空选区）
    if (e.button !== 0) {
      this._rightClicking = true;
      return;
    }
    const target = e.target;
    const td = target && target.closest ? target.closest('td') : null;
    if (!td) return;
    const row = parseInt(td.dataset.row, 10);
    const col = parseInt(td.dataset.col, 10);
    if (isNaN(row) || isNaN(col)) return;
    // 点击当前编辑 cell：保持编辑
    if (this._editingCell && this._editingCell.row === row && this._editingCell.col === col) return;
    this._pendingCell = { row, col };
    this._mouseDownPos = { x: e.clientX, y: e.clientY };
    this._mouseMoved = false;
    document.addEventListener('mousemove', this._handleCellMouseMove);
    document.addEventListener('mouseup', this._handleCellMouseUp);
  };

  /** 编辑模式按下后的 mousemove：超过阈值开始框选，实时扩展选区（不退出编辑模式） */
  _handleCellMouseMove = (e) => {
    if (!this._pendingCell) return;
    const dx = Math.abs(e.clientX - this._mouseDownPos.x);
    const dy = Math.abs(e.clientY - this._mouseDownPos.y);
    // 5px 阈值内视为单击
    if (dx + dy < 5) return;
    this._mouseMoved = true;
    const target = e.target;
    const td = target && target.closest ? target.closest('td') : null;
    if (td) {
      const row = parseInt(td.dataset.row, 10);
      const col = parseInt(td.dataset.col, 10);
      if (!isNaN(row) && !isNaN(col)) {
        this._setSelection(this._pendingCell.row, this._pendingCell.col, row, col);
        this.forceUpdate();
      }
    }
  };

  /** 按下后的 mouseup：单击 → 选中/切换编辑；拖动 → 框选完成 */
  _handleCellMouseUp = () => {
    document.removeEventListener('mousemove', this._handleCellMouseMove);
    document.removeEventListener('mouseup', this._handleCellMouseUp);
    if (this._pendingCell && !this._mouseMoved) {
      // 单击
      const { row, col } = this._pendingCell;
      if (this._editingCell) {
        // input 编辑中单击其他 cell：切换编辑 cell
        // 切换期间旧 input 会触发 blur，标记 _switching 让 blur 忽略，避免误退出编辑模式
        this._switching = true;
        this._commitEditingCell();
        this._selection = { row1: row, col1: col, row2: row, col2: col };
        this._editingCell = { row, col };
        this.forceUpdate();
        // blur 在 mousedown 的默认行为阶段触发（早于下一个宏任务），随后清除标记
        clearTimeout(this._switchingTimer);
        this._switchingTimer = setTimeout(() => {
          this._switching = false;
        }, 0);
      } else if (this._cellMode) {
        // 选择模式中单击：选中该 cell（单 cell 选区，不进入 input 编辑）
        this._selection = { row1: row, col1: col, row2: row, col2: col };
        this._focusContainer();
        this.forceUpdate();
      }
    } else if (this._pendingCell && this._mouseMoved) {
      // 框选完成：不退出编辑模式（编辑 input 保持、resize 手柄保持隐藏），
      // 容器聚焦以便键盘扩展选区（Ctrl+A / Shift+方向键 / Escape）
      this._focusContainer();
    }
    this._pendingCell = null;
    this._mouseMoved = false;
  };

  _handleInputBlur = (e) => {
    // 切换 cell 期间（旧 input 失焦）忽略，避免误退出编辑模式；
    // 按下待定状态（_pendingCell）也忽略，等 mouseup 决定是单击切换还是框选；
    // 编辑态右键（_rightClicking）也忽略，保证框选后右键批量操作时选区不被清空
    if (this._switching || this._pendingCell || this._rightClicking) return;
    // 记录 blur 来源，延迟判断：只有 blur 的 input 仍是当前编辑 input 时才退出编辑
    this._blurredInput = e.target;
    setTimeout(() => {
      if (this._editingCell && this.refs.cellInput === this._blurredInput) {
        this.setEditorBlur();
      }
      this._blurredInput = null;
    }, 0);
  };

  _handleInputKeyDown = (e) => {
    const { row, col } = this._editingCell;
    const data = this.properties.tableData;
    const maxRow = data.length - 1;
    const maxCol = (data[0] || []).length - 1;

    const moveTo = (newRow, newCol) => {
      if (newRow < 0 || newRow > maxRow || newCol < 0 || newCol > maxCol) return;
      e.preventDefault();
      // 切换 cell 期间旧 input 会触发 blur，标记 _switching 让 blur 忽略
      this._switching = true;
      this._commitEditingCell();
      this._selection = { row1: newRow, col1: newCol, row2: newRow, col2: newCol };
      this._editingCell = { row: newRow, col: newCol };
      this.forceUpdate();
      clearTimeout(this._switchingTimer);
      this._switchingTimer = setTimeout(() => {
        this._switching = false;
      }, 0);
    };

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.setEditorBlur();
        break;
      case 'Escape':
        e.preventDefault();
        // 放弃编辑，不保存
        this._editingCell = null;
        Event.dispatch(component_close_edit_mode);
        this.forceUpdate();
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) moveTo(row, col - 1);
          else if (row > 0) moveTo(row - 1, maxCol);
        } else {
          if (col < maxCol) moveTo(row, col + 1);
          else if (row < maxRow) moveTo(row + 1, 0);
        }
        break;
      case 'ArrowUp':
        if (row > 0) moveTo(row - 1, col);
        break;
      case 'ArrowDown':
        if (row < maxRow) moveTo(row + 1, col);
        break;
      default:
        break;
    }
  };

  // ==================== Min size (resize 同步) ====================

  /**
   * 内容最小尺寸 = 行列数 × 单元格最小尺寸（td height 24 / 列最小宽 18 + border）
   * resize 时 ViewResizable 会限制组件不能小于此尺寸，避免内容溢出不同步
   */
  getMinSize() {
    const data = this.properties.tableData;
    const rows = data.length;
    const cols = (data[0] || []).length;
    // 每列最小宽：左右 padding 8*2 + border 2 = 18；每行最小高：td height 24（border-box）
    return {
      width: cols * 18 + 2,
      height: rows * 24 + 2,
    };
  }

  // ==================== Context menu ====================

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
        name: '清除文本',
        action: table_clear_text,
        check: () => !!this._selection || !!this._contextCell || !!this._editingCell,
      },
      { type: 'line' },
    ];
    return [...tableMenus, ...super.getContextMenu()];
  }

  // ==================== Table operations ====================

  _cloneTableData() {
    return this.properties.tableData.map((row) => [...row]);
  }

  /** 基于当前 transform 生成新宽高（x/y/rotation 不变） */
  _updateTransform(t, width, height) {
    return { x: t.x, y: t.y, width, height, rotation: t.rotation };
  }

  /** 当前平均行高（含 border） */
  _avgRowHeight() {
    return this.properties.transform.height / this.properties.tableData.length;
  }

  /** 当前平均列宽（含 border） */
  _avgColWidth() {
    return this.properties.transform.width / (this.properties.tableData[0] || []).length;
  }

  insertRowAbove(row) {
    const data = this._cloneTableData();
    const t = this.properties.transform;
    // 插入行：高度增加一个平均行高
    const avgH = this._avgRowHeight();
    data.splice(row, 0, new Array((data[0] || []).length).fill(''));
    this._selection = null;
    this._contextCell = null;
    this._editingCell = null;
    this._applyTableChange(data, this._updateTransform(t, t.width, t.height + avgH));
  }

  insertRowBelow(row) {
    const data = this._cloneTableData();
    const t = this.properties.transform;
    const avgH = this._avgRowHeight();
    data.splice(row + 1, 0, new Array((data[0] || []).length).fill(''));
    this._selection = null;
    this._contextCell = null;
    this._editingCell = null;
    this._applyTableChange(data, this._updateTransform(t, t.width, t.height + avgH));
  }

  insertColLeft(col) {
    const data = this._cloneTableData();
    const t = this.properties.transform;
    // 插入列：宽度增加一个平均列宽
    const avgW = this._avgColWidth();
    data.forEach((row) => row.splice(col, 0, ''));
    this._selection = null;
    this._contextCell = null;
    this._editingCell = null;
    this._applyTableChange(data, this._updateTransform(t, t.width + avgW, t.height));
  }

  insertColRight(col) {
    const data = this._cloneTableData();
    const t = this.properties.transform;
    const avgW = this._avgColWidth();
    data.forEach((row) => row.splice(col + 1, 0, ''));
    this._selection = null;
    this._contextCell = null;
    this._editingCell = null;
    this._applyTableChange(data, this._updateTransform(t, t.width + avgW, t.height));
  }

  /** 删除行：优先框选区域（批量），无选区时基于右键 cell（_contextCell）删除单行 */
  deleteRow() {
    let r = this._rangeRows();
    if (!r && this._contextCell) r = { from: this._contextCell.row, count: 1 };
    if (!r) return;
    // 至少保留 1 行
    if (this.properties.tableData.length - r.count < 1) return;
    const t = this.properties.transform;
    const avgH = this._avgRowHeight();
    const data = this._cloneTableData();
    data.splice(r.from, r.count);
    const minH = data.length * 24 + 2;
    this._selection = null;
    this._contextCell = null;
    this._editingCell = null;
    this._applyTableChange(data, this._updateTransform(t, t.width, Math.max(minH, t.height - avgH * r.count)));
  }

  /** 删除列：优先框选区域（批量），无选区时基于右键 cell（_contextCell）删除单列 */
  deleteCol() {
    let c = this._rangeCols();
    if (!c && this._contextCell) c = { from: this._contextCell.col, count: 1 };
    if (!c) return;
    // 至少保留 1 列
    if ((this.properties.tableData[0] || []).length - c.count < 1) return;
    const t = this.properties.transform;
    const avgW = this._avgColWidth();
    const data = this._cloneTableData();
    data.forEach((row) => row.splice(c.from, c.count));
    const minW = (data[0] || []).length * 18 + 2;
    this._selection = null;
    this._contextCell = null;
    this._editingCell = null;
    this._applyTableChange(data, this._updateTransform(t, Math.max(minW, t.width - avgW * c.count), t.height));
  }

  canDeleteRow() {
    if (this._selection) {
      return this.properties.tableData.length - (this._selection.row2 - this._selection.row1 + 1) >= 1;
    }
    return !!this._contextCell && this.properties.tableData.length > 1;
  }

  canDeleteCol() {
    if (this._selection) {
      return (this.properties.tableData[0] || []).length - (this._selection.col2 - this._selection.col1 + 1) >= 1;
    }
    return !!this._contextCell && (this.properties.tableData[0] || []).length > 1;
  }

  /** 清除文本：清空框选区域（优先）/右键 cell/当前编辑 cell 的内容 */
  clearText() {
    let r1, c1, r2, c2;
    if (this._selection) {
      r1 = this._selection.row1;
      c1 = this._selection.col1;
      r2 = this._selection.row2;
      c2 = this._selection.col2;
    } else if (this._contextCell) {
      r1 = r2 = this._contextCell.row;
      c1 = c2 = this._contextCell.col;
    } else if (this._editingCell) {
      r1 = r2 = this._editingCell.row;
      c1 = c2 = this._editingCell.col;
    } else {
      return;
    }
    const data = this._cloneTableData();
    let changed = false;
    for (let i = r1; i <= r2; i++) {
      for (let j = c1; j <= c2; j++) {
        if (data[i][j] !== '') {
          data[i][j] = '';
          changed = true;
        }
      }
    }
    if (!changed) return;
    // 只更新 tableData，不影响 transform
    this._applyTableChange(data);
  }

  /**
   * 提交表格变更：一次 dispatch 同时更新 tableData + transform（数组 key），
   * handlePropsChange 支持 Array.isArray(key) 分支，一次 setState + 一次 history。
   * 数组 key 不会触发 pushState 里 key === 'transform' 的分支，
   * 因此主动 dispatch component_show_resizer 让 ViewResizable 刷新包围手柄
   */
  _applyTableChange(newData, newTransform) {
    // 同步本地 properties（dispatch 后 componentWillReceiveProps 会替换为新对象）
    this.properties.tableData = newData;
    const key = ['tableData'];
    const value = [newData.map((row) => [...row])];
    if (newTransform) {
      this.properties.transform = Object.assign({}, newTransform);
      key.push('transform');
      value.push(Object.assign({}, newTransform));
    }
    Event.dispatch(component_properties_change, {
      target: this,
      key,
      value,
    });
    // 刷新 resize 手柄包围框（同时会重新读取 getMinSize）
    Event.dispatch(component_show_resizer, this);
    this.forceUpdate();
  }

  // ==================== Render ====================

  getWrapperClassName() {
    return super.getWrapperClassName() + ' view-table-container';
  }

  renderContent() {
    const { tableData } = this.properties;
    if (!tableData || !tableData.length) return null;

    const sel = this._selection;
    const edit = this._editingCell;

    return (
      <table className="view-table">
        <tbody>
          {tableData.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const isEditing = edit && edit.row === ri && edit.col === ci;
                const inSel = this._isInSelection(ri, ci);
                // anchor（选区起点）：白底蓝框；其余选区 cell：浅蓝
                const isAnchor = !!sel && sel.row1 === ri && sel.col1 === ci;
                let className = '';
                if (isEditing) className = 'cell-editing';
                else if (inSel) className = isAnchor ? 'cell-anchor' : 'cell-selected';

                return (
                  <td
                    key={ci}
                    data-row={ri}
                    data-col={ci}
                    className={className}
                    data-drag={edit || this._cellMode ? 'false' : undefined}
                    onMouseDown={edit || this._cellMode ? this.handleCellMouseDown : undefined}
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
                      cell
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
