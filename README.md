## 简介

在线可视化网页生成工具，可导出图片。模板自定义组件和图片上传随服务端功能去掉了。目前只是一个简单的单机版，数据会存储到 localstorage
该项目还有一个配套的预览功能，由于去掉了服务端的功能所以，该预览功能无法展示

项目主要思路：
组件通信方式：通过使用eventbus来解决各个组件的通信，核心框架提供一系列事件，来实现自定义插件功能。
主要模块有：
  1、预置组件模块，提供了一个基类（ViewController），实现自定义组件需要继承该类。该类自带了拖拽缩放旋转双击编辑等一系列功能。通过实现renderContent函数来自定义组件的内容
  2、如果自定义的组件需要有自己的参数输入时，可配置属性检查器。属性检查器会在组件被选中中时展示，并接受输入，输入的参数会触发组件的propsChange函数，用于响应参数变化来同步组件的更新。定义属性检查器需要继承 ViewProperties 。该类包含了基础的通用属性，如位置属性、边框属性、背景属性、动画属性等。
  3、ICON ，目前icon都来自于iconfont网站。
  4、快捷键模块，由于快捷配置存放在服务端，服务端功能去掉后写死在前端了。没有放出来
  5、图片导出模块，在src/canvas目录下。每个可拖拽的组件都必须有一个canvas组件的实现，用于图片导出。canvas的实现同样有基类，需要继承 CanvasView 该类提供了基础的绘制功能。

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


## 自定义图片导出需要需要继承 CanvasView
```javascript
// 在 src/canvas 下创建自定义组件对应的canvas实现
import CanvasView from "./CanvasView";
export default class CusomtCanvasComponentView extends CanvasView{
    // 重写draw函数实现图形绘制
    draw(){
      // 使用this.ctx来绘图
    }
}

// 然后在 src/canvas/index.js 将组件加入到map中。渲染器会根据组件的name属性找到对应的canvas实现来绘图。

```


## 特色
- 支持自定义可视化组件，所有的组件需要继承ViewController 即可
- 支持自定义组件属性可视化编辑
- 支持无限制嵌套、旋转、拖拽、缩放
- 支持批量选择操作
- 支持自定义快捷键
- 支持canvas自定义实现，用于导出图片
- 丰富的事件，可实现框架的事件为框架提供功能支持，如对齐线 对齐高亮 位置提示都是实现框架提供的事件
- 实时保存到缓存，可监听保存事件，将数据同步至服务器
- 支持自定义右键菜单，每个自定义组件都可以定义自己的弹出菜单
- 支持母版创建，和添加到组件的功能
- 高性能，第三方依赖很少。后期引入了antdesign。
- 支持移动端触摸使用，没啥实际用处
- [在线地址 http://zuimeiaj.github.io/yoyoo/ ](http://zuimeiaj.github.io/yoyoo/)
