# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

在线可视化网页生成/编辑器（低代码设计工具）。支持拖拽组件、属性编辑、画布导出图片。目前是纯单机版，数据存储到 IndexedDB（localStorage 备选），服务端功能已移除。

在线地址: http://zuimeiaj.github.io/yoyoo/

## 常用命令

```bash
# 开发
npm start              # 启动开发服务器 (webpack-dev-server)

# 构建 (生产输出到 /yoyoo/ 目录)
npm run build          # PUBLIC_URL=/yoyoo/ node scripts/build.js

# 测试
npm test               # node scripts/test.js (Jest)
```

构建产物在 `/yoyoo/` 目录，部署到 GitHub Pages 使用 `PUBLIC_URL=/yoyoo/`。

## 技术栈

- **React 16.4** + **Redux 4** (connect 模式，但主要通信靠 EventBus)
- **Webpack 4** (已 eject 的 CRA 配置，在 `config/` 目录)
- **Ant Design 3.16** (UI 框架)
- **Dexie** (IndexedDB 封装，用于页面数据持久化)
- **html2canvas** (画布导出)
- **Sass** (样式，`.scss` 文件)
- **jQuery** (部分遗留 DOM 操作)

## 核心架构

### 事件总线 (EventBus)

整个框架的核心通信机制是 `src/lib/Base/Event.js` 实现的全局事件总线，而非 Redux。所有组件间通信通过 `Event.listen()` / `Event.dispatch()` 完成。事件常量定义在 `src/lib/util/actions.js`。

Redux store 仅用于少量全局 UI 状态（如 loading），组件数据状态全部走 EventBus + 全局实例。

### 自定义组件系统

组件开发的三层模型：

1. **View (React 渲染层)** — `src/lib/Widget/` 目录。所有组件继承 `ViewController` (`src/lib/Widget/ViewController.js`)，基类自带拖拽、缩放、旋转、双击编辑功能。通过实现 `renderContent()` 自定义渲染内容。组件类型在 `src/lib/Widget/View.js` 的 `maps` 对象中注册。

2. **Properties (数据/属性层)** — `src/lib/properties/` 目录。每个组件对应一个属性类，继承 `ViewProperties` (`src/lib/properties/base.js`)，包含位置、边框、背景、动画等通用属性。组件类型在 `src/lib/properties/types.js` 的 `ViewTypes` 中注册。属性类决定组件数据如何序列化/反序列化。

3. **Canvas (导出层)** — `src/canvas/index.js`，已简化为使用 `html2canvas` 从 DOM 直接截图导出。`CanvasRender` 类封装了 `html2canvas` 调用，支持 toImage/toBlob。

### 全局状态管理

- `src/lib/global/instance.js` — 当前选中组件 (firstResponder)、剪贴板、临时组、页面数据等运行时状态
- `src/lib/global/index.js` — 视口、覆盖层模式、组件索引等
- `src/lib/global/controllers.js` — 控制器相关状态
- `src/db.js` — Dexie 数据库，持久化页面数据到 IndexedDB

### 快捷键系统

`src/lib/service/KeyboradHandler.js` — 组合键路由，`src/lib/Widget/Events.js` 负责监听原生键盘事件并分发。

### 关键目录

| 目录 | 作用 |
|------|------|
| `src/lib/Widget/` | 可拖拽组件实现 (ViewController, ViewGroup, ViewText 等) |
| `src/lib/properties/` | 属性编辑器/检查器数据模型 |
| `src/lib/Base/` | 基础类: Event, BaseCanvas, CacheState, NoZoomTransform |
| `src/lib/global/` | 全局运行时状态 |
| `src/lib/util/` | 工具函数: actions(事件常量), helper, Matrix, Vector, preference |
| `src/lib/service/` | 键盘处理服务 |
| `src/lib/ui/` | 通用 UI 组件 (ColorPicker, Collapse, TreeNode 等) |
| `src/components/` | 应用布局: Root → Header + Outline + Editor + Inspector |
| `src/canvas/` | 图片导出 (html2canvas 封装) |
| `src/api/` | API 层 (服务端已移除，大部分废弃) |
| `src/config/` | 组件注册表 (BaseComponents, AdvancedComponents, presetIcons) |
| `config/` | Webpack 构建配置 (已 eject 的 CRA) |

