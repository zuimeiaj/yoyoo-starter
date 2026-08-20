# yoyoo 在线可视化页面设计器

低代码可视化网页生成/编辑工具：拖拽组件搭建页面、右侧属性面板实时编辑、图表数据可视化、交互与动画配置、一键导出图片。纯单机版，数据保存在浏览器本地（IndexedDB，localStorage 备选）。

官网: http://zuimeiaj.com/

## 功能特性

- **可视化拖拽编排**：组件拖入画布，支持拖拽、缩放、旋转、框选、批量操作、对齐辅助线、图层管理、母版复用
- **组件体系**：基础图形（矩形/圆形/线条/气泡/三角形）、表单（输入/文本域/下拉/单选/多选/表格）、按钮文本、图片图标，以及 **ECharts 图表**（柱/折线/面积/饼/雷达，支持维度配置）
- **数据展示组件（antd 封装）**：标签、评分、进度条、统计数值、徽标、头像、警告提示、步骤条，按需配置属性面板
- **交互与动画运行时**：为组件配置交互事件（单击/双击/划入/划出 → 跳转页面/播放动画/显示隐藏）与入场动画（animate.css），全屏预览时真实生效
- **组件连线**：选中组件四边锚点拖出贝塞尔曲线建立连接（多对多），起点圆点 + 终点箭头装饰，组件拖动/缩放/画布缩放时连线实时跟随，hover/点击选中后 Delete 删除
- **全屏预览**：点击顶部"预览"打开全屏遮罩，只读渲染当前页面（等比缩放适配视口），支持页面跳转、动画播放、组件显隐与连线渲染
- **图片导出**：基于 html2canvas 将当前页面/整个项目导出为 PNG/JPEG 或打包 ZIP
- **属性可视化编辑**：选中组件后右侧面板按需展示属性（位置/边框/圆角/填充/字体/对齐/阴影/动画/交互等）
- **初始化页面机制**：`public/init/` 目录 + manifest 清单，首次打开自动导入多个初始化页面，新增页面只需在清单中加一行

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | React 16.4 + Redux 4（主要通信走 EventBus，Redux 仅存少量 UI 状态） |
| 构建 | Webpack 4（已 eject 的 CRA 配置，位于 `config/`） |
| UI | Ant Design 3.16、Sass |
| 图表 | ECharts 6（SVG 渲染器，保证导出兼容） |
| 动画 | animate.css 3.7 |
| 存储 | Dexie（IndexedDB），localStorage 备选 |
| 导出 | html2canvas |

## 环境与命令

> 需要 **Node 22**。项目已移除 node-sass（改用 dart-sass `sass`），三个脚本均带
> `NODE_OPTIONS=--openssl-legacy-provider`（webpack 4 的 MD4 哈希在 Node 17+ 被禁用，必须保留）。

```bash
npm install
npm start      # 启动开发服务器 (webpack-dev-server)
npm run build  # 构建生产包到 /yoyoo/ 目录（PUBLIC_URL=/yoyoo/，部署 GitHub Pages 用）
npm test       # 运行 Jest 测试
```

## 核心架构

### 事件总线（EventBus）

全局通信核心是 `src/lib/Base/Event.js` 实现的事件总线（`Event.listen()` / `Event.dispatch()`），
事件常量定义在 `src/lib/util/actions.js`。组件间通信全部通过事件完成，而非 Redux。

> **守卫机制**：`NeedResponderAction`（actions.js 底部）列出的动作要求当前必须选中组件
> （`getFirstResponder()` 非空），否则 `dispatch` 被静默丢弃。**`component_properties_change`
> 刻意不在守卫内**（payload 自带 target，连线工具无需选中即可拖线，曾因列入守卫导致"连不上"）。

### 全局事件参考（完整清单）

事件常量全部定义在 `src/lib/util/actions.js`，以下按类别分组。payload 已标注的为
插件开发常用事件；未标注的多数无 payload 或仅作通知。

