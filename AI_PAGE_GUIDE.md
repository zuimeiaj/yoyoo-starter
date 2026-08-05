# 页面数据结构与组件属性文档（AI 生成页面用）

> 本文档描述在线可视化设计器（yoyoo）的**页面数据模型**与**全部组件属性**。
> AI 可按本文档直接生成页面 JSON，导入设计器即可渲染、继续编辑。
> 设计器在线地址：http://zuimeiaj.github.io/yoyoo/

---

## 一、整体结构

### 页面对象

页面本身是一个 JSON 对象（`type: "PAGE"`），组件树存放在 **`nodes` 数组**；`block` 组件（分组容器，`group` 已废弃）通过自身的 **`items` 数组**嵌套子组件。

```json
{
  "type": "PAGE",
  "alias": "新页面",
  "id": "page_1785833475519",
  "width": 800,
  "height": 900,
  "bg": "rgba(255,255,255,1)",
  "parentid": null,
  "projectid": "testid",
  "guides": { "x": [], "y": [] },
  "nodes": [
    { "type": "block", "alias": "Block", "id": "sb_9873856462738", "transform": { "x": 40, "y": 80, "width": 187, "height": 79 }, "items": [/* 子组件 */] }
  ]
}
```

| 页面字段 | 类型 | 说明 |
|---|---|---|
| `type` | string | `"PAGE"`（页面）/ `"STATE"`（状态副本） |
| `alias` | string | 页面名（大纲面板可见） |
| `id` | string | 页面唯一 id（**`page_` 前缀**，如 `page_1785833475519`） |
| `width` / `height` | number | 画布尺寸 px |
| `bg` | string | 页面背景色（rgba） |
| `parentid` | string/null | 父级 id，根页面为 `null` |
| `projectid` | string | 项目 id（单机版固定 `"testid"`） |
| `guides` | object | 参考线 `{x: [], y: []}` |
| `nodes` | array | **组件树（顶层组件数组）** |

### 组件对象

每个组件是一个 JSON 对象：**通用属性 + 类型特有属性**。**所有组件（含 `block` 的 `items` 子组件）的 `transform.x/y` 都是绝对坐标**（相对画布原点），单位 px，无需相对父级换算。

```json
{
  "id": "必填，唯一 id（sb_ 前缀，如 sb_9873856462738）",
  "alias": "组件名",
  "type": "text",
  "transform": { "x": 20, "y": 20, "width": 120, "height": 32, "rotation": 0 },
  "settings": { "isHide": false },
  "border": { "width": 1, "color": "rgba(224,224,224,1)", "style": "solid" },
  "bg": "rgba(255,255,255,0)",
  "font": { "size": 14, "color": "rgba(0,0,0,1)" }
}
```

> **id 必填唯一（生成时必须自己提供，不要让框架生成）**：`id` 是组件索引键，**缺失会导致组件间 id 冲突（点击/选中错乱）**。命名规则：
> - **页面** id：**`page_` 前缀**（如 `page_1785833475519`）
> - **组件/节点** id（**包括嵌套 `items` 里的子组件**）：**`sb_` 前缀**（如 `sb_9873856462738`）
>
> 框架虽然会在加载时自动补 id，但**不要依赖它**——请按上述规则为每个节点直接生成并提供全局唯一 id，保证数据稳定。

---

## 二、通用属性（所有组件都有，可省略以用默认值）

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `type` | string | 必填 | 组件类型，见下表 |
| `alias` | string | 类型名 | 显示名称（大纲面板可见） |
| `transform` | object | `{x:0, y:0, width:100, height:200, rotation:0}` | 位置尺寸。**必须提供 x/y/width/height** |
| `settings` | object | 见下 | 行为配置 |
| `border` | object | `{width:0, color:'rgba(224,224,224,1)', style:'solid'}` | 描边。style: `solid`/`dashed`/`dotted`/`none`（none=不可改） |
| `bg` | string | `'rgba(255,255,255,0)'` | 背景色（rgba 字符串） |
| `corner` | object | 全 0 | 圆角 `{topLeft, topRight, bottomLeft, bottomRight}` |
| `shadow` | object | 无 | 阴影 `{blur, spread, offsetX, offsetY, color, type:'outset'/'inset'}` |
| `interactions` | array | `[]` | 交互配置 |
| `animations` | object | `{}` | 动画配置 |

