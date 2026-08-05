/**
 *  created by yaojun on 2026/8/5
 *
 *  预览弹窗：点击顶部"预览"后全屏遮罩，只读渲染当前页面，右上角关闭。
 *  只读实现：与 MasterView.mark 同策略，递归标记 isInMaster=true，
 *  组件不会挂载 Draggable/双击编辑/滚动监听（见 ViewController.componentDidMount）
 *
 *  运行时支持（右侧属性面板配置的数据）：
 *   - 交互 interactions：[{ e: 事件, o: 操作, t: [{id,alias}], a: 动画 }]
 *     事件 click/dbclick/enter/leave，操作 jump 跳转页面 / play 播放动画 / show hide toggle 显示隐藏
 *   - 动画 animations：{ n: 效果, d: 延时(秒), s: 速度, l: 循环 }，进入页面时播放
 *  实现：preview-page 容器事件委托（组件 DOM 带 data-uid），DOM 直接操作播放动画/显隐
 */
import React from 'react'
import './Preview.scss'
import '../lib/ui/AnimationBasic.css' // animate.css keyframes（属性面板动画效果的运行时 CSS，全库仅预览需要）
import Event from '../lib/Base/Event'
import { preview_close, preview_open } from '../lib/util/actions'
import { getCurrentPage } from '../lib/global/instance'
import { getPageDataWithId } from '../lib/util/page'
import { parseJSON } from '../lib/properties/types'
import View from '../lib/Widget/View'
import LinkLayer from '../lib/Widget/LinkLayer'
import IconText from '@/lib/ui/IconText'

// 速度选项 key → 动画时长（与 animate.css 一致）
const SPEED_DURATION = { faster: '500ms', fast: '800ms', slow: '2s', slower: '3s' }

// 递归标记只读：block/group 的子节点也一并处理
function markInMaster(items) {
  items.forEach((item) => {
    item.isInMaster = true
    if (item.items && item.items.length > 0) markInMaster(item.items)
  })
}

// 按 id 在树中查找节点（block/group 子节点）
function findItem(items, id) {
  for (let i = 0; i < items.length; i++) {
    let item = items[i]
    if (item.id == id) return item
    if (item.items && item.items.length > 0) {
      let found = findItem(item.items, id)
      if (found) return found
    }
  }
  return null
}

export default class Preview extends React.Component {
  state = {
    visible: false,
    pageId: null,
    page: null,
    items: [],
    scale: 1,
  }

  componentWillMount() {
    Event.listen(preview_open, this.handleOpen)
    Event.listen(preview_close, this.handleClose)
  }

  componentWillUnmount() {
    Event.destroy(preview_open, this.handleOpen)
    Event.destroy(preview_close, this.handleClose)
    window.removeEventListener('keydown', this.handleKeyDown, true)
    window.removeEventListener('resize', this.handleResize)
    document.body.style.overflow = ''
  }

  handleOpen = () => {
    let page = getPageDataWithId(getCurrentPage())
    if (!page) return
    this.openPage(page)
  }

  // 打开/跳转页面：解析节点并渲染，随后播放该页初始动画
  openPage = (page) => {
    if (this.state.pageId === page.id) return
    let items = parseJSON(page.nodes, true)
    markInMaster(items)
    // 锁住背景滚动，避免遮罩下层编辑器跟随滚动
    document.body.style.overflow = 'hidden'
    this.setState({ visible: true, pageId: page.id, page, items }, () => {
      if (!this._listening) {
        // capture 阶段监听：Events.js 的 document keydown 对所有键 stopPropagation，冒泡阶段收不到
        window.addEventListener('keydown', this.handleKeyDown, true)
        window.addEventListener('resize', this.handleResize)
        this._listening = true
      }
      this.updateScale()
      this.playInitialAnimations()
    })
  }

  handleClose = () => {
    this.setState({ visible: false, pageId: null, page: null, items: [] })
    window.removeEventListener('keydown', this.handleKeyDown, true)
    window.removeEventListener('resize', this.handleResize)
    this._listening = false
    document.body.style.overflow = ''
  }

  handleKeyDown = (e) => {
    // capture 阶段拦截所有按键：避免快捷键（Delete/Ctrl+Z 等）误操作遮罩后的编辑区
    e.stopPropagation()
    if (e.keyCode === 27) this.handleClose() // Esc 关闭
  }

  handleResize = () => {
    if (this.state.visible) this.updateScale()
  }

  // 页面按实际尺寸渲染，等比缩放适配视口（最大放大 2 倍避免小页面拉伸模糊）
  updateScale = () => {
    let { page } = this.state
    if (!page) return
    let pad = 96 // 上下留白（容纳标题/关闭按钮）
    let scale = Math.min(
      (window.innerWidth - 48) / page.width,
      (window.innerHeight - pad) / page.height,
      2
    )
    if (scale !== this.state.scale) this.setState({ scale })
  }