#### 组件选中与状态

| 事件 | 说明 | payload |
|------|------|---------|
| `component_active` | 组件被选中（setFirstResponder） | `target`(ViewController) |
| `component_inactive` | 组件取消选中（切选/点空白） | `firstResponder, responder` |
| `component_empty` | 点空白无任何选中 | — |
| `component_enter` / `component_leave` | 鼠标进入/离开组件（hover 高亮用） | `target` |
| `component_show_resizer` | 同步缩放控件显隐 | — |

#### 组件变换（拖拽 / 缩放 / 旋转 / 自动滚动）

| 事件 | 说明 | payload |
|------|------|---------|
| `component_drag_before` | 拖拽前（选中动作前） | — |
| `component_drag` | 拖拽/缩放/旋转过程中（每帧） | `target, { from: 'Draggable'\|'Resizable'\|'Rotatable'\|'ScrollAdjust'\|'Snapline' }` |
| `component_dragend` | 拖拽结束 | `target` |
| `component_resize_start` / `component_resize_end` | 缩放开始/结束 | `target` |
| `component_drag_autoscroll` | 拖拽/框选到视口边缘的自动滚动速度 | `{ speedX, speedY }`（screen px/s） |

#### 组件编辑模式与数据

| 事件 | 说明 | payload |
|------|------|---------|
| `component_properties_change` | **属性变更（核心写入通道）**：走标准 setState（持久化/撤销/重建） | `{ target, key, value }`（key 可为数组批量） |
| `component_stroke_change` | 描边变化 | — |
| `component_edit_mode` / `component_close_edit_mode` | 文本/形状双击进入/退出编辑模式（隐藏 resize 手柄） | — |
| `component_settings_changed` / `component_settings_show` / `component_settings_lock` | 组件设置变化/显示/锁定 | — |
| `component_sync_resizer` | 同步 resize 控件 | — |
| `component_swap` | 交换两个组件位置 | — |
| `component_alignment` | 对齐操作（工具栏/快捷键） | — |

#### 工具模式（钢笔 / 画笔 / 连线）

| 事件 | 说明 |
|------|------|
| `pen_tool_active` / `pen_tool_close` / `pen_tool_toggle` | 钢笔工具开关/切换 |
| `brush_tool_active` / `brush_tool_close` | 画笔工具开关 |
| `link_tool_active` / `link_tool_close` | 连线工具开关（开启后所有组件显示锚点） |
| `component_picker_mode` / `component_picker_mode_close` / `component_picker_picked` | 元素拾取模式开关/拾取命中 |

#### 连线

| 事件 | 说明 | payload |
|------|------|---------|
| `link_remove` | 删除一条连线（LinkLayer 派发，树内定位） | `linkId` |
| `link_remove_anchor` | 删除指定锚点的全部连线（出边+入边） | `{ uid, anchor }` |
| `link_style_change` | 连线样式切换（曲线/直角曲线） | `'curve' \| 'corner'` |

#### 框选与多选

| 事件 | 说明 | payload |
|------|------|---------|
| `selection_start` | 框选开始（mousedown，清选中） | — |
| `selection_update` | 框选拖拽中实时选区（高亮预览用） | `{ x, y, width, height }`（画布坐标） |
| `selection_highlight` | 框选命中组件坐标列表（SelectionHighlight 渲染） | `{ items: [{id,x,y,width,height,rotation}] }` |
| `selection_change` | 框选结束提交 | `{ x, y, width, height }` |
| `selection_group` | 多选成立（临时合并成组） | `views[]` |
| `selection_group_gid` | 多选组 id 更新 | — |
| `selection_cancel` | 框选取消（无命中） | — |

#### 上下文操作（右键菜单 / 快捷键）

