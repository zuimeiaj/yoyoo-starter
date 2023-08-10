/**
 * 组件选中事件
 * @type {string}
 */
export const component_active = 'component/active';
/**
 * 组件取消选中触发事件
 * @type {string}
 */
export const component_inactive = 'component/inactive';
/**
 * 组件被拖拽,缩放事件
 * @type {string}
 */
export const component_drag = 'component/drag';
//选中之前
export const component_drag_before = 'component/dragbefore';
/**
 * 组件拖拽结束时触发
 * @type {string}
 */
export const component_dragend = 'component/dragend';
/**
 * 缩放结束
 * @type {string}
 */
export const component_resize_end = 'component/resizeend';
export const component_resize_start = 'component/resizestart';
/**
 * 鼠标进入视图
 * @type {string}
 */
export const component_enter = 'component/enter';
/**
 * 鼠标离开视图
 * @type {string}
 */
export const component_leave = 'component/leave';
/**
 * 开启元素选择模式
 * @type {string}
 */
export const component_picker_mode = 'component/open_picker_mode';
/**
 * 当选择到元素后
 * @type {string}
 */
export const component_picker_picked = 'component/picker_picked';
/**
 * 关闭元素选择模式
 * @type {string}
 */
export const component_picker_mode_close = 'component/close_picker_mode';
/**
 * component props change
 * @type {string}
 */
export const component_properties_change = 'compoent/propschange';
export const component_stroke_change = 'component/strokechange';
/**
 * 同步缩放控件
 * @type {string}
 */
export const component_show_resizer = 'component/showresizer';
/**
 * Text控件编辑模式
 * @type {string}
 */
export const component_edit_mode = 'component/editmode';
/**
 * Text关闭编辑模式
 * @type {string}
 */
export const component_close_edit_mode = 'component/closeeditmode';
/**
 * 全选
 * @type {string}
 */
export const context_checkall = 'context/checkall';
/**
 *
 * 菜单删除按钮被点击、Delete/Backspace键被按下，前提是组件已选中
 * @type {string}
 */
export const context_delete = 'context/delete';
/**
 * 菜单复制按钮、ctrl(cmd) + C 组合键
 * @type {string}
 */
export const context_copy = 'context/copy';
/**
 * 菜单剪切按钮、ctrl(cmd) + X 组合键
 * @type {string}
 */
export const context_cut = 'context/cut';
/**
 *菜单粘贴按钮、ctrl(cmd) + V 组件键
 * @type {string}
 */
export const context_paste = 'context/paste';
export const context_paste_mouse = 'context/paste_mouse';
export const context_paste_clear = 'context/paste_clear';
/**
 * 菜单复制粘贴按钮、ctrl(cmd) + D 组合键
 * @type {string}
 */
export const context_copypaste = 'context/copy_paste';
/**
 * 将区域选择的组件打包成一个Group
 *
 * @type {string}
 */
export const context_pack = 'context/pack';
/**
 * 删除打包的Group
 * @type {string}
 */
export const context_unpack = 'context/unpack';
export const context_save = 'contetx/save';
export const context_save_start = 'context/save_start';
export const context_save_success = 'context/save_success';
export const context_save_failed = 'context/save_failed';
/**
 * 隐藏当前元素，不可见
 * @type {string}
 */
export const context_hide = 'context/hide';
export const context_show = 'context/show';
/**
 * 锁定当前元素，让其不可拖拽
 * @type {string}
 */
export const context_lock = 'context/lock';
/**
 * 解锁
 * @type {string}
 */
export const context_unlock = 'context/unlock';
/**
 * 添加到素材库
 * @type {string}
 */
export const context_lib = 'context/lib';
/**
 * 撤销
 * @type {string}
 */
export const context_undo = 'context/undo';
/**
 * 重做
 * @type {string}
 */
export const context_redo = 'context/redo';
export const window_size_change = 'window/change';
/**
 * 隐藏菜单
 * @type {string}
 */
export const context_hide_menu = 'context/hidemenu';
export const context_shiftkey_press = 'context_shift/press';
export const context_hide_color_picker = 'context/hidecolorpicker';
/**
 * 编辑区域选区完成时触发
 * @type {string}
 */
