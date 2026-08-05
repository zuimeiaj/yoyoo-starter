# 页面数据结构与组件属性文档（AI 生成页面用）

> 本文档描述在线可视化设计器（yoyoo）的**页面数据模型**与**全部组件属性**。
> AI 可按本文档直接生成页面 JSON，导入设计器即可渲染、继续编辑。
> 设计器在线地址：http://zuimeiaj.github.io/yoyoo/

---

## 一、整体结构

页面 = **items 数组**（组件树，`group`/`block` 可嵌套子组件）。

每个组件是一个 JSON 对象：**通用属性 + 类型特有属性**。`transform.x/y` 是相对父级（页面根组件相对画布原点）的坐标，单位 px。

```json
{
  "id": "可选，加载时自动生成",
  "alias": "组件名",
  "type": "text",
  "transform": { "x": 20, "y": 20, "width": 120, "height": 32, "rotation": 0 },
  "settings": { "isHide": false },
  "border": { "width": 1, "color": "rgba(224,224,224,1)", "style": "solid" },
  "bg": "rgba(255,255,255,0)",
  "font": { "size": 14, "color": "rgba(0,0,0,1)" }
}
```

> **id 必填唯一**：`id` 是组件索引键，**缺失会导致组件间 id 冲突（点击/选中错乱）**。加载时缺失的 id 会自动生成（`sb_` 前缀），但建议生成时直接提供唯一 id（如 `c1`、`c2`...），保证数据稳定。

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
| `group` | 分组 | `items`(子组件数组) |
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

### 10. 分组 group / 块 block

> **推荐平铺（重要）**：生成页面时**所有元素都用绝对坐标、不嵌套 group**——视觉卡片用背景 rect + 内部元素平铺实现（当前版本 group 子组件的父级坐标累加不可靠，嵌套会导致手柄/吸附错位）。group 类型仍可在设计器内手动创建。

平铺卡片示例（视觉同 group，坐标全部绝对）：

```json
{
  "type": "rect",
  "alias": "卡片背景",
  "transform": { "x": 100, "y": 1100, "width": 300, "height": 200 },
  "bg": "rgba(255,255,255,1)",
  "border": { "width": 1, "color": "rgba(224,224,224,1)", "style": "solid" },
  "corner": { "topLeft": 8, "topRight": 8, "bottomLeft": 8, "bottomRight": 8 }
},
{
  "type": "text",
  "alias": "卡片标题",
  "transform": { "x": 120, "y": 1120, "width": 200, "height": 30 },
  "fontData": "卡片标题",
  "font": { "size": 16, "color": "rgba(0,0,0,1)" }
}
```

> **嵌套 group 的注意**：如使用 `items`，子组件 `transform.x/y` 是**相对分组**的坐标——但当前版本对嵌套子组件的父级偏移计算不可靠（手柄位置/吸附会错位），**生成 JSON 请一律平铺绝对坐标**。

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
  "items": [
    {
      "type": "text",
      "alias": "标题",
      "transform": { "x": 150, "y": 40, "width": 200, "height": 40 },
      "fontData": "欢迎登录",
      "font": { "size": 24, "color": "rgba(0,0,0,1)" },
      "align": { "x": "center", "y": "center" },
      "fontStyle": ["bold"]
    },
    {
      "type": "input",
      "alias": "账号",
      "transform": { "x": 120, "y": 120, "width": 240, "height": 32 },
      "fontData": "请输入账号",
      "border": { "width": 1, "color": "rgba(200,200,200,1)", "style": "solid" },
      "corner": { "topLeft": 4, "topRight": 4, "bottomLeft": 4, "bottomRight": 4 }
    },
    {
      "type": "input",
      "alias": "密码",
      "transform": { "x": 120, "y": 170, "width": 240, "height": 32 },
      "fontData": "请输入密码",
      "border": { "width": 1, "color": "rgba(200,200,200,1)", "style": "solid" },
      "corner": { "topLeft": 4, "topRight": 4, "bottomLeft": 4, "bottomRight": 4 }
    },
    {
      "type": "radio",
      "alias": "记住我",
      "transform": { "x": 120, "y": 220, "width": 120, "height": 24 },
      "radioOptions": "> 记住密码",
      "direction": "horizontal",
      "font": { "size": 12, "color": "rgba(80,80,80,1)" }
    },
    {
      "type": "button",
      "alias": "登录",
      "transform": { "x": 120, "y": 260, "width": 240, "height": 36 },
      "fontData": "登录",
      "bg": "rgba(0,150,136,1)",
      "font": { "size": 14, "color": "rgba(255,255,255,1)" },
      "align": { "x": "center", "y": "center" }
    },
    {
      "type": "chart",
      "alias": "月度统计",
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

1. **坐标从 0 开始规划**：**所有元素一律使用绝对坐标**（相对画布原点），不要嵌套 group（见 10 节）。同排组件对齐 y、间距建议 8/16/24 的倍数。
2. **组件尺寸给足**：输入类 28-36px 高、按钮 ≥36px 高、图表 ≥200px 高，保证可读。
3. **颜色用 rgba**：`rgba(r,g,b,a)` 格式（a=0 透明）。
4. **文本内容放 `fontData`**（不是别的字段）。
5. **图表数据**：categories 与各 series.data 长度一致；不需要的系列配置（chartSeries/chartAxis）可省略。
6. **表单单选/多选**：选项换行分隔，`>` 标记默认选中。
7. 生成后可导入设计器微调（拖拽、属性面板、双击编辑数据）。
