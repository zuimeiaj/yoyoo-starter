/**
 *  created by yaojun on 2018/12/1
 *
 */

import React from "react";
import PropTypes from 'prop-types'
import './ContextMenu.scss'
import Event from "../Base/Event";
import {context_hide_menu, controllers_ready, guide_ready} from "../util/actions";
import {getFirstResponder, setFirstResponder} from "../global/instance";
import {DEFAULT_CONTEXT_MENU} from "./ViewController";



/**
 * 添加到素材库 TODO
 * 复制 TODO
 * 粘贴 TODO
 * 添加副本 TODO
 * 隐藏 TODO
 * 锁定 TODO
 * 恢复 TODO
 * 剪切 TODO
 * 删除 TODO
 * 组合
 * 拆分
 */
export default class ContextMenu extends React.Component {
    static propTypes = {
        containerId : PropTypes.string.isRequired
    }
    
    
    constructor(){
        super()
        
        // 当前鼠标点，激活菜单的鼠标点
        this._event = null
        // controllers  控制面板数组
        this.target = null
        /**
         *
         * @type {Guides}
         */
        this.guidesV = null
        /**
         *
         * @type {Guides}
         */
        this.guidesH = null
        // 当前弹出菜单的元素
        this.current = null
        this.state = {
            left : 0,
            top : 0,
            show : false,
            menus : []
        }
        
        Event.listen(controllers_ready, this.onControllersReady)
        Event.listen(context_hide_menu, this.hideMenu)
        Event.listen(guide_ready, this.onGuideReady)
    }
    
    
    /**
     *
     * @param uid
     * @return {Guides}
     */
    findContextGuide = (uid) =>{
        if (uid.startsWith('linev')) {
            return this.guidesV
        }
        return this.guidesH
        
    }
    
    /**
     *
     * @param target {Guides}
     */
    onGuideReady = (target) =>{
        if (target.isH) {
            this.guidesH = target
        } else {
            this.guidesV = target
        }
    }
    
    hideMenu = () =>{
        if (this.state.menus.length > 0) {
            this.setState({menus : []})
        }
    }
    
    /**
     * @param target {EditorControllers}
     */
    onControllersReady = (target) =>{
        this.target = target
    }
    
    
    componentDidMount(){
        let containerId = this.props.containerId
        let container = document.querySelector(`#${containerId}`)
        this.container = container
        container.addEventListener('contextmenu', this.handleContext, false)
        this.refs.g.addEventListener('mousedown', this.contextDown)
    }
    
    
    contextDown = (e) =>{
        e.stopPropagation()
    }
    
    handleContext = (e) =>{
        e.preventDefault()
        this._event = e
        let uid = this.findUID(e.target)
        let result = []
        if (!uid) {
            result = DEFAULT_CONTEXT_MENU()
            this.current = null
        } else if (uid.startsWith('line')) {
            this.current = this.findContextGuide(uid)
            this.current.context_index = e.target.dataset.index
            result = this.current.getContextMenu()
        } else {
            
            let view = getFirstResponder()
            this.current = view.properties
            result = view.getContextMenu()
        }
        
        let rect = this.container.getBoundingClientRect()
        let x = e.pageX - rect.left
        let y = e.pageY - rect.top
        if (x + 210 > rect.width) {
            x -= 210
        } else {
            x += 10
        }
        let height = result.filter(item => item.type !== 'line').length * 33
        if (y + height > rect.height) {
            y = rect.height - height - 20
        }
        
        this.setState({menus : result, left : x, top : y})
    }
    
    findUID = (target) =>{
        while (target && !target.dataset.uid) {
            target = target.parentNode
            if (target === document) return null
        }
        return target ? target.dataset.uid : null
    }
    
    findContextMenuById = (uid) =>{
        if (!uid) return []
        let items = this.target.state.items
        let item = find(items)
        
        
        function find(items){
            for (let i = 0, j = items.length; i < j; i++) {
                let item = items[i]
                if (item.id == uid) return item
                if (item.items) {
                    item = find(item.items)
                    if (item) return item
                }
            }
        }
        
        
        if (item) {
            item = this.getView(item)
            setFirstResponder(item.view)
            this.current = item
            return item.view.getContextMenu()
        }
        
        return []
    }
    
    
    getView(item){
        if (item.parent && item.settings.isLock) {
            return this.getView(item.parent)
        } else {
            return item
        }
    }
    
    
    componentWillUnmount(){
        this.container.removeEventListener('contextmenu', this.handleContext, false)
        Event.destroy(guide_ready, this.onGuideReady)
        Event.destroy(controllers_ready, this.onControllersReady)
        Event.destroy(context_hide_menu, this.hideMenu)
    }
    
    
    handleClick = (e) =>{
        let index = e.target.dataset.uid
        let item = this.state.menus[index]
        if (item && item.action && item._isOk) {
            Event.dispatch(item.action, this.current, {pageX:this._event.pageX,pageY:this._event.pageY})
        } else {
            e.stopPropagation()
        }
        
    }
    
    
    render(){
        return (
            <ul ref={'g'} onClick={this.handleClick}
                style={{position : 'absolute', left : this.state.left, top : this.state.top}}
                className={'context-menu'}>
                {
                    this.state.menus.map((item, index) =>{
                        if (item.type === 'line') {
                            return <li key={index} className={'context-group-line'}></li>
                        }
                        let isOk = item.check ? item.check() : true
                        item._isOk = isOk
                        
                        let name = typeof item.name === 'function' ? item.name() : item.name;
                        
                        return <li className={isOk ? '' : 'disabled'} data-uid={index} key={index}> {name} <span
                            className={'shortcutkey'}>{item.shortcutkey}</span></li>
                    })
                }
            </ul>
        )
    }
}