/**
 *  created by yaojun on 2019/1/16
 *
 */
import React from "react";
import {Draggable} from "../lib/ui/NativeDragDrop";
import {updateAlias} from "../lib/global/template";
import EditableLabel from "../lib/ui/EditableLabel";
import Icon from "../lib/Icon";
import {deleteTemplate, fetchTemplate, updateMaterialName} from "../api/material";
import {Icon as AntIcon, Modal} from 'antd'
import Event from "../lib/Base/Event";
import {workspace_save_template_success} from "../lib/util/actions";
import {cleanEmpty} from "../lib/util/helper";
import Button from "../lib/ui/Button";
import Search from "../lib/ui/Search";
import {outline_closable_panel_show} from "@/lib/util/actions";
import {getQuery} from "@/lib/util/helper";
import CacheState from "@/lib/Base/CacheState";

export const imageCache = {}
export default class OutlinePrefabs extends CacheState{
    state = {
        template : [],
        result : {
            page : 1,
            pages : 1
        },
        query : {
            name : '',
            pageIndex : 1,
            pageSize : 5
        }
    }
    getCacheKey = ()=>{
        return 'outline/prefabs'
    }
    
    componentWillMount(){
        super.componentWillMount()
        Event.listen(workspace_save_template_success, this.handleCreate)
        !this.hasCacheData && this.refresh(Object.assign({}, this.state.query))
    }
    
    refresh = (query, reset = false)=>{
        fetchTemplate(cleanEmpty(query)).then((res)=>{
            const {pages, page, docs} = res.data
            const resultdata = docs.map(item=>{
                let content = item.content
                content._id = item._id
                content.name = item.name
                return content
            })
            this.setState({
                template : reset ? resultdata : this.state.template.concat(resultdata),
                result : {page, pages},
                query
            })
        })
    }
    
    componentWillUnmount(){
        Event.destroy(workspace_save_template_success, this.handleCreate)
    }
    
    handleCreate = ({type, data})=>{
        if(type == 'TEMPLATE') {
            this.setState({template : [data].concat(this.state.template)})
        }
    }
    handleChange = (id, value)=>{
        updateMaterialName(id, value).then(()=>{
            let index = this.state.template.findIndex((item)=>item._id == id)
            let data = Object.assign({}, this.state.template[index])
            data.name = value
            this.state.template[index] = data
            this.setState({template : this.state.template})
        })
    }
    handleDelete = (id)=>{
        Modal.confirm({
            title : '提示',
            content : '确认要删除该模板吗？',
            onOk : ()=>{
                deleteTemplate(id).then((res)=>{
                    let data = this.state.template
                    let index = data.findIndex(item=>item._id == id)
                    data.splice(index, 1)
                    this.setState({template : data})
                })
            }
        })
    }
    handleSearch = (value)=>{
        if(this.state.query.name == value) return
        this.refresh(Object.assign({}, this.state.query, {name : value, pageIndex : 1}), true)
    }
    loadMore = ()=>{
        let query = Object.assign({}, this.state.query)
        query.pageIndex += 1
        this.refresh(query)
    }
    showPanel = ()=>{
        Event.dispatch(outline_closable_panel_show, '模板')
    }
    
    render(){
        let showPublish = getQuery().showPublish
        return (<div className="root-layout-side-assets">
            <div style={{padding : 15, display : 'flex'}}>
                <Search placeholder={'模板名称'} onSearch={this.handleSearch}/>
                {showPublish == 'YES' &&
                <Icon onClick={this.showPanel} style={{marginLeft : 15}} type={'zujiankuLOGO'}/>}
            </div>
            {
                this.state.template.map((item, index)=>{
                    return (<WrapperIamgeItem item={item}
                                              key={item._id}
                                              handleChange={this.handleChange}
                                              handleDelete={this.handleDelete}/>)
                })
            }
            {this.state.result.page < this.state.result.pages &&
            <div style={{padding : 10}}><Button type={'primary'} block onClick={this.loadMore}>加载更多</Button></div>}
            {this.state.template.length === 0 && <div className={'side-prefabs_tips'}>
                <Icon type={'jianyi'}/>
                <div className={'side-prefabs_tips-text'}>在工作面板中选中组件，点击右键菜单，选择添加到我的模板</div>
            </div>}
        </div>)
    }
}

class WrapperIamgeItem extends React.PureComponent{
    render(){
        let {item, handleDelete, handleChange} = this.props
        return (
            <div className={'side-assets_image-item'}>
                <Draggable params={item}>
                    {item.image ? <img src={item.image}/> : <AntIcon type={'loading'}/>}
                </Draggable>
                <EditableLabel value={item.name}
                               onChange={(value)=>handleChange(item._id, value)}/>
                <Icon onClick={()=>handleDelete(item._id)} type={'delete'}/>
            </div>
        )
    }
}