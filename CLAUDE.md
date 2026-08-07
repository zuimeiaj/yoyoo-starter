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
- ~~jQuery~~ **已移除**（深拷贝用 `JSON.parse(JSON.stringify())` 替代、class 操作用 `classList`、纯对象判断内联——properties 数据为纯 JSON 结构，JSON 深拷贝安全；package.json 依赖已删）

## 核心架构

### 事件总线 (EventBus)

整个框架的核心通信机制是 `src/lib/Base/Event.js` 实现的全局事件总线，而非 Redux。所有组件间通信通过 `Event.listen()` / `Event.dispatch()` 完成。事件常量定义在 `src/lib/util/actions.js`。

Redux store 仅用于少量全局 UI 状态（如 loading），组件数据状态全部走 EventBus + 全局实例。

### 自定义组件系统

组件开发的三层模型：

1. **View (React 渲染层)** — `src/lib/Widget/` 目录。所有组件继承 `ViewController` (`src/lib/Widget/ViewController.js`)，基类自带拖拽、缩放、旋转、双击编辑功能。通过实现 `renderContent()` 自定义渲染内容。组件类型在 `src/lib/Widget/View.js` 的 `maps` 对象中注册。

2. **Properties (数据/属性层)** — `src/lib/properties/` 目录。每个组件对应一个属性类，继承 `ViewProperties` (`src/lib/properties/base.js`)，包含位置、边框、背景、动画等通用属性。组件类型在 `src/lib/properties/types.js` 的 `ViewTypes` 中注册。属性类决定组件数据如何序列化/反序列化。

3. **Canvas (导出层)** — `src/canvas/index.js`，已简化为使用 `html2canvas` 从 DOM 直接截图导出。`CanvasRender` 类封装了 `html2canvas` 调用，支持 toImage/toBlob。**scale 固定 2，不能用 `window.devicePixelRatio`** —— 双屏（笔记本 DPR=2 / 外接屏 DPR=1）下导出结果随窗口所在屏幕变化，DPR=1 时 html2canvas 渲染出白色块（曾踩坑）。导出容器克隆 `.aj-component` + `.link-layer`（连线层序列化为 SVG data URL `<img>` 加入容器，html2canvas 不支持内联 SVG）。

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

## 流程图组件

- **形状清单**：flowrect（流程矩形，SVG 渲染）/triangle（三角形）/diamond（菱形）/parallelogram（平行四边形）/hexagon（六边形）/bubble（气泡）为既有组件；capsule（胶囊起止）/ellipse（椭圆）/predefined（预定义过程）/document（文档）/cylinder（数据库）/trapezoid（手动输入）/delay（延迟）/annotation（注释）/person（人员，draw.io 简笔小人：圆头+躯干+双臂+双腿，纯线条 fill none）为通用形状组件；**base 分类另有「矩形」（type rect，div 实现 ViewContainer，有背景色/圆角/阴影全属性）**——两种矩形类型不同：流程矩形 SVG 黑边透明，基础矩形 div 通用样式
- **通用形状**：`src/lib/Widget/ViewFlowShape.js` 按 `properties.flowShape` 分派渲染（path 坐标按当前宽高实时计算，resize 自适应），继承 `ShapeTextController` 双击编辑文本；属性类在 `src/lib/properties/flow.js`（工厂生成，`flowShape` 已入 SerializableKeys 序列化白名单）
- **默认样式规范**：流程图节点**边框黑色**（`FLOW_BORDER`）+ **不填充**（`FLOW_BG` 透明）+ **无圆角/阴影**（`delete corner/shadow`，属性面板不显示）+ **字体样式**（`FLOW_FONT` = { color: '#333333', size: 14 }，属性面板「字体」项可调，`ShapeTextController.renderText` 渲染读取）+ **无旋转手柄**（`FLOW_RESIZE` 白名单 = 四角 + 边热区，流程图节点一般不旋转；连线模式再剔 tm/bm/l/r 只留四角）——base.js 既有 flow 类（Triangle/Diamond/Parallelogram/Hexagon/Bubble）与 flow.js 新增类统一（定义在 base.js 顶部常量；基础矩形 rect 保留旋转）
- **注册链路**：`View.js` maps + `properties/types.js` ViewTypes + `config/BaseComponents.js`（条目 + ComponentIconMap 图标），新增形状三处同步
- **「直线」组件独立 type `lineShape`**：`line` 被图表折线图占用（ViewChart/LineProperties），原注册顺序下直线拖出来是折线图（曾踩坑）——base.js `Line` 类 type 改为 lineShape，折线图保持 `line`
- **直线编辑（draw.io 风格）**：`settings.resize = []` 无 resize/rotate 手柄；选中时两端显示编辑圆点（ViewLine 内 SVG circle，原生 capture mousedown 挂 DOM），拖动端点固定另一端、绕其伸缩旋转（长度 + 角度一次成型：`atan2` 算角度、`hypot` 算长度、容器中心 = 端点中点），拖动中直改 DOM（setTransform + 圆点 cx），松手 `component_properties_change` 落库