| 事件 | 说明 |
|------|------|
| `context_checkall` | 全选 |
| `context_delete` | 删除选中组件（Delete/Backspace） |
| `context_copy` / `context_cut` / `context_paste` / `context_paste_mouse` / `context_paste_clear` | 复制/剪切/粘贴（含鼠标定位粘贴、清剪贴板） |
| `context_copypaste` | 复制+粘贴（Ctrl+D 原地复制） |
| `context_pack` / `context_unpack` | 打包成 block / 解组 |
| `context_save` / `context_save_start` / `context_save_success` / `context_save_failed` | 保存（开始/成功/失败通知） |
| `context_hide` / `context_show` / `context_lock` / `context_unlock` | 隐藏/显示/锁定/解锁 |
| `context_lib` | 添加到素材库 |
| `context_undo` / `context_redo` | 撤销/重做（快捷键入口） |
| `context_hide_menu` | 关闭右键菜单 |
| `context_shiftkey_press` | Shift 键按下状态 | `boolean` |
| `context_increment_zoom` | 增量缩放 | — |

#### 数据 / 组件树（controllers）

| 事件 | 说明 | payload |
|------|------|---------|
| `controllers_append` | 添加组件（拖入画布） | `view \| views[]` |
| `controllers_delete` / `controllers_delete_by_id` | 删除组件（含按 id） | `views[] \| id` |
| `controllers_change` | **树数据变化后广播**（每次 setState 后触发，连线/锚点/大纲刷新） | `items[]` |
| `controllers_ready` | 组件树初始化完成 | — |
| `controllers_makegroup` / `controllers_apply_group` / `controllers_apply_ungroup` / `controllers_ungroup` | 分组/解组数据执行 | — |

#### 视口 / 画布 / 滚动

| 事件 | 说明 | payload |
|------|------|---------|
| `viewport_ready` | 主编辑区初始化完成 | `EditorViews 实例` |
| `editor_scroll_change` | **画布平移/缩放变化**（拖拽补偿、辅助线、连线刷新共用） | `{ x, y, scale, level, panDeltaX, panDeltaY, isScale }` |
| `canvas_draggable` / `canvas_dragging` / `canvas_dragstart` / `canvas_dragend` | 画布拖拽平移（空格+拖拽） | `{ realDeltaX, realDeltaY, dragging }` |
| `scroller_move` | 滚动条移动 | — |
| `workspace_scroll_center` | 画布居中（工具栏按钮/初始化） | — |
| `ruler_ready` | 标尺加载完成 | — |
| `window_size_change` | 窗口尺寸变化 | — |

#### 参考线（Guides）

| 事件 | 说明 |
|------|------|
| `guide_move` / `guide_move_end` | 拖动参考线/结束 |
| `guide_display` / `guide_hide` / `guide_toggle` | 显示/隐藏/切换参考线 |
| `guide_ready` | 参考线初始化完成 |
| `guide_delete` / `guide_delete_v` / `guide_delete_h` / `guide_delete_all` | 删除单条/垂直/水平/全部 |
| `editor_guides_change` | 编辑器参考线配置变化 |

#### 吸附 / 对齐 / 覆盖层

| 事件 | 说明 | payload |
|------|------|---------|
| `component_snap_change` / `component_snap_change_end` | 吸附命中/结束（Snapline 高亮） | `transform, index` |
| `coverage_forward` / `coverage_backward` / `coverage_front` / `coverage_back` | 图层上移/下移/置顶/置底 |
| `coverage_forward_to` / `coverage_backward_to` | 移动到指定层级 |
| `coverage_picked_width_mode` | 拾取模式下图层操作 | — |

#### 页面 / 项目 / 大纲