  handleMaskMouseDown = () => this.handleClose()

  handlePageMouseDown = (e) => e.stopPropagation()

  /* ==================== 交互（interactions） ==================== */

  // 从事件目标向上找最近的组件容器（组件 DOM 均带 data-uid）
  getUid = (e) => {
    let target = e.target
    while (target && target !== e.currentTarget) {
      if (target.dataset && target.dataset.uid) return target.dataset.uid
      target = target.parentNode
    }
    return null
  }

  handlePreviewEvent = (eventKey) => (e) => {
    let uid = this.getUid(e)
    if (!uid) return
    let item = findItem(this.state.items, uid)
    if (!item || !item.interactions || item.interactions.length === 0) return
    item.interactions.forEach((it) => {
      if (it.e !== eventKey || !it.t || it.t.length === 0) return
      let targetId = it.t[0].id
      if (it.o === 'jump') {
        // 跳转页面：预览内切换渲染目标页面
        let page = getPageDataWithId(targetId)
        if (page) this.openPage(page)
      } else if (it.o === 'play') {
        // 播放动画：交互配置的 a 为动画 key
        this.playAnimationOnDom(this.findDomByUid(targetId), it.a, {})
      } else if (it.o === 'show' || it.o === 'hide' || it.o === 'toggle') {
        // 显示/隐藏目标组件
        this.toggleTarget(targetId, it.o)
      }
    })
  }

  toggleTarget = (uid, op) => {
    let dom = this.findDomByUid(uid)
    if (!dom) return
    if (op === 'show') dom.style.display = ''
    else if (op === 'hide') dom.style.display = 'none'
    else if (op === 'toggle') dom.style.display = dom.style.display === 'none' ? '' : 'none'
  }

  /* ==================== 动画（animations） ==================== */

  findDomByUid = (uid) => {
    let page = this.refs.page
    return page ? page.querySelector('[data-uid="' + uid + '"]') : null
  }

  // 进入页面时播放初始动画：遍历整棵树，对配置了 animations.n 的组件播放
  playInitialAnimations = () => {
    let items = this.state.items
    let walk = (list) => {
      list.forEach((item) => {
        let a = item.animations
        if (a && a.n) {
          this.playAnimationOnDom(this.findDomByUid(item.id), a.n, a)
        }
        if (item.items && item.items.length > 0) walk(item.items)
      })
    }
    walk(items)
  }

  playAnimationOnDom = (dom, key, cfg) => {
    if (!dom || !key) return
    let cfgObj = cfg || {}
    // 重新触发动画：先移除 class 并强制 reflow
    dom.classList.remove('animated', key)
    void dom.offsetWidth
    dom.classList.add('animated', key)
    dom.style.animationDelay = (cfgObj.d || 0) + 's'
    dom.style.animationDuration = SPEED_DURATION[cfgObj.s] || '1s'
    let loop = cfgObj.l
    dom.style.animationIterationCount = loop === 'infinite' ? 'infinite' : loop == null || loop === 0 ? 1 : loop
    // 有限次播放结束后移除 class，避免残留影响后续交互重播；无限循环不需要清理
    if (loop !== 'infinite') {
      dom.addEventListener(
        'animationend',
        () => {
          dom.classList.remove('animated', key)
        },
        { once: true }
      )
    }
  }

  /* ==================== 渲染 ==================== */

  render() {
    let { visible, page, items, scale } = this.state
    if (!visible || !page) return null
    return (
      <div className={'preview-mask'} onMouseDown={this.handleMaskMouseDown}>
        <div className={'preview-title'}>{page.alias || '预览'}</div>
        <div
          ref={'page'}
          className={'preview-page'}
          onMouseDown={this.handlePageMouseDown}
          onClick={this.handlePreviewEvent('click')}
          onDoubleClick={this.handlePreviewEvent('dbclick')}
          onMouseEnter={this.handlePreviewEvent('enter')}
          onMouseLeave={this.handlePreviewEvent('leave')}
          style={{
            width: page.width,
            height: page.height,
            background: page.bg || '#ffffff',
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {items.map((item) => (
            <View key={item.id} type={item.type} properties={item} />
          ))}
          {/* 连线层（只读渲染，坐标由 transform 实时计算，样式跟随页面 linkStyle） */}
          <LinkLayer items={items} linkStyle={page.linkStyle} />
        </div>
        <IconText className={'preview-close'} icon={'guanbi'} onClick={this.handleClose}>
          关闭
        </IconText>
      </div>
    )
  }
}