`settings` 结构：

```json
{
  "fixation": false,
  "hover": true,
  "resize": null,
  "ratio": false,
  "isHide": false,
  "overflow": ""
}
```

- `fixation`：固定
- `hover`：悬停效果
- `resize`：resize 手柄白名单；`null` = 全部，或数组 `["rotation","tl","tm","tr","r","br","bm","bl","l","borderTop","borderRight","borderBottom","borderLeft"]`
- `ratio`：等比缩放
- `isHide`：隐藏
- `overflow`：`""` | `"scroll-x"` | `"scroll-y"` | `"hidden"`

---

## 三、组件类型总览

| type | 名称 | 特有属性 |
|---|---|---|
| `text` | 文本 | `fontData`(内容) `font` `align` `fontStyle` `decorator` `spacing` |
| `button` | 按钮 | 同 text（`fontData`='Button'、`align` 居中、有 `bg`） |
| `input` | 单行输入 | `fontData`(占位文案) `font` `border` `corner` |
| `textarea` | 多行输入 | 同 input |
| `select` | 下拉选择 | `selectOptions` `font` |
| `radio` | 单选 | `radioOptions` `direction` `font` |
| `checkbox` | 多选 | `checkboxOptions` `direction` `font` |
| `image` | 图片 | `image` |
| `table` | 表格 | `tableData` `rowRatios` `colRatios` `mergedCells` `cellStyles` |
| `chart` | 图表（5 种子类型） | `chartType` `chartData` `chartSeries` `chartAxis` |
| `bubble` | 气泡 | `bubble` |
| `icon` | 图标 | `icon` |
| `line` | 直线 | 无 |
| `circle` | 圆 | 无 |
| `triangle` | 三角形 | 无 |
| `rect` | 矩形 | 无（通用属性即全部） |
| `group` | 分组（**已废弃**，用 `block`） | `items`(子组件数组) |
| `block` | 块容器 | `items`(子组件数组) |

---

## 四、各类型详细说明与示例

### 1. 文本 text / 按钮 button

**内容直接存在 `fontData` 字段**（就是显示的文字）。按钮与文本共用属性模型，区别：按钮 `fontData` 默认 `'Button'`、内容居中、有背景色。

```json
{
  "type": "text",
  "alias": "标题",
  "transform": { "x": 100, "y": 60, "width": 200, "height": 40 },
  "fontData": "欢迎使用 yoyoo",
  "font": { "size": 20, "color": "rgba(0,0,0,1)" },
  "align": { "x": "center", "y": "center" },
  "fontStyle": ["bold"],
  "decorator": "none",
  "spacing": { "height": 1.2, "width": 0 }
}
```

| 字段 | 说明 |
|---|---|
| `fontData` | **文本内容**（字符串） |
| `font` | `{size, color}` 字号/颜色 |
| `align` | `{x, y}`，值 `flex-start`/`center`/`flex-end` |
| `fontStyle` | 数组，可含 `"bold"`、`"italic"` |
| `decorator` | `"none"` 或 `"underline"` |
| `spacing` | `{height: 行高倍数, width: 字间距}` |

按钮示例：

```json
{
  "type": "button",
  "alias": "提交按钮",
  "transform": { "x": 100, "y": 120, "width": 120, "height": 36 },
  "fontData": "提交",
  "bg": "rgba(0,150,136,1)",
  "font": { "size": 14, "color": "rgba(255,255,255,1)" },
  "align": { "x": "center", "y": "center" }
}
```

### 2. 单行输入 input / 多行输入 textarea