| 事件 | 说明 | payload |
|------|------|---------|
| `outline_page_select` / `outline_page_select_end` | 切换页面（**切页必须清历史栈**，见踩坑） | `pageId` |
| `outline_page_create` / `outline_page_delete` / `outline_page_duplicate` / `outline_page_add` | 页面增/删/复制/追加 |
| `context_page_update` | 页面属性更新（背景/高度等） | `{ id, key, value }` |
| `outline_coverage_select` | 选中图层（大纲树） | — |
| `outline_coverage_name_change` | 图层重命名 | — |
| `outline_closable_panel_show` / `outline_closable_panel_hide` | 大纲可折叠面板开关 |
| `context_mode_change` | 编辑模式切换（PROJECT/MASTER） |
| `context_outline_menu_change` | 大纲菜单切换（组件库浮层显隐） |
| `context_outline_delete_master` | 删除母版 |
| `pages_load_end` / `project_initialized` / `refresh_project_list` / `refresh_user_info` / `refresh_project_name` / `refresh_editor_config` | 数据加载/项目初始化/列表/用户/名称/配置刷新 |
| `show_signup` / `show_create_project` | 注册弹窗/新建项目弹窗 |
| `workspace_save_template` / `workspace_save_template_success` / `workspace_save_master` / `workspace_part_master` | 模板/母版保存与拆分 |

#### 撤销 / 历史 / 设置 / 预览

| 事件 | 说明 | payload |
|------|------|---------|
| `workspace_undo` / `workspace_redo` | 撤销/重做结果广播（工具栏计数刷新） | `historyLen, redoLen` |
| `workspace_push` | 历史栈入栈广播 | `length` |
| `workspace_setting_show` / `workspace_setting_hide` | 设置面板开关 |
| `preferences_configchange` | 偏好配置变化（网格/自动对齐/框选模式等） | `config` |
| `app_toggle_selection_type` | 切换框选模式（相交/包围，Ctrl+Shift+O） |
| `preview_open` / `preview_close` | 全屏预览开关 |
| `colorpicker_active` | 显示取色器（传入 ColorInput 实例，须实现 setValue） |
| `context_hide_color_picker` | 隐藏取色器 |
| `editor_cache_used` | 编辑器缓存占用变化 |

#### 表格（ViewTable）

`table_insert_row_above/below`、`table_insert_col_left/right`、`table_delete_row/col`、
`table_clear_text`、`table_merge_cells`、`table_unmerge_cells`、`table_cell_selection_change`
—— 表格增删行列/清空/合并/取消合并/单元格选中，均在表格编辑态内自处理。

#### 分组锁定（block 子组件）

`component_lock_children` / `component_unlock_children`（锁定/解锁子组件）、
`component_open_unlock_mode` / `component_close_unlock_mode`（临时解锁编辑模式）

### 组件三层模型

| 层 | 目录 | 说明 |
|----|------|------|
| **View 渲染层** | `src/lib/Widget/` | 继承 `ViewController`，基类自带拖拽/缩放/旋转/双击编辑，实现 `renderContent()` 自定义内容 |
| **Properties 数据层** | `src/lib/properties/` | 继承 `ViewProperties`，定义组件数据与序列化；属性面板按实例字段自动渲染 |
| **导出层** | `src/canvas/` | html2canvas 统一从 DOM 截图，无需按组件实现绘制 |

**注意**：属性面板按 `Object.keys(properties)` 过滤渲染 — 删除不需要的字段即可隐藏对应面板
（`delete this.border` 等）；旧数据残留字段通过 `noBorder` / `noPanelKeys` 在 `parseJSON` 时忽略。

### 编辑器布局

```
Root
├── Header      — 顶部工具栏（撤销/对齐/图层/预览/导出/设置等）
├── Outline     — 左侧面板（页面列表、组件库、图标库、母版）
├── Editor      — 中间画布（视口缩放 + 标尺 + 辅助线 + 框选）
└── Inspector   — 右侧属性检查器（按组件类型动态展示）
```

### 编辑器三层架构（渲染分层，插件挂载指南）