### 编辑器布局 (Root 组件)

```
Root
├── Header        — 顶部工具栏 (保存、导出、对齐、设置等)
├── Outline       — 左侧面板 (页面列表、组件库、图标库、母版)
├── Editor        — 中间画布区域
│   ├── EditorViews  — 视口容器 (Stage 缩放区 + 辅助线 + 框选)
│   ├── Rulers       — 标尺
│   └── EditorScrollbar — 自定义滚动条
└── Inspector     — 右侧属性检查器面板
```

### 组件通信模式

```
用户操作 → Events.js (原生事件捕获) → KeyboradHandler (按键路由)
         → Event.dispatch(action)    → 各 Widget/Service 响应
         → global/instance 状态更新 → React 重新渲染
```

## 连线功能（Link）

组件间贝塞尔曲线连线：选中组件四边出现锚点（外移 16px，避免与 ViewResizable 边中点手柄重叠），按住拖出虚线、悬停目标锚点（12px 阈值）高亮吸附、松开建立连接。

### 数据模型（只存引用，不存坐标）

- `properties.connections = [{ id: 'lnk_xxx', anchor: 'left'|'top'|'right'|'bottom', targetId, targetAnchor }]` —— 当前组件的**出边**，多对多（同锚点可连多个目标，入边存在对方组件的 connections 里）
- **端点坐标渲染时由 transform 实时计算** → 组件拖动/缩放/Stage 缩放/滚动时连线自动跟随，零同步逻辑
- block/group 子组件 transform 是相对坐标，锚点需沿 `parent` 链累加（`absolutePos`）
- 悬空引用（目标组件已删除）在 `collectLinks` 渲染时过滤

### 核心文件

| 文件 | 职责 |
|------|------|
| `src/lib/Widget/LinkLayer.js` | SVG 连线层 + 几何工具（anchorPoint/linkControls/linkPath/linkArrowPath/collectLinks/indexItems/absolutePos/ANCHOR_OFFSET）+ 线交互 |
| `src/lib/Widget/LinkAnchors.js` | 锚点渲染 + 拖线交互（仅编辑器） |
| `EditorControllers.handleLinkRemove` | `link_remove` 事件处理：树内定位含该连线 id 的起点组件 → 过滤 → 标准 setState |

### 渲染与交互要点

- 覆盖层 SVG 挂 Stage 内（`EditorViews`）与组件同坐标系；**必须显式大尺寸 viewport（20000×20000）**——editor-control-panel 无显式尺寸（内容全 absolute），`width/height: 100%` 解析为 0×0 线不可见
- 整层 `pointer-events: none`；线删除热区单独开 `pointerEvents="visibleStroke"`（透明 12px 加粗，mousedown stopPropagation 不清除选中）；预览模式（props.items 只读）不挂热区
- 贝塞尔控制点按**锚点轴系**定向（left/right → 水平、top/bottom → 垂直，方向取连接方向）→ 终点切线恒等于连接方向，箭头不会回折（曾用锚点方向/起点终点方向均产生箭头朝向 bug）
- 渲染顺序：线最底 → 起点圆点/终点箭头最上（线画在箭头上会穿出三角形露"尾巴"）
- 删除交互：hover（临时高亮）/点击（选中保持高亮）→ Delete/Backspace；轻点锚点断开该锚点全部；点击线再点取消选中；`component_inactive`（点空白）清选中
- 自连禁止：`findAnchor` 排除自身 + `setLink` 入口校验双保险

### 踩坑总结