```json
{
  "type": "input",
  "alias": "用户名",
  "transform": { "x": 100, "y": 180, "width": 200, "height": 28 },
  "fontData": "请输入用户名",
  "font": { "size": 12, "color": "rgba(221,221,221,1)" },
  "border": { "width": 1, "color": "rgba(224,224,224,1)", "style": "solid" },
  "corner": { "topLeft": 4, "topRight": 4, "bottomLeft": 4, "bottomRight": 4 }
}
```

| 字段 | 说明 |
|---|---|
| `fontData` | 占位文案 |

`textarea` 同结构（多行）。

### 3. 下拉选择 select

```json
{
  "type": "select",
  "transform": { "x": 100, "y": 240, "width": 180, "height": 28 },
  "selectOptions": "选项一\n选项二\n选项三",
  "font": { "size": 12, "color": "rgba(221,221,221,1)" },
  "border": { "width": 1, "color": "rgba(224,224,224,1)", "style": "solid" }
}
```

| 字段 | 说明 |
|---|---|
| `selectOptions` | **换行分隔**的选项字符串 |

### 4. 单选 radio / 多选 checkbox

```json
{
  "type": "radio",
  "alias": "性别",
  "transform": { "x": 100, "y": 300, "width": 180, "height": 66 },
  "radioOptions": "> 男\n女",
  "direction": "vertical",
  "font": { "size": 12, "color": "rgba(221,221,221,1)" }
}
```

| 字段 | 说明 |
|---|---|
| `radioOptions` / `checkboxOptions` | 换行分隔的选项字符串；行首 `>` 表示**默认选中**（可多个，仅 checkbox 语义） |
| `direction` | `vertical`（纵向）/ `horizontal`（横向） |

### 5. 图片 image

```json
{
  "type": "image",
  "transform": { "x": 100, "y": 400, "width": 120, "height": 80 },
  "image": { "fill": "fill", "source": "https://example.com/pic.png" }
}
```

| 字段 | 说明 |
|---|---|
| `image.fill` | `fill`（铺满裁剪）/ `scale`（等比）/ `stretch`（拉伸） |
| `image.source` | 图片 URL |

### 6. 表格 table

```json
{
  "type": "table",
  "transform": { "x": 100, "y": 500, "width": 400, "height": 200 },
  "tableData": [
    ["姓名", "语文", "数学"],
    ["张三", 80, 90],
    ["李四", 70, 85]
  ],
  "rowRatios": null,
  "colRatios": null,
  "mergedCells": [],
  "cellStyles": null
}
```

| 字段 | 说明 |
|---|---|
| `tableData` | 2D 数组（字符串/数字均可） |
| `rowRatios` / `colRatios` | 行高/列宽占比数组（总和≈1），`null` = 均分 |
| `mergedCells` | 合并单元格 `[{row1, col1, row2, col2}]`（0 起始，互不重叠） |
| `cellStyles` | 与 tableData 同构的 2D 稀疏数组，元素 `{bg, color, size, bold, fontFamily}` 或 null |

### 7. 图表 chart（柱状/折线/面积/饼/雷达）

`type` 固定 `chart`，用 `chartType` 区分 5 种子类型。**数据模型统一**：

```json
{
  "type": "chart",
  "chartType": "bar",
  "transform": { "x": 100, "y": 700, "width": 300, "height": 200 },
  "chartData": {
    "categories": ["1月", "2月", "3月", "4月"],
    "series": [
      { "name": "销量", "data": [120, 200, 150, 80] },
      { "name": "利润", "data": [40, 80, 60, 30] }
    ]
  },
  "chartSeries": [
    { "type": "line", "color": "rgba(255,99,132,1)" },
    { "type": "bar", "color": "rgba(54,162,235,1)" }
  ],
  "chartAxis": { "xLabel": true, "yLabel": true }
}
```