画布（Editor 区域）从上到下分三层渲染，所有覆盖类功能（连线、锚点、框选、
高亮、辅助线、标尺、右键菜单……）都是挂在这三层上的**内部插件** —— 新增画布级
功能时，按下面分层选挂载点，不要直接改组件层：

```
┌────────────────────────────────────────────────────┐
│ 上层 · 交互覆盖层（NoZoomAreaHighIndex / Stage 内） │  ← 编辑交互 UI（不落页面数据）
│   固定层：Selection 框选、FirstResponder 手柄、      │
│           Rulers 标尺、Guides 辅助线、ContextMenu、  │
│           PenTool 遮罩、PositionInfo                 │
│   随缩放层：LinkLayer 连线、LinkAnchors 锚点、        │
│           SelectionHighlight 框选高亮                │
├────────────────────────────────────────────────────┤
│ 组件层 · .aj-component 树（Stage 内 EditorControllers）│  ← 页面数据渲染
│   zIndex 从 1000 起递增，block 容器 -1 垫底          │
├────────────────────────────────────────────────────┤
│ 底层 · 画布背景（NoZoomAreaLowIndex →                │
│         Stage.editor-panel-background →              │
│         ViewportBackground 页面底板）                │  ← 页面背景色/尺寸
└────────────────────────────────────────────────────┘
```

| 层 | 挂载点 | 坐标系 | zIndex 约定 | 内部插件 |
|----|--------|--------|-------------|----------|
| 底层 | `NoZoomAreaLowIndex`（EditorViews 内） | 画布坐标 | — | `ViewportBackground`（页面背景色、尺寸调整条） |
| 组件层 | `Stage.editor-control-panel` → `EditorControllers` | 画布坐标 | 1000+ 递增（block -1） | 全部业务组件（`.aj-component`） |
| 上层·随缩放 | `Stage.editor-control-panel` 内（与 LinkLayer 并列挂载） | **画布坐标**（与组件同坐标系） | 高亮 999998 / 锚点 999999 | `LinkLayer`、`LinkAnchors`、`SelectionHighlight` |
| 上层·固定 | `NoZoomAreaHighIndex`（EditorViews 内） | 屏幕坐标 | 视组件而定 | `Selection`、`FirstResponder`（ViewResizable）、`Rulers`、`Guides`、`ContextMenu`、`PenTool`、`PositionInfo` |

**内部插件举例（作为扩展范式）**：

1. **`SelectionHighlight`（框选实时高亮）—— 纯事件驱动的上层 SVG**
   挂 Stage 内，只监听 `selection_highlight` 事件（EditorControllers 框选拖拽中派发命中组件的画布坐标列表），
   渲染一个 20000×20000 viewport 的 SVG 覆盖层画高亮矩形。零业务耦合：只做「收数据 → 画图」。
2. **`LinkAnchors`（连线锚点）—— 上层交互 + 原生 capture**
   锚点渲染在上层（`zIndex 999999` 保证不被组件遮挡），mousedown 用**原生 capture 挂锚点 DOM**——
   否则冒泡到画布容器会被 `Selection` 的 Draggable stopPropagation 拦截（编辑器内交互事件的通用坑）。
3. **`LinkLayer`（连线层）—— 随缩放坐标系的样板**
   挂 Stage 内与组件同坐标系，端点坐标渲染时实时计算（组件 transform → 绝对坐标），
   组件拖动/Stage 缩放/滚动自动跟随，零同步逻辑。**必须显式 20000×20000 viewport**（容器无尺寸时 100% 解析为 0×0）。

**插件开发要点**：

- **通信**：一律走 EventBus（`src/lib/util/actions.js` 注册事件常量），不要直接引组件实例
- **画布坐标层**（挂 Stage 内）用 20000×20000 viewport 与组件同坐标系；**屏幕坐标层**（NoZoom）用 `getScreeTransform()` 换算
- **交互事件**：编辑器内元素优先用**原生 capture 监听**（`addEventListener(..., true)`），
  不要依赖 React 合成事件 —— 画布容器 Draggable 会在冒泡阶段 stopPropagation 拦截