export const selection_change = 'selection/change';
export const selection_update = 'selection/update';
export const selection_start = 'selection/start';
/**
 * 添加一个控件
 * @type {string}
 */
export const controllers_append = 'controllers/append';
/**
 * 删除一个控件
 * @type {string}
 */
export const controllers_delete = 'controllers/delete';
/**
 * 根据id删除
 * @type {string}
 */
export const controllers_delete_by_id = 'controllers/delete_id';
/**
 * 视图变化后
 * @type {string}
 */
export const controllers_change = 'controllers/change';
/**
 * 编辑区域选完成，选择到一组视图后触发，临时合并成一个group组件
 * @type {string}
 */
export const selection_group = 'selection/group';
export const selection_group_gid = 'selection/group_gid';
/**
 * 选择区域取消事件，没有选择到组件时触发
 * @type {string}
 */
export const selection_cancel = 'selection/cancel';
/**
 * 标尺加载后触发
 * @type {string}
 */
export const ruler_ready = 'ruler/ready';
/**
 * 编辑区域滚动条、鼠标滚动事件
 * @type {string}
 */
export const editor_scroll_change = 'editor/scrollchange';
/**
 * 拖动参考线时触发
 * @type {string}
 */
export const guide_move = 'guide/move';
export const guide_move_end = 'guide/move_end';
export const guide_display = 'guide/display';
export const guide_hide = 'guide/hide';
export const guide_toggle = 'guide/toggle_line';
/**
 *
 * 参考线组件初始化完成
 * @type {string}
 *
 */
export const guide_ready = 'guide/ready';
/**
 * 删除参考线
 * @type {string}
 */
export const guide_delete = 'guide/delete';
/**
 * 删除垂直
 * @type {string}
 */
export const guide_delete_v = 'guide/deletev';
/**
 * 清除水平
 * @type {string}
 */
export const guide_delete_h = 'guide/deleteh';
/**
 * 清空
 * @type {string}
 */
export const guide_delete_all = 'guide/clear';
/**
 * 组件视图初始化完成
 * @type {string}
 */
export const controllers_ready = 'controllers/ready';
/**
 * 主编辑区初始化完成
 * @type {string}
 */
export const viewport_ready = 'viewport/ready';
/**
 * 执行打包后的数据
 * @type {string}
 */
export const controllers_makegroup = 'controllers/makegroup';
export const controllers_apply_group = 'controllers/applygroup';
export const controllers_apply_ungroup = 'controllers/applyungroup';
/**
 * 执行拆包后的数据
 * @type {string}
 */
export const controllers_ungroup = 'controllers/ungroup';
/**
 * 显示取色器，传入当前Input，必须实现一个setValue函数
 * @type {string}
 */
export const colorpicker_active = 'colorpicker_active';
/**
 *添加副本
 * @type {string}
 */
export const outline_page_duplicate = 'outlinepages/duplicate';
export const context_page_update = 'context/page_update';
/**
 * 删除页面
 * @type {string}
 */
export const outline_page_delete = 'outlinepages/delete';
/**
 * 创建页面
 * @type {string}
 */
export const outline_page_create = 'outlinepages/create';
/**
 * 选择页面
 * @type {string}
 */
export const outline_page_select = 'outlinepages/select';
export const outline_page_select_end = 'outlinepages/select_end';
/**
 * 选中图层
 * @type {string}
 */
export const outline_coverage_select = 'outlinecoverage/select';
/**
 * 名称改变到时候
 * @type {string}
 */
export const outline_coverage_name_change = 'outlinename/change';
/**
 * 交换两个组件的位置
 * @type {string}
 */