## 连线功能（Link）

组件间贝塞尔曲线连线：连线模式下鼠标移入组件显示 4 个控制点**箭头**（贴边 `ANCHOR_OFFSET=0`，尖朝外、随组件旋转；移出组件外扩 30px 缓冲带消失），按住拖出虚线、悬停目标锚点（16px 阈值）高亮吸附、松开建立连接。连线模式下移动单位自动切 10px（`window.__linkPrevSnap` 记住原值、退出还原），组件拖动按 10px 步进。

- **控制点 hover 显示**（`LinkAnchors.handleHoverMove`）：连线模式挂 document mousemove，每帧按「组件本体优先、外扩 HOVER_EXPAND=30 缓冲带最近」计算 hoverUid，只渲染该组件的 4 个箭头（坐标现算），移出缓冲带消失 —— 不常驻渲染全部锚点；拖动组件中隐藏（dragging）
- **边中点缩放热区仅连线模式隐藏**（ViewResizable `applyResizeHandles` 在 `window.__linkTool` 时把 tm/bm/l/r 从显示白名单剔除，只留四角 + 旋转；监听 link_tool_active/close 即时刷新当前选中组件）：边中点与贴边控制点位置冲突，设计模式保持原样（四角 + 四边热区）

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
- 贝塞尔控制点按**锚点轴系**定向（left/right → 水平、top/bottom → 垂直），方向取**各自锚点的外法线**（起点外侧 → 起点切线向外 =「从内到外出发」；终点外侧 → 终点切线指向组件内部 =「从外到内进入」，箭头朝向组件，与 corner 箭头规则一致）——不能用全局连接方向（dx/dy 符号）：目标锚点在起点「背后」时两端控制点翻到组件内侧，线从起点反面冒出、箭头背对目标，即「首尾不连」（曾踩坑）
- 渲染顺序：线最底 → 起点圆点/终点箭头最上（线画在箭头上会穿出三角形露"尾巴"）
- **线段颜色/粗细可配置**（HeaderLinkStyle 右上角工具栏）：颜色矩形触发（显示当前色，hover 弹预设色板 `LINK_COLORS` 9 色，黑为默认）+ 粗细触发钮（Popover 弹 1/2/3/4/5px，触发钮横线按当前粗细绘制）；存 `page.linkColor`/`page.linkWidth` + `window.__linkColor`/`__linkWidth`（切页 handlePageSelect 同步），渲染走 `getLinkColor()`/`getLinkWidth()`（props > window > 默认黑/1px）；选中红 `#ff7875`/hover 蓝 `#40a9ff` 为交互反馈色不随配置，选中/hover 线宽 +1px
- 删除交互：点击线选中（红色保持）→ Delete/Backspace（**selected 优先**，hover 蓝色仅提示、且仅在组件也未选中时才作为快捷删除目标——否则选中组件时鼠标悬停线上，Delete 会误删线）；点击组件（component_active）/点空白（component_inactive）清选中；轻点锚点断开该锚点全部；再点取消选中
- 线段热区交互：选中在 **mousedown** 完成（click 会被重渲染打断丢失）；热区 mousedown 必须用**原生 capture**（ref 挂 path DOM，同锚点/ViewTable 模式）——Selection 的 Draggable 挂 `#layout-editor-view` 容器冒泡 mousedown 会 stopPropagation，事件到不了 document，React 合成 onMouseDown 永不触发（曾用合成事件导致"点击线段无高亮"）；hover 走 React 合成（mouseover 无拦截者）。点击线 mousedown 均 stopPropagation + blur 输入框焦点（否则 Delete 时 e.target 是 INPUT 被输入保护跳过，线删不掉）
- 自连禁止：`findAnchor` 排除自身 + `setLink` 入口校验双保险
- 控制点箭头配色**浅一档蓝色系**（已连接实心 `#69b1ff`/未连接空心白底 `#bae7ff`）；悬停/吸附红 `#ff7875` 保持醒目；起点**米字标记**固定 `#91caff`（不随选中/hover 变色，装饰性指示出发位置，贴边后压在组件边缘上）
- 连线导出：HeaderExport 把 `.link-layer` 序列化为 SVG data URL `<img>` 加入导出容器（html2canvas 不支持内联 SVG，见「Canvas 导出层」）

### 全局避障路由（corner 样式）

`orthoRoute`（LinkLayer.js）生成不穿越**任何组件 bbox（含两端组件自身）**的正交折线，抛弃"最少直角"限制，按结构定义形态：