- **样式**：颜色一律用 `theme.scss` 的 CSS 变量令牌（`--yoo-*`），跟随浅色/深色主题
- **渲染顺序**：SVG 覆盖层先画线再画端点装饰（线画在装饰上会穿出"尾巴"）

### 数据持久化

- 页面数据由 `src/lib/util/page.js` 管理，同时写入 localStorage 与 Dexie（`src/db.js`）
- 无任何页面时从 `public/init/manifest.json` 清单导入初始化页面（首个为默认展示页）
- 交互/动画等运行时行为与编辑器共用同一份数据，预览时只读解析

## 扩展指南

### 1. 自定义组件

```javascript
// src/lib/Widget/ 下创建组件类
import React from 'react';
import ViewController from './ViewController';

export default class YourCustomComponent extends ViewController {
  renderContent() {
    return <div>自定义组件</div>;
  }
}
```

注册渲染层：在 `src/lib/Widget/View.js` 的 `maps` 对象中按 `type` 注册。
注册数据层：在 `src/lib/properties/types.js` 的 `ViewTypes` 中注册对应的属性类（同时处理反序列化与 block 嵌套）。
加入组件库：在 `src/config/BaseComponents.js` 中追加条目（icon/name/category/type/默认尺寸），
左侧组件库即出现可拖拽项。

### 2. 自定义属性编辑器

```javascript
// src/lib/properties/ 下创建属性类
import ViewProperties from './base';

export default class YourComponentProperty extends ViewProperties {
  constructor() {
    super();
    this.type = 'group';      // 组件类型（与 View.js maps 对应）
    this.alias = '分组';       // 组件名称
    this.customProp = 'xxx';  // 扩展属性（需加入 base.js 的 SerializableKeys 白名单才会持久化）
  }
}
```

- 通用面板（位置/边框/圆角/填充/字体/对齐/阴影/动画/交互）按字段自动展示，`delete` 字段即可裁剪
- 专有配置面板：可在 `src/lib/ui/InspectorControls.js` 的 `FIELD_DEFS` 中声明字段组，
  并在 `src/components/Inspector.js` 的 `InspectorControls` / `Order` / `LABELS` 中注册
  （参照 tag/rate/progress 等数据展示组件）

### 3. 初始化页面

将页面 JSON 放入 `public/init/`（结构参考 `yoyoo-intro.json`），在 `manifest.json` 中追加一行即可：

```json
{ "pages": [{ "file": "yoyoo-intro.json" }, { "file": "your-page.json" }] }
```

## 目录速览

| 目录 | 作用 |
|------|------|
| `src/lib/Widget/` | 可拖拽组件实现（ViewController 及各 View 类）；LinkLayer/LinkAnchors 为连线层与锚点交互 |
| `src/lib/properties/` | 组件属性类与属性编辑器数据模型 |
| `src/lib/Base/` | 基础类：Event 事件总线、BaseCanvas、CacheState |
| `src/lib/global/` | 全局运行时状态（选中项、剪贴板、页面数据等） |
| `src/lib/service/` | 键盘处理服务（快捷键硬编码在 KeyboradHandler.js） |
| `src/lib/ui/` | 通用 UI 组件（属性控件、Tree、ColorPicker 等） |
| `src/components/` | 应用布局与功能面板（Header/Outline/Editor/Inspector/Preview） |
| `src/canvas/` | 图片导出（html2canvas 封装） |
| `src/config/` | 组件注册表（BaseComponents/AdvancedComponents/presetIcons） |
| `public/init/` | 初始化页面 JSON 清单（首次打开自动导入） |

## 在线体验

[在线地址 http://zuimeiaj.github.io/yoyoo/](http://zuimeiaj.github.io/yoyoo/)
