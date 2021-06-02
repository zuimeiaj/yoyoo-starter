## 简介

在线可视化网页生成工具，可导出图片

## 安装

```
npm install && npm start

```

## 自定义组件扩展

```javascript
// 在lib/widget 下创建一个自定义组件

import React from "react";
import ViewController from "./ViewController";

export default class YourCustomComponent extends ViewController {
  renderContent(){
    return <div>自定义组件</div>
  }
}

// 然后在 src/lib/Widget/View.js里面 配置你的组件
// 框架会根据配置的key去实例化你的组件

```
## 自定义属性可视化编辑器
```javascript
// 在 lib/properties 下创建一个组件属性
import ViewProperties from "./base";

export default class YourComponentProperty extends ViewProperties{
    constructor(){
        super()
        // 你的自定义组件类型
        this.type = 'group'
        // 你的自定义组件名称
        this.alias = '分组'
        
        // 扩展你自己的属性
        this.customPxx1='xxx'
    }
}

// 然后在 ib/properties/types.js 里面声明你的组件属性
// 声明后，当组件在编辑器中被选中时，属性编辑器会根据你配置的名称来实例化

```


## 特色
- 支持自定义可视化组件，所有的组件需要继承ViewController 即可
- 支持自定义组件属性可视化编辑
- 支持无限制嵌套、旋转、拖拽、缩放
- 支持批量选择
- 支持自定义快捷键
- 支持canvas自定义实现
- 丰富的事件，可实现框架的事件为框架提供功能支持
- 实时保存到缓存，可监听保存事件，将数据同步至服务器
- 支持自定义右键菜单
- 支持母版
- 高性能，第三方依赖很少。
- 支持移动端触摸使用
- 支持自动对齐参考线
- 支持网格对齐
[效果](https://yoyoo.vivw.org/)
