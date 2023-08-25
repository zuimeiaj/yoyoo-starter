/**
 *  created by yaojun on 2019/1/16
 *
 */

import React from 'react'
import FileDrop from '../lib/ui/FileDrop'
import { Draggable } from '../lib/ui/NativeDragDrop'
import EditableLabel from '../lib/ui/EditableLabel'
import Icon from '../lib/Icon'
import { uploadFile } from '../api/user'
import { createMaterial, deleteMaterial, fetchAssets, updateMaterialName } from '../api/material'
import { getOSSUrl } from '../api/config'
import { message, Modal } from 'antd'
import { LazyLoad } from '../lib/ui/Image'
import Search from '../lib/ui/Search'
import { cleanEmpty } from '../lib/util/helper'
import Button from '../lib/ui/Button'
import CacheState from '@/lib/Base/CacheState'

export default class OutlineAssets extends CacheState {
  state = {
    list: [],
    source: [],
    result: {
      page: 1,
      pages: 1,
    },
    query: {
      name: '',
      pageIndex: 1,
      pageSize: 5,
    },
  }

  getCacheKey = () => {
    return 'outline/assets'
  }

  componentWillMount() {
    super.componentWillMount()
    !this.hasCacheData && this.refresh(Object.assign({}, this.state.query))
  }

  refresh = (query, reset = false) => {
    fetchAssets(cleanEmpty(query)).then((res) => {
      const { page, pages, docs } = res.data
      const resultdata = docs.map(this.convertData)
      const data = reset ? resultdata : this.state.list.concat(resultdata)
      this.setState({ result: { page, pages }, list: data })
    })
  }

  handleChange = async (files) => {
    let hide = message.loading('上传中...', 0)
    for (let i = 0; i < files.length; i += 1) {
      try {
        let file = files[i]
        let result = await uploadFile(file)
        result = await createMaterial({
          size: result.data.length,
          name: file.name,
          type: 'ASSET',
          url: result.data.filename,
        })
        if (!result.data) continue
        let list = this.state.list.concat([this.convertData(result.data)])
        this.setState({ list })
      } catch (e) {
        console.error(e)
      }
    }
    hide()
  }

  convertData = (data) => {
    return {
      name: data.name,
      id: data._id,
      data: getOSSUrl(data.url),
      url: data.url,
      type: 'image',
    }
  }

  handleNameChange = (value, id) => {
    updateMaterialName(id, value).then(() => {
      let index = this.state.list.findIndex((item) => item.id == id)
      let item = Object.assign({}, this.state.list[index])
      item.name = value
      this.state.list[index] = item
      this.setState({ list: this.state.list })
    })
  }

  handleDelete = (id, url) => {
    Modal.confirm({
      title: '提示',
      content: '确认要永久删除该素材吗？',
      onOk: () => {
        deleteMaterial(id, url).then((res) => {
          let index = this.state.list.findIndex((item) => item.id == id)
          this.state.list.splice(index, 1)
          this.setState({ list: this.state.list })
        })
      },
    })
  }

  handleSearch = (value) => {
    if (this.state.query.name == value) return
    let query = Object.assign({}, this.state.query, { name: value, pageIndex: 1 })
    this.refresh(query, true)
  }

  loadMore = () => {
    let query = Object.assign({}, this.state.query)
    query.pageIndex += 1
    this.refresh(query)
  }

  render() {
    return (
      <FileDrop onChange={this.handleChange} className="root-layout-side-assets">
        <div style={{ padding: 15, display: 'flex' }}>
          <Search placeholder={'资源名称'} onSearch={this.handleSearch} />
        </div>
        <div className={'side-assets_empty'}>
          <Icon type={'shangchuan'} />
          <div className={'side-assets_empty-text'}>拖拽图片到此处</div>
          <div className={'side-assets_empty_text'}>仅支持jpg、png格式图片</div>
        </div>
        {this.state.list.map((item, index) => {
          return (
            <WrapperAssetsItem
              handleDelete={this.handleDelete}
              handleNameChange={this.handleNameChange}
              item={item}
              key={item.id}
            />
          )
        })}

        {this.state.result.page < this.state.result.pages && (
          <div style={{ padding: 10 }}>
            <Button block className={'load-more'} onClick={this.loadMore}>
              加载更多
            </Button>
          </div>
        )}
      </FileDrop>
    )
  }
}

class WrapperAssetsItem extends React.PureComponent {
  render() {
    let { item, handleDelete, handleNameChange } = this.props
    return (
      <div className={'side-assets_image-item'}>
        <Draggable params={item}>
          <LazyLoad src={item.data} />
        </Draggable>
        <EditableLabel value={item.name} onChange={(v) => handleNameChange(v, item.id)} />
        <Icon onClick={() => handleDelete(item.id, item.url)} type={'delete'} />
      </div>
    )
  }
}