export const component_swap = 'component/swap';
export const component_alignment = 'component/alignment';
export const context_increment_zoom = 'context/incrementzoom';
// 放大
export const context_zoom_in = 'context/zoom_in';
// 缩小
export const context_zoom_out = 'context/zoom_out';
export const context_zoom_level = 'context/zoom_level';
// Coverage
export const coverage_forward = 'coverage/forward';
export const coverage_backward = 'converage/backward';
export const coverage_front = 'coverage/front';
export const coverage_back = 'coverage/back';
export const coverage_backward_to = 'coverage/backwardto';
export const coverage_forward_to = 'coverage/forwardto';
export const coverage_picked_width_mode = 'coverage/picked_with_mode';
export const workspace_undo = 'workspace_undo';
export const workspace_redo = 'workspace_redo';
export const workspace_push = 'workspace_push';
export const workspace_setting_show = 'workspace_settings_show';
export const workspace_setting_hide = 'workspace_settings_hide';
export const canvas_draggable = 'canvas_draggable';
export const canvas_dragging = 'canvas_dragging';
export const canvas_dragstart = 'canvas_dragstart';
export const canvas_dragend = 'canvas_dragend';
export const scroller_move = 'scroller/move';
export const workspace_save_template = 'workspace/savetemplate';
export const workspace_save_master = 'workspace/savemaster';
export const workspace_part_master = 'workspace/partmaster';
export const workspace_save_template_success = 'workspace/savetemplate_success';
export const component_settings_changed = 'component/settings_changed';
export const component_settings_show = 'component/settings_show';
export const component_settings_lock = 'component/settings_lock';
export const component_sync_resizer = 'component/sync_resizer';
export const workspace_scroll_center = 'workspace_scroll_center';
export const preferences_configchange = 'preferences/configchange';
//  对齐后事件
/**
 * @param {Object} Transform
 * @type {string}
 */
export const component_snap_change = 'component/snapchange';
export const component_snap_change_end = 'component/snapchangeend';
// 解锁
export const component_lock_children = 'componnet/lockchildren';
/**
 * @param {GroupController} group 分组元素
 * @param {ViewController} child 子元素
 * @type {string}
 */
export const component_unlock_children = 'component/unlockchildren';
// 启动分组解锁模式，只元素
export const component_open_unlock_mode = 'component/unlockmode';
export const component_close_unlock_mode = 'component/closeunlockmode';
// 没有选择任何组件
export const component_empty = 'component/empty';
export const show_signup = 'app/signup';
export const show_create_project = 'app/create_project';
// 从服务器获取数据
export const pages_load_end = 'app/pages_load_end';
export const project_initialized = 'app/project_initialized';
export const refresh_project_list = 'app/refresh_project_list';
export const refresh_user_info = 'app/refresh_user_info';
export const refresh_project_name = 'app/refresh_project_name';
export const refresh_editor_config = 'app/refresh_eidtor_config';
export const editor_guides_change = 'app/editor_guides_change';
export const editor_cache_used = 'app/cache_used';
export const outline_closable_panel_show = 'app/show_outlin_closable_panel_show';
export const outline_closable_panel_hide = 'app/show_outlin_closable_panel_hide';
export const app_toggle_selection_type = 'app/toggle_selection_type';
export const context_mode_change = 'app/context/mode_change';
export const context_outline_menu_change = 'app/context/menu_change';
export const context_outline_delete_master = 'app/context/delete_master';
export const NeedResponderAction = {
  [component_inactive]: 1,
  [component_drag]: 1,
  [component_drag_before]: 1,
  [component_dragend]: 1,
  [component_resize_end]: 1,
  [component_resize_start]: 1,
  [component_picker_mode]: 1,
  [component_picker_mode_close]: 1,
  [component_properties_change]: 1,
  [component_show_resizer]: 1,
  [component_edit_mode]: 1,
  [component_close_edit_mode]: 1,
  [context_delete]: 1,
  [context_copy]: 1,
  [context_cut]: 1,
  [context_copypaste]: 1,
  [context_pack]: 1,
  [context_unpack]: 1,
  [context_lib]: 1,
  [component_swap]: 1,
  [component_alignment]: 1,
  [coverage_forward]: 1,
  [coverage_backward]: 1,
  [coverage_front]: 1,
  [coverage_back]: 1,
  [coverage_backward_to]: 1,
  [coverage_forward_to]: 1,
  [coverage_picked_width_mode]: 1,
  [workspace_save_template]: 1,
  [component_settings_lock]: 1,
  [component_snap_change]: 1,
  [component_snap_change_end]: 1,
  [component_lock_children]: 1,
  [component_unlock_children]: 1,
  [component_open_unlock_mode]: 1,
  [component_close_unlock_mode]: 1,
};
