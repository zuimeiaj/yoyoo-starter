/**
 *  created by yaojun on 2019/5/14
 *
 */
import React from "react";
import {deleteTemplate, fetchTemplate} from "@/api/material";
import Icon from "@/lib/Icon";
import '@/components/Panel/MaterialPanel.scss'
import {Button, Form, Input, message, Modal} from 'antd'
import Event from "@/lib/Base/Event";
import {outline_closable_panel_show} from "@/lib/util/actions";
import UploadImage from "@/lib/ui/UploadImage";
import {deleteLib, findAllLib, publishToUILibrary} from "@/api/uilib";
import {getOSSUrl} from "@/api/config";

export default class MaterialPanel extends React.Component{
    state = {
        query : {
            pageSize : 20,
            pageIndex : 1
        },
        total : 1,
        template : [],
        checkedCount : 0,
        visible : false,
        isUI : false
    }
    
    componentWillMount(){
        Event.listen(outline_closable_panel_show, this.handleShow)
    }
    
    componentWillUnmount(){
        Event.listen(outline_closable_panel_show, this.handleShow)
    }
    
    handleShow = (title)=>{
        console.log(title)
        if(title == '模板') {
            this.reload()
        }
    }
    fetch = (q, load)=>{
        fetchTemplate(q).then(async(res)=>{
            let items = res.data.docs;
            for(let i = 0; i < items.length; i += 1) {
                let item = items[i]
                let content = item.content
                content.name = item.name
                content.base64 = item.base64
                content._id = item._id
                content.onCheck = this.handleCheck(item._id)
                items[i] = content
            }
            this.setState({
                isUI : false,
                total : res.data.pages,
                template : load ? this.state.template.concat(items) : items
            })
        })
    }
    loadMore = ()=>{
        let q = this.state.query
        q.pageIndex += 1
        this.fetch(q, true)
    }
    handleCheck = (id)=>{
        return ()=>{
            let list = this.state.template
            let index = list.findIndex((item)=>item._id == id)
            let item = Object.assign({}, list[index])
            item.checked = !item.checked
            list[index] = item
            this.setState({template : list, checkedCount : this.state.checkedCount + (item.checked ? 1 : -1)})
        }
    }
    batchDelete = ()=>{
        Modal.confirm({
            title : '提示',
            content : `您将要删除${this.state.checkedCount}个组件，删除后数据将不可恢复。确认继续？`,
            onOk : async()=>{
                let after = []
                let del = []
                this.state.template.forEach(item=>{
                    if(item.checked) del.push(item._id)
                    else after.push(item)
                })
                if(this.state.isUI) {
                    await deleteLib(del)
                } else {
                    await deleteTemplate(del)
                }
                this.setState({template : after, checkedCount : 0})
            }
        })
    }
    makeGroup = ()=>{
        this.setState({visible : true})
    }
    publish = async(value)=>{
        let list = this.state.template.filter(item=>item.checked).map(item=>{
            return {
                name : item.name,
                data : item.base64
            }
        })
        value = Object.assign({}, value)
        value.content = list
        await publishToUILibrary(value)
        message.success('发布成功了')
        this.setState({visible : false, checkedCount : 0})
    }
    close = ()=>{
        this.setState({visible : false})
    }
    reload = ()=>{
        let q = this.state.query
        q.pageIndex = 1
        this.setState({isUI : false})
        this.fetch(q)
    }
    fetchSelfUI = (q = {}, load)=>{
        findAllLib({creator : '1', ...q}).then((res)=>{
            let data = res.data.docs.map(item=>{
                item.image = getOSSUrl(item.icon)
                item.onCheck = this.handleCheck(item._id)
                return item
            })
            this.setState({
                isUI : true,
                template : load ? this.state.template.concat(data) : data,
                query : q
            })
        })
    }
    reloadSelfUI = ()=>{
        let q = this.state.query
        q.pageIndex = 1
        this.setState({isUI : true})
        this.fetchSelfUI(q)
    }
    loadMoreForSelfUI = ()=>{
        let q = this.state.query
        q.pageIndex += 1
        this.fetchSelfUI(q, true)
    }
    loadWithMode = ()=>{
        if(this.state.isUI) {
            this.loadMoreForSelfUI()
        } else {
            this.loadMore()
        }
    }
    
    render(){
        let hasChecked = this.state.checkedCount > 0
        return (<div>
            <div className={'material-panel_operation-bar'}>
                <span className={'selected'}>已选择：{this.state.checkedCount}</span>
                
                <span className={'extra'}>
                    {hasChecked && <Button onClick={this.batchDelete} type={'danger'}>删除</Button>}
                    {hasChecked && !this.state.isUI && <Button onClick={this.makeGroup} type={'primary'}>创建分组</Button>}
                    <Button onClick={this.reload}>组件</Button>
                    <Button onClick={this.reloadSelfUI}>UI库</Button>
                </span>
            </div>
            <ul style={{overflow : 'hidde'}}>
                {
                    this.state.template.map(item=>{
                        return <MaterialItem key={item._id} item={item}/>
                    })
                }
            </ul>
            {this.state.query.pageIndex < this.state.total &&
            <Button onClick={this.loadWithMode} type={'primary'}>加载更多</Button>}
            <LibModal onCancel={this.close} onOk={this.publish} visible={this.state.visible}/>
        </div>)
    }
}

class MaterialItem extends React.PureComponent{
    render(){
        const {image, name, _id, checked, onCheck} = this.props.item;
        return (
            <li onClick={onCheck} className={`closable-panel-item ${checked ? 'checked' : ''}`}>
                <div style={{backgroundImage : `url(${image})`}} className={'icon'}/>
                <div className={'name'}>
                    <span>{name}</span>
                    {onCheck && <Icon type={'checkbox_checked'}/>}
                </div>
            </li>
        )
    }
}

const FormItem = Form.Item
const LibModal = Form.create()(class extends React.Component{
    validate = ()=>{
        this.props.form.validateFields((error, value)=>{
            if(error) return
            this.props.onOk(value)
        })
    }
    
    render(){
        const {getFieldDecorator} = this.props.form
        const {onCancel, visible} = this.props
        return (
            <Modal onCancel={onCancel} onOk={this.validate} visible={visible} title={'操作'}>
                <Form>
                    <FormItem label={'名称'}>
                        {
                            getFieldDecorator('name')(<Input data-event={'ignore'}/>)
                        }
                    </FormItem>
                    <FormItem label={'封面'}>
                        {
                            getFieldDecorator('icon')(<UploadImage/>)
                        }
                    </FormItem>
                </Form>
            </Modal>)
    }
})