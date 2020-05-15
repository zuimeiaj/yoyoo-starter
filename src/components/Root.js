/**
 *  created by yaojun on 2018/11/6
 *
 */
import React from "react";
import './Root.scss'
import Header from "./Header";
import Outline from "./Outline";
import Editor from "./Editor";
import {context_hide_color_picker, context_hide_menu, editor_cache_used} from "../lib/util/actions";
import Event from "../lib/Base/Event";
import {fetchUserInfo} from "../api/user";
import {getPageListFromStorage, saveToRemoteFromStorage} from "../lib/util/page";
import {message, Modal} from 'antd'
import {getQuery} from "../lib/util/helper";
import {context_mode_change} from "@/lib/util/actions";
import InspectorProps from './Inspector'

export default class Component extends React.Component{
    onClick = ()=>{
        Event.dispatch(context_hide_menu)
        Event.dispatch(context_hide_color_picker)
    }
    
    componentWillMount(){
        window.addEventListener('offline', this.handleOffline)
        window.addEventListener('online', this.handleOnline)
        window.NetworkConnected = true
    }
    
    handleOnline = ()=>{
        window.NetworkConnected = true
        let pages = getPageListFromStorage()
        if(pages.length > 0 && getQuery().p == pages[0].projectid) {
            let hide = message.info('网络已连接，正在同步缓存数据...', 0)
            saveToRemoteFromStorage(pages).finally(()=>{
                hide()
            })
        } else {
            if(pages.length > 0) {
                Modal.info({
                    title : '网络已连接',
                    content : '尚未保存的数据与当前打开的项目不匹配，请切换项目后应用将尝试自动保存'
                })
            }
        }
    }
    handleOffline = ()=>{
        window.NetworkConnected = false
        let pages = getPageListFromStorage()
        if(pages.length > 0) {
            Modal.info({
                title : '网络连接已断开',
                content : '您的网络已断开连接，未保存的数据已保存到缓存中，网络重新连接时会尝试自动保存。如果您关闭了浏览器，重新开启应用时请进入该项目，应用会尝试将缓存数据同步到服务端'
            })
        } else {
            Modal.info({
                title : '网络连接已断开',
                content : '当前数据已全部保存。由于浏览器对缓存大小限制，继续操作可能会造成数据丢失'
            })
        }
    }
    
    componentWillReceiveProps(props){
        let masterId = getQuery().m
        if(masterId) {
            // MASTER MODE
            Event.dispatch(context_mode_change, 'MASTER')
        } else {
            //PROJECT MODE
            Event.dispatch(context_mode_change, 'PROJECT')
        }
    }
    
    componentWillUnmount(){
        window.removeEventListener('online', this.handleOnline)
        window.removeEventListener('offline', this.handleOffline)
    }
    
    render(){
        return (
            <div onClick={this.onClick} className={'root-layout'}>
                <Header/>
                <div className={'root-layout-content'}>
                    <Outline/>
                    <Editor/>
                    <InspectorProps/>
                </div>
                {/*<Footer/>*/}
            </div>
        )
    }
}

class Footer extends React.Component{
    state = {
        length : 0
    }
    
    componentWillMount(){
        Event.listen(editor_cache_used, this.handleUserCacheUsed)
        fetchUserInfo().then((res)=>{
            this.setState({length : res.data.size})
        })
    }
    
    componentWillUnmount(){
        Event.destroy(editor_cache_used, this.handleUserCacheUsed)
    }
    
    handleUserCacheUsed = (length)=>{
        this.setState({length})
    }
    
    render(){
        return <div className={'root-layout-footer'}>已使用：{(this.state.length / 1024 / 1024).toFixed(4)} MB</div>
    }
}
