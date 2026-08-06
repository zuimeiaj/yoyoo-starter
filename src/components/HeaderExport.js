/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react'
import { Form, message, Modal, Radio } from 'antd'
import { getPageData } from '../lib/util/page'
import { getCurrentPage } from '../lib/global/instance'
import { waitForSeconds } from '../lib/util/helper'
import CanvasRender from '../canvas'
import JSZip from 'jszip'
import FileSaver from 'file-saver'
import { getStore } from '../lib/global/store'
import config from '../lib/util/preference'
import IconText from '@/lib/ui/IconText'
import Event from '../lib/Base/Event'
import { controllers_change, outline_page_select } from '../lib/util/actions'

const FormItem = Form.Item
const RadioGroup = Radio.Group

/**
 * 切换到指定页面并等待 DOM 渲染完成
 */
function switchToPage(pageId) {
  return new Promise((resolve) => {
    const onControllersChange = () => {
      Event.destroy(controllers_change, onControllersChange)
      setTimeout(resolve, 400)
    }
    Event.listen(controllers_change, onControllersChange)
    Event.dispatch(outline_page_select, pageId)
  })
}

export default class HeaderExport extends React.Component {
  handleClick = (e) => {
    e.stopPropagation()
    let value = 'current'
    let type = 'jpeg'
    Modal.confirm({
      title: '导出项目页面',
      content: (
        <div>
          <FormItem label="导出图片格式">
            <RadioGroup onChange={(e) => (type = e.target.value)} defaultValue={'jpeg'}>
              <Radio value={'jpeg'}>JPEG</Radio>
              <Radio value={'png'}>PNG</Radio>
            </RadioGroup>
          </FormItem>
          <FormItem extra={'选择导出项目可能需要一些时间，请耐心等待'} label={'请选择要导出的页面'}>
            <RadioGroup onChange={(e) => (value = e.target.value)} defaultValue={'current'}>
              <Radio value={'current'}>当前页面</Radio>
              <Radio value={'project'}>项目所有页面</Radio>
            </RadioGroup>
          </FormItem>
        </div>
      ),
      onOk: () => {
        this.makePages(value, type)
        message.success('打包完成后，浏览器会自动下载数据')
      },
    })
  }

  renderPages = async (pages, folder, imageType) => {
    const originalPage = getCurrentPage()
    for (let i = 0; i < pages.length; i++) {
      await switchToPage(pages[i].id)
      let imagedata = await this.renderPage(pages[i], imageType)
      folder.file(`${pages[i].alias}.${imageType}`, imagedata, { base64: true })
    }
    if (originalPage) {
      await switchToPage(originalPage)
    }
  }

  /**
   * 从当前 DOM 渲染页面为图片
   *
   * 创建干净的导出容器，克隆组件 DOM 进去，然后用 html2canvas 截取。
   * 不使用原始 .editor-control-panel 是因为它有 Stage 的 zoom/pan transform。
   */
  renderPage = async (item, imageType, renderType = 'base64') => {
    const sourcePanel = document.querySelector('.editor-control-panel')
    if (!sourcePanel) {
      console.error('Editor control panel not found in DOM')
      return ''
    }

    await waitForSeconds(0.2)

    const pageWidth = config.viewport.width
    const pageHeight = item.height
    const pageBg = item.bg || '#ffffff'

    // 创建干净的导出容器
    const exportContainer = document.createElement('div')
    exportContainer.className = 'canvas-save-as-image'
    Object.assign(exportContainer.style, {
      position: 'relative',
      width: pageWidth + 'px',
      height: pageHeight + 'px',
      backgroundColor: pageBg,
      overflow: 'hidden',
    })

    // 克隆所有 .aj-component 元素到导出容器
    // cloneNode(true) 保留 inline style，position:absolute 在 relative 容器内正确定位
    const components = sourcePanel.querySelectorAll('.aj-component')
    components.forEach((el) => {
      exportContainer.appendChild(el.cloneNode(true))
    })

    // 连线层导出：html2canvas 不支持内联 SVG（渲染为空白），且原导出未克隆 .link-layer 导致连线丢失。
    // 将 SVG 序列化为 data URL 图片，以 <img> 形式加入导出容器 —— 连线层与组件同坐标系
    // （absolute 0,0 铺满 20000×20000），裁剪到页面尺寸后 1:1 映射，位置与组件对齐
    const linkLayer = sourcePanel.querySelector('.link-layer')
    if (linkLayer && linkLayer.querySelectorAll('path[stroke]').length > 0) {
      const svg = linkLayer.cloneNode(true)
      // 独立 SVG 必须显式 xmlns（React 内联渲染时省略），否则 data URL 图片无法解析
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      svg.setAttribute('width', pageWidth)
      svg.setAttribute('height', pageHeight)
      svg.style.width = pageWidth + 'px'
      svg.style.height = pageHeight + 'px'
      const svgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg))
      const img = document.createElement('img')
      Object.assign(img.style, {
        position: 'absolute',
        left: 0,
        top: 0,
        width: pageWidth + 'px',
        height: pageHeight + 'px',
        pointerEvents: 'none',
      })
      img.src = svgData
      exportContainer.appendChild(img)
    }

    // 放入屏幕内可见位置（html2canvas 需要元素在可见区域内）
    const wrapper = document.createElement('div')
    wrapper.className = 'canvas-save-as-image'
    Object.assign(wrapper.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      zIndex: '999999',
    })
    wrapper.appendChild(exportContainer)
    document.body.appendChild(wrapper)

    // 等待浏览器完成布局
    await waitForSeconds(0.3)

    let canvas = new CanvasRender()
    await canvas.renderFromDOM(exportContainer, {
      width: pageWidth,
      height: pageHeight,
      backgroundColor: pageBg,
    })

    let imagedata
    if (renderType == 'blob') {
      imagedata = await canvas.toBlob(imageType)
    } else {
      imagedata = canvas.toImage(0.92, imageType).replace(`data:image/${imageType};base64,`, '')
    }
    canvas.destroy()
    wrapper.remove()
    return imagedata
  }

  makePages = async (value, imageType) => {
    let pages = getPageData()
    if (value == 'current') {
      pages = pages.filter((item) => item.id == getCurrentPage())
      let imagedata = await this.renderPage(pages[0], imageType, 'blob')
      FileSaver.saveAs(imagedata, pages[0].alias + '.' + imageType)
    } else {
      let zip = new JSZip()
      let folder = zip.folder('pages')
      await this.renderPages(pages, folder, imageType)
      let project = getStore('project')
      const content = await zip.generateAsync({ type: 'blob' })
      FileSaver.saveAs(content, project.name + '.zip')
    }
  }

  render() {
    return (
      <IconText className={'header_action-item'} onClick={this.handleClick} icon={'xiazai'}>
        导出
      </IconText>
    )
  }
}