- **直线（0 拐角）**：两端锚点共线 + 不穿任何组件 + 尾段 ≥13px，直接连线
- **同轴 Z 形（2 拐角，默认形态）**：`[p0, 中间段, p1]`，中间段坐标候选枚举，强制**首段 ≥16px（脖子）、尾段 ≥13px（箭头尾段）**——除直线外最少两个直角，线"有首有脖有尾"（中间段不能贴着锚点）；候选含**锚点外推值**（锚点沿锚点轴外推 16/13 的端点，`axisCands`）
- **同轴 3 拐角（2 拐角无解补位）**：近距堆叠/遮挡走廊（2 拐角需首 16+尾 13 的间距空间，不足即无解）——`[p0, 轴伸出, 垂直段, 平行段, 垂直段, 轴进入 p1]` 三变量截断枚举（12³），同样带首尾段长度约束；否则直接跳 A* 常因尾段无法外推失败 → 回退 cornerPath 穿越组件
- **异轴 3 拐角**：H,V,H,V（或 V,H,V,H），双变量截断枚举（12×12），同样带首尾段长度约束
- **A* 网格兜底**（任意拐角，复杂遮挡）：首段/尾段沿锚点轴伸出（`extendFrom` 24/16px）后中间任意绕行；网格 8px、区域两端点 bbox 外扩 300、转向付 TURN=2 代价抑制锯齿、结果去共线；区域超 50 万格放弃；结果经 **`axialSplice` 首尾段轴向修正**（网格中心与锚点不对齐 → 首尾段斜线、箭头错位：沿锚点轴补过渡拐点并验证 pathClear 豁免端点 + axOk 方向校验）
- **端点贴边豁免**：锚点贴边（`ANCHOR_OFFSET=0`）后 p0/p1 落在自身膨胀 bbox 内，`pathClear(pts, obstacles, exempt0, exempt1)`（端点 box 引用）——首/尾段跳过端点自身判定（贴边出发/进入合法），**中间段仍逐段避让所有组件含端点**；方向合法性由 **`axOk`** 显式校验（首段沿锚点外法线、尾段沿锚点轴进入，反向候选不再依赖 pathClear 隐式淘汰）——曾依赖 pathClear 杀反向候选，豁免后必须显式保证
- **端点组件在 obstacles 内**（线段不能穿越任何组件包括自己）：反向候选（拐点落在端点组件内）由 `pathClear` 自动淘汰，无需方向过滤
- 同档候选取质量最优 = 长度 + EDGE_PENALTY(80) × 贴边段数（贴边 = 与组件边缘平行擦过且距离 < EDGE_TOL 24px，视觉"挤"）
- 旋转组件作为端点 → 直接回退（锚点轴已非轴对齐，约束失效）；作为中间障碍物用**外接矩形**（`boxOf` 处理 rotation）
- 无解 → `routePath` 回退 `cornerPath`（两端约束折线，线仍可见）
- **相关线联动（dragId）**：交互拖动（Draggable/Resizable/Rotatable，refresh 按 `options.from`）时只重算**相关线**（`fromId`/`toId` 命中拖动组件的线，`refreshRelated` 增量刷新），走简单路径跟手；**不相关线原样保留（含 `_p` path 缓存 → 渲染零重算、视觉静止）**；`component_dragend`/`component_resize_end` → 清 dragId + `_p` 缓存 → 全部切回避障路径；`controllers_change`（落库）/样式切换（handleStyleChange）→ 全量重建/清缓存
- 不做线-线避让（连线交叉正常）
- **箭头**：`linkArrowUnit` 按锚点进入方向（left → +x 指向组件内部）；线 path 终点 `trimPathEnd` 裁剪到箭头底边（顶点往回 8px）——线永远从三角底部传入，三角形尖指向组件

### 踩坑总结

1. **keydown 必须挂 `document.addEventListener('keydown', handler, true)`（capture）** —— Events.js 的 document 冒泡监听对所有键 stopPropagation，冒泡阶段收不到；挂法与 PenTool 一致
2. **删除连线用事件桥**（LinkLayer dispatch `link_remove` → EditorControllers 树内处理），不要用 `window.allWidgets[id].view` 找实例 —— 属性变更后 allWidgets 重建、实例查找链路脆弱
3. **`handleLinkRemove` 必须先 walk 再判断 updated**（曾写成先 `if (!updated) return` 后 `walk(...)`，walk 永不执行）
4. **连线变更（拖线创建/删除）都走 `component_properties_change` / 标准 setState** —— 持久化 + PATHES 重建 + controllers_change 刷新连线层
5. 锚点 mousedown 用**原生 capture**（挂锚点 DOM），否则冒泡到画布会触发选中清除（inactive）导致拖线中断
6. **`component_properties_change` 不能放进 `NeedResponderAction` 守卫**（Event.js 对守卫列表内的动作在 firstResponder 为 null 时静默丢弃）——该动作 payload 自带 `target`，写入定位走 `target.properties.id` + PATHES，不依赖选中；而连线工具设计为"无需选中即可拖线"，一旦用户点空白/删组件清空选中，后续 setLink 派发被丢弃 → 表现为"连了又删，不一会就连不上"（曾踩坑，见 actions.js 注释）

