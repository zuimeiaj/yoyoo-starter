# yoyoo 在线可视化页面设计器

低代码可视化网页生成/编辑工具：拖拽组件搭建页面、右侧属性面板实时编辑、图表数据可视化、交互与动画配置、一键导出图片。纯单机版，数据保存在浏览器本地（IndexedDB，localStorage 备选）。

在线地址: http://zuimeiaj.github.io/yoyoo/

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