1. **keydown 必须挂 `document.addEventListener('keydown', handler, true)`（capture）** —— Events.js 的 document 冒泡监听对所有键 stopPropagation，冒泡阶段收不到；挂法与 PenTool 一致
2. **删除连线用事件桥**（LinkLayer dispatch `link_remove` → EditorControllers 树内处理），不要用 `window.allWidgets[id].view` 找实例 —— 属性变更后 allWidgets 重建、实例查找链路脆弱
3. **`handleLinkRemove` 必须先 walk 再判断 updated**（曾写成先 `if (!updated) return` 后 `walk(...)`，walk 永不执行）
4. **连线变更（拖线创建/删除）都走 `component_properties_change` / 标准 setState** —— 持久化 + PATHES 重建 + controllers_change 刷新连线层
5. 锚点 mousedown 用**原生 capture**（挂锚点 DOM），否则冒泡到画布会触发选中清除（inactive）导致拖线中断

## 事件触发时序（开发组件必读，含踩坑总结）

### 三层事件通道

| 通道 | 机制 | 用途 |
|------|------|------|
| EventBus | `Event.listen()` / `Event.dispatch()` | 组件间通信、全局状态同步（主通道） |
| 原生 DOM 监听 | `addEventListener` 挂载在具体元素上 | Draggable(mousedown)、ViewController(dblclick)、ContextMenu/自定义(contextmenu) |
| React 合成事件 | 委托在 **document** 上 | onClick / onMouseDown / onBlur / onKeyDown |

**核心陷阱：`Draggable`（src/lib/Draggable.js:41）在组件容器 mousedown 时执行 `stopPropagation + preventDefault`，事件到不了 document，React 合成事件（onClick 等）永远收不到！** 需要响应鼠标操作的组件，按优先级：
- **首选：组件自身挂原生监听 + capture 阶段**（`addEventListener('mousedown', handler, true)` 挂容器上）—— capture 先于 Draggable（容器冒泡监听）执行，`stopPropagation()` 后 Draggable / 画布框选 / document 级监听（Root 的 onClick 等）全部收不到，编辑模式内的交互完全由自身处理。参照 `ViewTable.js` 的 `_handleContainerMouseDown` / `_handleContainerClick`：非编辑态 return 放行；编辑态 stopPropagation 后自行处理；`preventDefault` 取舍——非 input 目标 preventDefault（防框选选中文本、防 blur 时序竞争），input 本身不 preventDefault（保光标定位），右键不 preventDefault（保 contextmenu）
- 或 override `onDragStart(options, e)` —— Draggable 在容器上直接同步调用，事件对象带 `e.target`，可用 `e.target.closest('td')` 等解析命中的子元素（**必须调 super**，否则 setFirstResponder 不执行、组件无法选中）
- 或给目标元素加 `data-drag="false"` —— Draggable 直接 `return`（不阻断冒泡），React 委托反而能收到事件，且不会挂 document mousemove 监听。注意 `Draggable.js:39` 只检查 `e.target.dataset.drag` 不查 closest，子元素（如 `.cell-content` div）无 data-drag 照样触发拖拽；此方案在编辑模式会与 document 级监听冲突，仅建议作为 touchstart 路径（不受 mousedown capture 影响）的兜底

### 鼠标事件时序

```
mousedown(组件内元素)
 └→ 冒泡到组件容器 → Draggable._mousedown
     ├─ e.target.dataset.drag === 'false' → return（不阻断冒泡 → React 委托可收到）
     └─ 否则 stopPropagation + preventDefault
         ├─ 挂 document 级 mousemove/mouseup 监听（按住移动即拖拽，onDragStart 拦不住！）
         └─ 同步调用 onDragStart(options, e)
             └→ super.onDragStart: setFirstResponder(target)
                 └→ dispatch component_inactive(旧) / component_active(新)
mousedown 传播完成 → 浏览器默认行为（焦点切换 blur/focus）→ mouseup → click
```

- `dblclick` 冒泡到组件容器 → ViewController `_onDBClick` → `onDBClick(e)`（子类 override 进入编辑；基类默认选中）
- `contextmenu` 冒泡路径：**组件容器（自定义原生监听，先执行）→ 编辑器容器（ContextMenu.js:104，解析菜单）→ document（React 委托）**。菜单项 `check()` 在第二步执行，因此右键需要携带的自定义状态（如右键命中的 cell）必须在**组件容器的原生监听**中设置（挂 `componentDidMount`，`componentWillUnmount` 移除）