## 框选功能（Selection）

`src/lib/Widget/Selection.js` 在 `#layout-editor-view` 上挂 Draggable 实现框选（无 React 合成事件依赖，靠 Draggable 回调）。

### 相交 / 包围模式

- `config.selection`：`'cross'`（相交，选区碰到组件即选中）| `'inner'`（包围，组件完全在选区内才选中）
- 切换：Ctrl+Shift+O（`app_toggle_selection_type`）或 设置面板「框选模式」Radio（走 `updatePreferences` 合并进 config，二者互通）
- 命中判定 `_handleSelectionWithType`（EditorControllers），公共匹配 `getSelectionMatches(rect)` 供最终选中与实时预览共用；隐藏组件排除

### 实时高亮

- Selection 拖拽中（onDragMove）派发 **`selection_update`**（原定义未用，现作实时预览事件），矩形已除以缩放、与 `selection_change` 同坐标系
- `EditorControllers.handleSelectionUpdate`：命中判定后派发 **`selection_highlight`**（命中组件的画布坐标列表）→ `SelectionHighlight.js` 上层覆盖层渲染 SVG 高亮矩形（zIndex 999998，挂 Stage 内与组件同坐标系，同 LinkLayer 的 20000×20000 viewport）
- **高亮必须画在上层覆盖层**：曾用 `.aj-component` 上的 outline（组件层），被上层组件盖住时高亮"埋底"——编辑器三层架构（底层 background / 组件层 / 上层覆盖层），交互反馈一律画最上层
- 松手（handleSelection）/开始（handleSelectionStart）派发空列表清高亮，选中提交后由正常选中态接管

### 平移补偿与边缘自动滚动

- **框选中平移画布**：监听 `editor_scroll_change`（panDelta 为画布坐标）→ `handleScrollDuringSelect` 把锚点角 `_offset -= panDelta × scale`（screen px）——选区 =「内容锚点（起点+补偿）+ 当前鼠标」，与内容保持对齐（命中判定里组件坐标随 pan 变化，不补偿会错位）
- **边缘自动滚动**：`_detectAutoScroll` 复用组件拖拽机制（55px 阈值 / 600px/s → `component_drag_autoscroll` → EditorScrollbar RAF 循环滚动 → editor_scroll_change → 补偿 + 重检测维持）
- **视口边界必须实时测量**（`#layout-editor-view` 的 getBoundingClientRect）：框选开始会取消选中 → 右侧属性面板消失 → 视口宽度变化，静态 `config.editorDomRect`（固定右 260px）会失效（曾踩坑：到真实边界不滚动）

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

**历史栈（HistoryRecord/RedoRecord）是模块级全局数组（跨页共享）**：切换页面（`handlePageSelect`）必须清空两个栈（切 PROJECT/MASTER 模式已有，页面切换曾漏掉）—— 不清会污染：新页 Ctrl+Z 回退成旧页内容，且 setState 后把旧页数据存成当前页（数据覆盖）。历史条目靠「每次 setState 都 createViewFrom 换新对象」保证不可变链；拖拽的原地改写安全是因为拖拽开始时 `component_active → handleComponentActive` 已先换新目标节点。

## 主题系统（浅色 / 深色 / 跟随系统）

- **令牌定义**：`src/styles/theme.scss` 定义 CSS 变量（`:root` 浅色 + `:root[data-theme='dark']` 深色）；`src/styles/_color.scss` 的 SCSS 变量全部映射为 `var(--yoo-*)` —— 编译产物是运行时变量，**切换 `<html data-theme>` 即全局换肤，无需重编译**，28 个 `@import 'color'` 的文件自动生效
- **切换入口**：`ThemeToggle.js`（Header 右上角）浅色/深色/跟随系统；localStorage `yoyoo-theme` 持久化，默认跟随系统（matchMedia prefers-color-scheme 监听实时切换）；`index.js` 启动时按存储/系统值初始化 `data-theme` 防首屏闪烁
- **新颜色规范**：布局表面色一律用令牌（`--yoo-surface/surface-2/...`、`--yoo-glass-*` 毛玻璃、`--yoo-text-*`、`--yoo-border-1`），**不要写死 hex**；用户画布内的设计数据色（组件 bg/文本色）不属于主题，保持原样
- **antd 3.x 无官方暗色主题**：`[data-theme='dark']` 下对常用组件（Modal/Input/Select/Dropdown/Collapse/Tooltip/Switch/Button/Message）做了定向 CSS 覆盖，新增组件样式时注意同步

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