| 字段 | 说明 |
|---|---|
| `chartType` | `bar` / `line` / `area` / `pie` / `radar` |
| `chartData.categories` | X 轴类目（饼图 = 扇形名称，雷达 = 指标名） |
| `chartData.series[].name` | 系列名（图例） |
| `chartData.series[].data` | 数值数组，与 categories 对齐；`null` = 缺失（柱图空位/折线断点） |
| `chartSeries` | 与 series 索引对齐的配置数组：`{type: bar/line/area/pie/radar（覆盖默认）, color}`；可省略或为空数组 |
| `chartAxis` | 坐标轴刻度标签开关 `{xLabel, yLabel}` |

**各 chartType 的数据映射**：

| chartType | categories 含义 | series 含义 |
|---|---|---|
| bar/line/area | X 轴类目 | 各系列柱子/折线（多系列自动分组 + 图例） |
| pie | 扇形名称 | 只取 `series[0].data` 作为各扇形值 |
| radar | 雷达图指标名 | 各系列数据（按指标顺序） |

**多系列混搭**：chartSeries 中每个系列可单独指定类型（如柱 + 线组合图）。

### 8. 气泡 bubble

```json
{
  "type": "bubble",
  "transform": { "x": 100, "y": 900, "width": 300, "height": 100 },
  "bubble": { "pos": 750 }
}
```

| 字段 | 说明 |
|---|---|
| `bubble.pos` | 三角（气泡尾巴）沿内矩形周线的**像素弧长**：0 = 顶边左端，顺时针绕一圈。省略则默认底部中间 |

### 9. 图标 icon

```json
{
  "type": "icon",
  "transform": { "x": 100, "y": 1000, "width": 20, "height": 20 },
  "icon": { "data": "favorite", "content": "" },
  "bg": "rgba(0,0,0,1)"
}
```

| 字段 | 说明 |
|---|---|
| `icon.data` | 图标 css class 名（iconfont 字体图标） |
| `icon.content` | unicode 内容 |

### 10. 块 block（分组容器，group 已废弃）

`block` 是分组的标准容器（设计器「分组」操作生成的就是 `block`；**`group` 类型已废弃**，生成 JSON 一律用 `block`），通过 `items` 数组嵌套子组件。**嵌套是标准格式，框架自动处理**：

- **所有组件（含 `items` 子组件）都是绝对坐标**（相对画布原点），坐标不能随意填
- **block 自身的 transform 必须包围子组件**：x/y/width/height = 所有子组件的外接包围盒（子组件坐标的最小/最大值）；**子组件坐标保持不变**——分组不改变布局
- block 通常 `zIndex: -1`（透明容器渲染在最底层，分组前后渲染结果完全一致）
- 嵌套子组件会被标记 `settings.isLock: true`（锁定，需解锁才能单独编辑）

设计器分组导出的真实结构：

```json
{
  "type": "block",
  "alias": "Block",
  "id": "sb_9464147379999",
  "zIndex": -1,
  "transform": { "x": 500, "y": 775, "width": 280, "height": 230 },
  "items": [
    { "type": "rect", "id": "sub_c41", "transform": { "x": 500, "y": 775, "width": 280, "height": 230 }, "settings": { "isLock": true }, "bg": "rgba(255,255,255,1)" },
    { "type": "text", "id": "sub_c42", "transform": { "x": 520, "y": 799, "width": 60, "height": 18 }, "settings": { "isLock": true }, "fontData": "北京" }
  ]
}
```

> 完整序列化时每个组件还会带 `zIndex`、`selected`、`interactions`、`animations`、`settings`、`border`、`corner`、`shadow`、`bg`、`align`、`fontStyle`、`decorator`、`spacing` 等字段，均可用默认值省略。


### 11. 直线 line / 圆 circle / 三角形 triangle / 矩形 rect

基础形状，只用通用属性。示例：

```json
{ "type": "rect", "transform": { "x": 0, "y": 0, "width": 200, "height": 100 }, "bg": "rgba(0,150,136,0.2)", "border": { "width": 1, "color": "rgba(0,150,136,1)", "style": "solid" }, "corner": { "topLeft": 8, "topRight": 8, "bottomLeft": 8, "bottomRight": 8 } }
```

