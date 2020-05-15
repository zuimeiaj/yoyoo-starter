/**
 *  created by yaojun on 2018/11/30
 *
 */
import React from "react";
import Selection from "../lib/Widget/Selection";
import EditorControllers from "./EditorControllers";
import ContextMenu from "../lib/Widget/ContextMenu";
import EditorScrollbar from "../lib/Widget/EditorScrollbar";
import FirstResponder from "../lib/Widget/FirstResponder";
import NoZoomAreaHighIndex from "./NoZoomAreaHighIndex";
import Stage from "./Stage";
import NoZoomAreaLowIndex from "./NoZoomAreaLowIndex";
import Event from "../lib/Base/Event";
import {controllers_append, selection_group, viewport_ready} from "../lib/util/actions";
import {getDropView} from "../lib/util/helper";
import PositionInfo from "../lib/Widget/PositionInfo";
import {getCurrentPage} from "../lib/global/instance";
import config from "../lib/util/preference";
import {getCurrentIndex} from "../lib/global";
import {proxyTransformOffset} from "@/lib/util/controllers";
import {MasterProperties} from "@/lib/properties/group";
import {getQuery, uuid} from "@/lib/util/helper";

export default class EditorViews extends React.Component{
    containerId = 'layout-editor-view'
    getRect = ()=>{
        return {
            width : window.innerWidth - (config.editorDomRect.left + config.editorDomRect.right),
            height : window.innerHeight - (config.editorDomRect.top + config.editorDomRect.bottom)
        }
    }
    
    componentDidMount(){
        setTimeout(()=>{
            Event.dispatch(viewport_ready, this)
        })
    }
    
    handleDrop = (e)=>{
        e.preventDefault()
        let page = getCurrentPage()
        let masterId = getQuery().m
        if(!page && !masterId) return alert('请先选择一个页面')
        let data = e.dataTransfer.getData('dragdata')
        if(data) data = JSON.parse(data)
        else return
        try {
            let view = getDropView(e, data)
            if(view) {
                if(data.type == 'AdvanceComponent') {
                    let zindex = getCurrentIndex()
                    if(data.elementType == 'MASTER') {
                        let master = new MasterProperties()
                        master.masterId = data._id
                        master.id = uuid('sb_')
                        master.transform = Object.assign({}, view.transform)
                        master.zIndex = zindex
                        Event.dispatch(controllers_append, [master])
                        return
                    } else {
                        let diffindex = zindex - Math.min.apply(null, view.items.map(item=>item.zIndex))
                        let dx = view.transform.x,
                            dy = view.transform.y;
                        let items = view.items.map(item=>{
                            proxyTransformOffset(item, dx, dy, diffindex)
                            delete item.parent
                            return item
                        })
                        Event.dispatch(controllers_append, items)
                        if(items.length > 1) {
                            setTimeout(()=>{
                                Event.dispatch(selection_group, items.map(item=>item.view))
                            }, 10)
                        }
                    }
                } else {
                    Event.dispatch(controllers_append, view)
                }
            }
        } catch(e) {
            console.error(['Drop Error'], e)
        }
    }
    handleOver = (e)=>{
        e.preventDefault()
    }
    
    render(){
        return (
            <div onDrop={this.handleDrop} onDragOver={this.handleOver} ref={'container'} id={this.containerId}
                 className={'editor-view'}>
                
                
                {/* NO  ZOOM   */}
                <NoZoomAreaLowIndex/>
                {/*ZOOM AREA*/}
                
                {/* All components */}
                <Stage zoomable={true} className={'editor-control-panel'}>
                    <EditorControllers/>
                </Stage>
                
                {/*No ZOOM*/}
                <NoZoomAreaHighIndex/>
                
                {/* Custom scroll bar  */}
                <EditorScrollbar containerId={this.containerId}/>
                {/* The component being operated */}
                <FirstResponder/>
                
                {/* Group selection */}
                <Selection containerId={this.containerId}/>
                {/* Custom context menu */}
                <ContextMenu containerId={this.containerId}/>
                
                <PositionInfo/>
            </div>
        )
    }
}