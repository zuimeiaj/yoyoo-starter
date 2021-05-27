/**
 *  created by yaojun on 2019/1/16
 *
 */
import React from 'react'
import { Draggable } from '../lib/ui/NativeDragDrop'
import { updateAlias } from '../lib/global/template'
import EditableLabel from '../lib/ui/EditableLabel'
import Icon from '../lib/Icon'
import { deleteTemplate, updateMaterialName } from '../api/material'
import { Icon as AntIcon, Modal } from 'antd'
import Event from '../lib/Base/Event'
import { workspace_save_template_success } from '../lib/util/actions'
import { fetchMaster, setMasterToStore } from '@/api/master'
import event from '@/lib/Base/Event'
import { context_outline_delete_master } from '@/lib/util/actions'
import { getQuery } from '@/lib/util/helper'

export const imageCache = {}

class OutlinePrefabs extends React.Component {
  state = {
    template: [],
    data: [],
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

  componentWillMount() {
    Event.listen(workspace_save_template_success, this.handleCreate)
    this.refresh(Object.assign({}, this.state.query))
  }

  refresh = (query, reset = false) => {
    fetchMaster().then((res) => {
      const { pages, page, docs } = res.data
      const resultdata = docs.map((item) => {
        let content = item.content
        content._id = item._id
        content.name = item.name
        return content
      })
      this.setState({
        template: reset ? resultdata : this.state.template.concat(resultdata),
        result: { page, pages },
        query,
      })
    })
  }

  componentWillUnmount() {
    Event.destroy(workspace_save_template_success, this.handleCreate)
  }

  handleCreate = ({ type, data }) => {
    if (type == 'MASTER') {
      this.setState({ template: [data].concat(this.state.template) })
    }
  }
  handleChange = (id, value) => {
    updateMaterialName(id, value).then(() => {
      let index = this.state.template.findIndex((item) => item._id == id)
      let data = Object.assign({}, this.state.template[index])
      data.name = value
      this.state.template[index] = data
      this.setState({ template: this.state.template })
    })
  }
  handleDelete = (id) => {
    Modal.confirm({
      title: '提示',
      content: '母版删除后，所有引用该母版的数据都将被删除。确认继续',
      onOk: () => {
        deleteTemplate(id).then((res) => {
          let data = this.state.template
          let index = data.findIndex((item) => item._id == id)
          data.splice(index, 1)
          event.dispatch(context_outline_delete_master, id)
          setMasterToStore(id)
          this.setState({ template: data })
        })
      },
    })
  }
  handleEdit = (id) => {
    this.props.history.replace('/app?p=' + getQuery().p + '&m=' + id)
  }

  render() {
    return (
      <div className="root-layout-side-assets root-layout-side-master">
        {this.state.template.map((item) => {
          return <WrapperIamgeItem item={item} key={item._id} handleEdit={this.handleEdit} handleChange={this.handleChange} handleDelete={this.handleDelete} />
        })}

        {this.state.template.length === 0 && (
          <div className={'side-prefabs_tips'}>
            <Icon type={'jianyi'} />
            <div className={'side-prefabs_tips-text'}>
              在工作面板中选中组件，点击右键菜单，设为为母版。
              <br />
              注意：母版的应用范围仅限于项目中，当母版被修改后，项目所有使用该母版的页面都会自动同步更新
            </div>
          </div>
        )}
      </div>
    )
  }
}

class WrapperIamgeItem extends React.PureComponent {
  render() {
    let { item, handleDelete, handleChange, handleEdit } = this.props
    return (
      <div className={'side-assets_image-item'}>
        <Draggable params={item}>{item.image ? <img src={item.image} /> : <AntIcon type={'loading'} />}</Draggable>
        <EditableLabel value={item.name} onChange={(value) => handleChange(item._id, value)} />
        <Icon onClick={() => handleDelete(item._id)} type={'delete'} />
        <Icon onClick={() => handleEdit(item._id)} type={'edit'} />
      </div>
    )
  }
}

export default OutlinePrefabs
