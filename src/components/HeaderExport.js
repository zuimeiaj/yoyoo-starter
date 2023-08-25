/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react'
import { Form, message, Modal, Radio } from 'antd'
import { getPageData } from '../lib/util/page'
import GroupProperties from '../lib/properties/group'
import { toJSON } from '../lib/properties/types'
import { getCurrentControllersByPage, getCurrentPage } from '../lib/global/instance'
import { waitForSeconds } from '../lib/util/helper'
import CanvasRender from '../canvas'
import JSZip from 'jszip'
import FileSaver from 'file-saver'
import { getStore } from '../lib/global/store'
import config from '../lib/util/preference'
import IconText from '@/lib/ui/IconText'

const FormItem = Form.Item
const RadioGroup = Radio.Group
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
    for (let i = 0; i < pages.length; i++) {
      let imagedata = await this.renderPage(pages[i], imageType)
      folder.file(`${pages[i].alias}.${imageType}`, imagedata, { base64: true })
    }
  }
  renderPage = async (item, imageType, renderType = 'base64') => {
    let page = new GroupProperties()
    page = toJSON(page)
    page.transform = {
      isSingleObject: true,
      x: 0,
      y: 0,
      width: config.viewport.width,
      height: item.height,
    }
    page.border.color = 'none'
    page.bg = item.bg
    // 防止主线程被卡死
    await waitForSeconds(0.2)
    let items = await getCurrentControllersByPage(item.id)
    page.items = items
    let canvas = new CanvasRender()
    await canvas.renderCanvas(page, page.transform)
    let imagedata
    if (renderType == 'blob') {
      imagedata = await canvas.toBlob(imageType)
    } else {
      imagedata = canvas.toImage(0.92, imageType).replace(`data:image/${imageType};base64,`, '')
    }
    canvas.destroy() // clear
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