```json
{ "type": "line", "transform": { "x": 0, "y": 50, "width": 200, "height": 1 }, "border": { "width": 1, "color": "rgba(0,0,0,1)", "style": "solid" } }
```

---

## 五、完整页面示例

一个登录页（含表单组件 + 图表）：

```json
{
  "type": "PAGE",
  "alias": "登录页",
  "id": "page_1785833475519",
  "width": 800,
  "height": 900,
  "bg": "rgba(255,255,255,1)",
  "parentid": null,
  "projectid": "testid",
  "guides": { "x": [], "y": [] },
  "nodes": [
    {
      "type": "text",
      "alias": "标题",
      "id": "sb_1001",
      "transform": { "x": 150, "y": 40, "width": 200, "height": 40 },
      "fontData": "欢迎登录",
      "font": { "size": 24, "color": "rgba(0,0,0,1)" },
      "align": { "x": "center", "y": "center" },
      "fontStyle": ["bold"]
    },
    {
      "type": "input",
      "alias": "账号",
      "id": "sb_1002",
      "transform": { "x": 120, "y": 120, "width": 240, "height": 32 },
      "fontData": "请输入账号",
      "border": { "width": 1, "color": "rgba(200,200,200,1)", "style": "solid" },
      "corner": { "topLeft": 4, "topRight": 4, "bottomLeft": 4, "bottomRight": 4 }
    },
    {
      "type": "input",
      "alias": "密码",
      "id": "sb_1003",
      "transform": { "x": 120, "y": 170, "width": 240, "height": 32 },
      "fontData": "请输入密码",
      "border": { "width": 1, "color": "rgba(200,200,200,1)", "style": "solid" },
      "corner": { "topLeft": 4, "topRight": 4, "bottomLeft": 4, "bottomRight": 4 }
    },
    {
      "type": "radio",
      "alias": "记住我",
      "id": "sb_1004",
      "transform": { "x": 120, "y": 220, "width": 120, "height": 24 },
      "radioOptions": "> 记住密码",
      "direction": "horizontal",
      "font": { "size": 12, "color": "rgba(80,80,80,1)" }
    },
    {
      "type": "button",
      "alias": "登录",
      "id": "sb_1005",
      "transform": { "x": 120, "y": 260, "width": 240, "height": 36 },
      "fontData": "登录",
      "bg": "rgba(0,150,136,1)",
      "font": { "size": 14, "color": "rgba(255,255,255,1)" },
      "align": { "x": "center", "y": "center" }
    },
    {
      "type": "chart",
      "alias": "月度统计",
      "id": "sb_1006",
      "chartType": "bar",
      "transform": { "x": 120, "y": 330, "width": 300, "height": 200 },
      "chartData": {
        "categories": ["1月", "2月", "3月", "4月"],
        "series": [{ "name": "访问量", "data": [1200, 1500, 980, 1600] }]
      }
    }
  ]
}
```

---

## 六、生成建议

1. **id 自己生成**：页面 id 用 **`page_` 前缀**，每个组件/节点（**包括嵌套 `items` 里的子组件**）用 **`sb_` 前缀**，直接提供全局唯一 id——**不要让框架自动生成**（见第一节说明）。
2. **坐标从 0 开始规划**：**所有组件一律绝对坐标**（相对画布原点，含嵌套 `items` 子组件）；**block 的 transform 必须包围其子组件**（= 子组件包围盒）。同排组件对齐 y、间距建议 8/16/24 的倍数。
3. **组件尺寸给足**：输入类 28-36px 高、按钮 ≥36px 高、图表 ≥200px 高，保证可读。
4. **颜色用 rgba**：`rgba(r,g,b,a)` 格式（a=0 透明）。
5. **文本内容放 `fontData`**（不是别的字段）。
6. **图表数据**：categories 与各 series.data 长度一致；不需要的系列配置（chartSeries/chartAxis）可省略。
7. **表单单选/多选**：选项换行分隔，`>` 标记默认选中。
8. 生成后可导入设计器微调（拖拽、属性面板、双击编辑数据）。