### 编辑模式时序

```
双击 → onDBClick → setCurrentEditor(this)（自动 blur 旧编辑器）
     → Event.dispatch(component_edit_mode) → ViewResizable 隐藏 resize 手柄
     → 编辑 DOM 需设 data-event="ignore"（跳过全局快捷键）和 data-drag="false"（禁止拖拽）
退出 → setEditorBlur() → Event.dispatch(component_close_edit_mode) → ViewResizable 显示手柄
自动退出触发点：
  - firstResponder 变化 → component_inactive → FirstResponder 调 getCurrentEditor().setEditorBlur()
  - 点击画布空白（走上面的 component_inactive 机制，组件无需自己处理）
```

### blur 时序竞争（表格组件踩坑）

```
事件顺序：mousedown handler（同步）→ 浏览器默认行为（blur 在此触发）→ mouseup → click
blur 在 mousedown 的默认行为阶段触发，早于下一个宏任务。
切换编辑 cell 时的正确做法：
  1. mousedown handler 中置 this._switching = true → 切换编辑状态 → forceUpdate
     → setTimeout(0) 清除标记（blur 已发生，标记被消费）
  2. blur handler 开头检查 if (this._switching) return（切换期间的旧 input 失焦不退出编辑）
```

### 键盘时序

```
keydown → document（Events.js:26 全局监听）
  → e.target.dataset.event === 'ignore'（且非 readonly）→ 跳过（编辑态输入不受全局快捷键干扰）
  → 否则 KeyboradHandler 按组合键路由（快捷键硬编码，见 src/lib/service/KeyboradHandler.js）
```

### 属性变更链路（编辑后必须走这条，否则不可撤销/不持久化）

```
Event.dispatch(component_properties_change, { target: view, key, value: 深拷贝 })
 → EditorControllers.handlePropsChange (src/components/EditorControllers.js:942)
 → proxyPropsChange / proxyAllPropsChange（getPATHES()[id] + updateTreeIn + createViewFrom 不可变更新）
 → setState（被重写：持久化页面 + 重建 PATHES 索引 + pushHistory 撤销栈）
 → View 组件 componentWillReceiveProps → this.properties = 新对象 → initProperties()
```

**注意**：dispatch 后 `this.properties` 会被换成新对象（`componentWillReceiveProps` 同步完成），不要在异步回调中持有旧 `properties` 引用写数据。

## 环境与启动（Node 22）

- 项目原为 Node 14 + node-sass 环境；现已在 package.json 移除 `node-sass`（改用 dart-sass `sass`），三个 scripts 均加了 `NODE_OPTIONS=--openssl-legacy-provider`（webpack 4 的 MD4 哈希在 Node 17+ 被禁用，必须加）
- 开发：`npm start`；构建：`npm run build`（PUBLIC_URL=/yoyoo/）
- 若切换回 Node 14 环境使用 pnpm，需要 pnpm@7（pnpm 8+ 要求 Node 16.14+）

### 数据持久化

- 页面数据通过 `src/lib/util/page.js` 管理，使用 `storage_page_key` 同时写 localStorage 和 Dexie
- `src/db.js` 使用 Dexie 管理 IndexedDB 中的 pages 表
- 快捷键配置硬编码在前端（原从服务端读取的功能已移除）

## 扩展自定义组件

1. 在 `src/lib/Widget/` 创建组件类，继承 `ViewController`，实现 `renderContent()`
2. 在 `src/lib/Widget/View.js` 的 `maps` 中注册
3. 如需属性编辑，在 `src/lib/properties/` 创建属性类，继承 `ViewProperties`
4. 在 `src/lib/properties/types.js` 的 `ViewTypes` 中注册
5. 如需导出，在 `src/canvas/index.js` 中处理（目前统一使用 html2canvas）
