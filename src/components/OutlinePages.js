/**
 *  created by yaojun on 2019/4/11
 *
 */
import React from "react";
import Button from "../lib/ui/Button";
import {Tree} from "../lib/ui/TreeNode";
import {createNewPage, duplicatePageState, getPageData, setPageData, updateName} from "../lib/util/page";
import Event from "../lib/Base/Event";
import {outline_page_delete, outline_page_select, pages_load_end} from "../lib/util/actions";
import arrayToTree from 'array-to-tree'
import Search from "../lib/ui/Search";
import jQuery from 'jquery'
import {Form, Modal, Radio, Tooltip} from 'antd'
import Icon from "../lib/Icon";
import {getQuery} from "../lib/util/helper";

const FormItem = Form.Item
const RadioGroup = Radio.Group
export default class OutlinePages extends React.Component{
    state = {
        data : []
    }
    
    componentDidMount(){
        if(getPageData().length > 0) {
            this.refresh()
            this.autoSelectPage()
        }
        Event.listen(pages_load_end, this.handlePageLoadEnd)
    }
    
    componentWillUnmount(){
        Event.destroy(pages_load_end, this.handlePageLoadEnd)
    }
    
    handlePageLoadEnd = (pages)=>{
        setPageData(pages)
        this.refresh()
        this.autoSelectPage()
    }
    autoSelectPage = ()=>{
        if(getPageData().length == 0) return
        setTimeout(()=>{
            let screen = getQuery().s
            if(screen) localStorage.setItem('selected-page', screen)
            let id = localStorage.getItem('selected-page')
            id = id || getPageData()[0].id
            if(id) {
                jQuery(this.refs.wrapper).find(`#treenode${id}`).addClass('selected');
                this.handleSelect(null, id)
            }
        }, 20)
    }
    refresh = ()=>{
        let data = getPageData()
        data = arrayToTree(data, {
            parentProperty : 'parentid',
            childrenProperty : 'items'
        })
        this.setState({data})
    }
    handleSelect = (path, id)=>{
        let wrapper = jQuery(this.refs.wrapper)
        wrapper.find('.selected').removeClass('selected')
        wrapper.find(`#treenode${id}`).addClass('selected');
        Event.dispatch(outline_page_select, id)
    }
    handleCreate = async()=>{
        await createNewPage()
        this.refresh()
    }
    handleCreateSub = async(id)=>{
        await createNewPage(id)
        this.refresh()
    }
    _getSubPages = (item)=>{
        let pages = []
        const loop = (items)=>{
            for(let i = 0; i < items.length; i += 1) {
                let obj = items[i]
                pages.push(obj.id)
                if(obj.items && obj.items.length > 0) loop(obj.items)
            }
        }
        pages.push(item.id)
        loop(item.items)
        return pages
    }
    findPageId = (id)=>{
        let findItem = (items)=>{
            for(let i = 0; i < items.length; i += 1) {
                let item = items[i]
                if(item.id === id) {
                    return item
                } else if(item.items && item.items.length > 0) {
                    let find = findItem(item.items)
                    if(find) return find
                }
            }
        }
        return findItem(this.state.data)
    }
    handleDelete = (id)=>{
        let item = this.findPageId(id)
        let hasChildren = item.items && item.items.length > 0
        let value = 'current'
        let content = hasChildren ? (<FormItem label={'要删除的页面'}>
            <RadioGroup onChange={e=>value = e.target.value} defaultValue={value}>
                <Radio value={'current'}>当前页面</Radio>
                <Radio value={'all'}>所有子页面</Radio>
            </RadioGroup>
        </FormItem>) : '确认删除该页面吗'
        Modal.confirm({
            title : "提示",
            content : content,
            onOk : ()=>{
                if(hasChildren && value == 'all') {
                    let ids = this._getSubPages(item)
                    Event.dispatch(outline_page_delete, ids)
                } else {
                    Event.dispatch(outline_page_delete, id)
                }
                item = null
                value = null
                this.refresh()
            }
        })
    }
    handleNameChange = (path, id, name)=>{
        updateName(name, id)
        this.refresh()
    }
    handleSearch = (value)=>{
        if(!value) return this.refresh()
        let data = getPageData()
        data = data.filter(item=>item.alias.indexOf(value) > -1)
        data = arrayToTree(data, {
            parentProperty : 'parentid',
            childrenProperty : 'items'
        })
        this.setState({data})
    }
    handleCreateSubState = async(id)=>{
        await createNewPage(id, 'STATE')
        this.refresh()
    }
    handleDuplicate = async(id, pid)=>{
        await duplicatePageState(id, pid)
        this.refresh()
    }
    renderActions = ({type, id})=>{
        let actions = []
        if(type == 'STATE') {
            actions.push(<Tooltip key={'copy'} title={'创建副本'}><span
                onClick={()=>this.handleDuplicate(id)}><Icon
                type={'fuzhi'}/></span></Tooltip>)
        }
        if(type == 'PAGE') {
            actions.push(<Tooltip key={'state'} title={'创建新的状态'}><span
                    onClick={()=>this.handleDuplicate(id, id)}><Icon
                    type={'zhuangtai'}/></span></Tooltip>,
                <Tooltip key={'sub'} title={'添加子页面'}><span onClick={()=>this.handleCreateSub(id)}><Icon
                    type={'jia1'}/></span></Tooltip>
            )
        }
        actions.push(<Tooltip key={'delete'} title={'删除'}><span onClick={()=>this.handleDelete(id)}><Icon
            type={'delete'}/></span></Tooltip>)
        return actions
    }
    renderIcon = ({type, hasChildren})=>{
        let icon = '13'
        if(hasChildren) icon = 'mulu'
        else if(type == 'STATE') icon = 'zhuangtai'
        return <Icon type={icon}/>
    }
    
    render(){
        return (<div ref={'wrapper'} className={'outline-pages'}>
            <div className={'action-bar'}>
                <Search placeholder={'按回车搜索'} onSearch={this.handleSearch}/>
            </div>
            <Button onClick={this.handleCreate} type={'primary'} icon={'jia1'}/>
            <Tree
                renderActions={this.renderActions}
                onSelect={this.handleSelect}
                onNameChange={this.handleNameChange}
                draggable={true}
                renderIcon={this.renderIcon}
                data={this.state.data}/>
        </div>)
    }
}