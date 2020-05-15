/**
 *  created by yaojun on 2018/11/30
 *
 */
import React from "react";
import Draggable from "../Draggable";
import Event from "../Base/Event";
import {
    component_drag,
    component_drag_before,
    component_dragend,
    component_enter,
    component_leave,
    component_over,
    component_picker_picked,
    context_copy,
    context_copypaste,
    context_cut,
    context_delete,
    context_paste_mouse,
    coverage_backward_to_picked,
    coverage_picked_width_mode,
    selection_group,
    workspace_save_template
} from "../util/actions";
import {Dom, isUndefined} from "../util/helper";
import config, {getSnaplineConfig} from "../util/preference";
import {
    getClipboardData,
    getFirstResponder,
    getTemporaryGroup,
    getViewPickedStatus,
    setFirstResponder
} from "../global/instance";
import {getCanvasDraggable, getCoveragePickeMode, initialCoverageIndex} from "../global";
import {getFormatShortcutsWithAction} from "../service/KeyboradHandler";
import Matrix from "../util/Matrix";
import {getGroupId} from "../global/selection";
import {pushUnlockedView} from "@/lib/global/instance";
import {getComponentPosition} from "@/lib/global/controllers";
import {context_hide, workspace_save_master} from "@/lib/util/actions";

export const DEFAULT_CONTEXT_MENU = ()=>[
    {
        name : '添加到我的模板',
        action : workspace_save_template,
        check : ()=>!!getFirstResponder() && getFirstResponder().properties.type !== 'master'
    }, {
        name : '设置为母版',
        action : workspace_save_master,
        check : ()=>!!getFirstResponder() && getFirstResponder().properties.type !== 'master' && !getFirstResponder()._parent
    }, {
        type : 'line'
    },
    {
        name : '复制',
        action : context_copy,
        shortcutkey : getFormatShortcutsWithAction('copy'),
        check : ()=>!!getFirstResponder()
    }, {
        name : '粘贴到鼠标位置',
        action : context_paste_mouse,
        check : ()=>{
            return !!getClipboardData()
        }
    }, {
        name : '添加副本',
        action : context_copypaste,
        shortcutkey : getFormatShortcutsWithAction('duplicate'),
        check : ()=>!!getFirstResponder()
    }, {
        name : '隐藏',
        action : context_hide,
        check : ()=>!!getFirstResponder()
    }, {
        type : 'line'
    }, {
        name : '剪切',
        action : context_cut,
        shortcutkey : getFormatShortcutsWithAction('clip'),
        check : ()=>!!getFirstResponder()
    }, {
        name : '删除',
        action : context_delete,
        shortcutkey : getFormatShortcutsWithAction('delete'),
        check : ()=>!!getFirstResponder()
    }
]
export default class ViewController extends React.Component{
    componentWillMount(){
        /**
         *
         * @type {ViewProperties | TextProperties | ImageProperties | GroupProperties}
         */
        this.properties = this.props.properties
        this.properties.view = this
        this._parent = this.props.parent
    }
    
    componentWillReceiveProps(props){
        if(props.properties) {
            this.properties = props.properties
            this.properties.view = this
            this.initProperties()
        }
        this._parent = props.parent
    }
    
    componentDidMount(){
        if(!this.properties.isInMaster) {
            this._x = this.properties.transform.x
            this._y = this.properties.transform.y
            this._guidesX = 0
            this._guidesY = 0
            // 实际接收事件的对象
            this.eventTarget = null
            this._drag = new Draggable(this.refs.container, {
                onDragMove : this._handleDragMove,
                onDragStart : this.onDragStart,
                onDragEnd : this._handleDragEnd
            })
            // Double click
            this.refs.container.addEventListener('dblclick', this._onDBClick, false)
        }
        this.initProperties()
    }
    
    initZIndex(){
        let indexWrapper = Dom.of(this.getIndexDomWrapper())
        let zIndex = this.properties.zIndex
        //  初始化层级，最后挂载的元素都在最上面
        if(zIndex == -1 || zIndex == null) {
            this.properties.zIndex = initialCoverageIndex()
        }
        // Top wrapper
        indexWrapper.zIndex(this.properties.zIndex)
    }
    
    initCorner(){
        let wrapper = Dom.of(this.getDomWrapper())
        let corner = this.properties.corner
        if(corner) {
            let {topLeft, topRight, bottomLeft, bottomRight} = corner
            wrapper.borderRadiusTopLeft(topLeft)
            wrapper.borderRadiusTopRight(topRight)
            wrapper.borderRadiusBottomLeft(bottomLeft)
            wrapper.borderRadiusBottomRight(bottomRight)
        }
    }
    
    initOverflow(){
        let wrapper = Dom.of(this.getDomWrapper())
        let {isHide, overflow} = this.properties.settings
        let type = this.properties.type
        if(type === 'group') {
            if(overflow) {
                wrapper.overflow('hidden')
            } else {
                wrapper.overflow('visible')
            }
        }
    }
    
    initBorder(){
        let wrapper = Dom.of(this.getDomWrapper())
        let {border, shadow} = this.properties
        if(border) {
            // Rect wrapper
            wrapper.border(border)
        }
        if(shadow) {
            wrapper.shadow(shadow)
        }
    }
    
    initBackground(){
        let wrapper = Dom.of(this.getDomWrapper())
        let bg = this.properties.bg
        if(bg) {
            wrapper.background(bg)
        }
    }
    
    initVisiblity(){
        let wrapper = Dom.of(this.getDomWrapper())
        let isHide = this.properties.settings.isHide
        wrapper.showHide(!isHide)
    }
    
    /**
     * @protected
     */
    initProperties(){
        this.initZIndex()
        this.initCorner()
        this.initOverflow()
        this.initBorder()
        this.initBackground()
        this.initVisiblity()
    }
    
    /**
     * 默认情况下，如果当前元素锁定了，就激活并选中
     */
    _onDBClick = (e)=>{
        this.onDBClick(e)
    }
    
    /**
     * @protected
     * @param e
     */
    onDBClick(e){
        e.stopPropagation()
        let target = this._getUnlockedTarget(this._parent)
        setFirstResponder(target)
    }
    
    _getUnlockedTarget = (target)=>{
        if(target) {
            if(!target.isLockChildren) {
                return this
            } else {
                if(target._parent) {
                    if(!target._parent.isLockChildren) {
                        target.isLockChildren = false
                        pushUnlockedView(target)
                        return this
                    } else {
                        return target._getUnlockedTarget(target._parent)
                    }
                } else {
                    target.isLockChildren = false
                    pushUnlockedView(target)
                    return this
                }
            }
        } else {
            return this
        }
    }
    _handleDragEnd = ()=>{
        this.dragEnd()
        let target = this.eventTarget
        if(!target) return
        Event.dispatch(component_dragend, target)
    }
    _handleDragMove = ({deltaX, deltaY, mouseX, mouseY})=>{
        window._mouse = {mouseX, mouseY}
        this.setTransformWithSnap(deltaX, deltaY)
    }
    
    onDragStartBefore(){ }
    
    dragEnd(){
        if(this._parent) {
            this._parent.updateBlockTransform()
        }
    }
    
    resizeEnd(){
        if(this._parent) {
            this._parent.updateBlockTransform()
        }
    }
    
    rotationEnd(){
        if(this._parent) {
            this._parent.updateBlockTransform()
        }
    }
    
    onDragStart = (options, e)=>{
        this.onDragStartBefore()
        Event.dispatch(component_drag_before)
        let pickedStatus = getViewPickedStatus()
        let coveragePickedMode = getCoveragePickeMode()
        let globalCanvasDraggable = getCanvasDraggable()
        if(globalCanvasDraggable) return
        if(pickedStatus) {
            Event.dispatch(component_picker_picked, this)
            return
        }
        if(coveragePickedMode !== 0) {
            Event.dispatch(coverage_picked_width_mode, this)
            return
        }
        let target = this._getActiveTarget(this)
        if(!target) return
        target._x = target.properties.transform.x
        target._y = target.properties.transform.y
        // 处于Block中的元素不能被加入分组
        if(e.shiftKey && !target._parent) {
            let lastView = getFirstResponder()
            if(lastView && target != lastView && !lastView.properties.isTemporaryGroup) {
                Event.dispatch(selection_group, [lastView, target])
                return
            } else if(lastView.properties.isTemporaryGroup) {
                // Group,push
                lastView.push(target)
                return
            }
        }
        setFirstResponder(target)
        this.eventTarget = target
    }
    onMouseEnter = (e)=>{
        e.stopPropagation()
        Event.dispatch(component_enter, this)
    }
    onMouseLeave = (e)=>{
        e.stopPropagation()
        Event.dispatch(component_leave, this)
    }
    _getActiveTarget = (target)=>{
        if(getGroupId()[target.properties.id]) {
            let group = getTemporaryGroup()
            Event.dispatch(selection_group, group.group)
            return group
        }
        if(target._parent) {
            if(!target._parent.isLockChildren) {
                return target
            } else {
                return target._parent._getActiveTarget(target._parent)
            }
        }
        return target
    }
    
    /**
     * 内置的拖拽功能调用，使用对齐
     * @param deltaX
     * @param deltaY
     */
    setTransformWithSnap(deltaX, deltaY){
        let target = this.eventTarget
        if(!target) return
        let {width, height, rotation, x, y} = target.properties.transform
        let snap = getSnaplineConfig()
        let positions = getComponentPosition()
        target._x += deltaX
        target._y += deltaY
        let sx, sy, roundX = Math.round(target._x), roundX1 = Math.round(target._x + width),
            roundY = Math.round(target._y), roundY1 = Math.round(target._y + height)
        let guidesx = config.guides.x
        if(positions.x[roundX] || positions.x[roundX1] || guidesx[roundX] || guidesx[roundX1]) {
            sx = target._x
            target._guidesX = target._x
        } else {
            let rx = target._x % snap.x;
            let spacex = Math.abs(target._x - target._guidesX)
            sx = Math.round(rx === 0 ? target._x : spacex < 5 ? target._guidesX : target._x - rx)
        }
        if(positions.y[roundY] || positions.y[roundY1] || config.guides.y[roundY] || config.guides.y[roundY1]) {
            sy = target._y
            target._guidesY = target._y
        } else {
            let ry = target._y % snap.y;
            let spacey = Math.abs(target._y - target._guidesY)
            sy = Math.round(ry === 0 ? target._y : spacey < 5 ? target._guidesY : target._y - ry);
        }
        if(x !== sx || y !== sy) {
            target._setTransform(sx, sy, width, height, rotation)
            Event.dispatch(component_drag, target, {from : 'Draggable'})
        }
    }
    
    /**
     * 最新的坐标值，直接改变组件的位置，如果需要外部组件 应该触发组件的component_darg事件，已确保组件移动后，其附加功能同步
     * @param x
     * @param y
     * @param width
     * @param height
     * @param rotation
     * @private
     */
    _setTransform(x, y, width, height, rotation){
        let t = this.properties.transform
        let anchor = this.properties.anchor
        x = isUndefined(x) ? t.x : x
        y = isUndefined(y) ? t.y : y
        width = isUndefined(width) ? t.width : width
        height = isUndefined(height) ? t.height : height
        rotation = isUndefined(rotation) ? t.rotation : rotation
        let style = this.refs.container.style
        style.transform = `rotate(${rotation}deg)`
        style.width = `${width}px`
        style.height = `${height}px`
        style.left = x + 'px'
        style.top = y + 'px'
        t.x = x
        t.y = y
        t.width = width
        t.height = height
        t.rotation = rotation
    }
    
    /**
     *
     * 给外部直接改变组件 位置 的函数，需要同步当前内部想x y 值
     * @param x
     * @param y
     * @param width
     * @param height
     * @param rotation
     */
    setTransform(x, y, width, height, rotation){
        this._x = x
        this._y = y
        this._setTransform(x, y, width, height, rotation)
    }
    
    setRotation(angle){
        let t = this.properties.transform
        this._setTransform(t.x, t.y, t.width, t.height, angle)
    }
    
    _setPropertyValueWithPath(path, value){
        path = path.split('.')
        let object = this.properties
        while(path.length > 1) {
            let key = path.shift()
            object = object[key]
        }
        let key = path[0]
        object[key] = value
    }
    
    getParentRect(){
        return this.parent ? this.parent.getOffsetRect() : {x : 0, y : 0, width : 0, height : 0, rotation : 0}
    }
    
    getOffsetRect(){
        let parent = this.parent
        let t = this.properties.transform
        let x = t.x, y = t.y, deg = t.rotation
        while(parent) {
            let pt = parent.properties.transform
            x += pt.x
            y += pt.y
            deg += pt.rotation
            parent = parent.parent
        }
        let rect = {x, y, width : t.width, height : t.height, rotation : deg}
        return rect
    }
    
    getOffsetTransform(){
        let t = this.getOffsetRect()
        return this._getTransformWithDegree(t.x, t.y, t.width, t.height, t.rotation)
    }
    
    getCurrentTransform(){
        let t = this.properties.transform
        return this._getTransformWithDegree(t.x, t.y, t.width, t.height, t.rotation)
    }
    
    _getTransformWithDegree = (x, y, width, height, rotation)=>{
        let result = this.getCurrentMatrix({x, y, width, height, rotation})
        let xarr = [], yarr = []
        let wc = width / 2, hc = height / 2
        let coords = result.valueOf().forEach(item=>{
            xarr.push(item[0] + wc)
            yarr.push(item[1] + hc)
        })
        xarr = xarr.sort((a, b)=>a - b)
        yarr = yarr.sort((a, b)=>a - b)
        let x2 = xarr[0] + x
        let y2 = yarr[0] + y
        let width2 = Math.abs(xarr[xarr.length - 1] - xarr[0])
        let height2 = Math.abs(yarr[yarr.length - 1] - yarr[0])
        return {x : x2, y : y2, width : width2, height : height2, rotation}
    }
    getCurrentMatrix = ({x, y, width, height, rotation})=>{
        let a = rotation / 180 * Math.PI
        let wc = width / 2
        let hc = height / 2
        let deg = new Matrix([[Math.cos(a), Math.sin(a)], [-Math.sin(a), Math.cos(a)]])
        let rect = new Matrix([
            [-wc, hc],
            [wc, hc],
            [wc, -hc],
            [-wc, -hc]
        ])
        return deg.dot(rect.T()).T()
    }
    getCurrentPoints = (t, xBounce, yBounce)=>{
        console.log(xBounce, yBounce)
        let matrix = this.getCurrentMatrix(t);
        matrix = matrix.valueOf().map(item=>{
            return [item[0] + t.width / 2 * xBounce, item[1] - t.height / 2 * yBounce]
        })
        return matrix
    }
    
    // Hack
    setColor(key, value){
        if(key === 'bg') {
            Dom.of(this.getDomWrapper()).background(value)
        } else if(key === 'border') {
            let border = Object.assign({}, this.properties.border)
            border.color = value
            Dom.of(this.getDomWrapper()).border(border)
        } else if(key === 'shadow') {
            let shadow = Object.assign({}, this.properties.shadow)
            shadow.color = value
            Dom.of(this.getDomWrapper()).shadow(shadow)
        }
    }
    
    componentWillUnmount(){
        this.refs.container.removeEventListener('dblclick', this._onDBClick, false)
    }
    
    /**
     * @protected
     * @return {Node}
     */
    getDomWrapper(){
        return this.refs.container
    }
    
    getIndexDomWrapper(){
        return this.refs.container
    }
    
    /**
     * @protected
     * @return {null}
     */
    renderContent(){
        return null
    }
    
    /**
     * @protected
     * @return {*[]}
     */
    getContextMenu(){
        return DEFAULT_CONTEXT_MENU()
    }
    
    /**
     * @protected
     */
    getWrapperClassName(){
        return 'aj-component'
    }
    
    getMouseEvent = ()=>{
        if(!this.properties.isInMaster) {
            return {
                onMouseEnter : this.onMouseEnter,
                onMouseLeave : this.onMouseLeave,
                'data-uid' : this.properties.id
            }
        }
        return {}
    }
    
    render(){
        const {x, y, width, height, rotation} = this.properties.transform
        return (
            <div
                {...this.getMouseEvent()}
                className={this.getWrapperClassName()} style={
                {
                    position : 'absolute',
                    left : x,
                    top : y,
                    boxSizing : 'border-box',
                    transform : `rotate(${rotation}deg)`,
                    width,
                    height
                }}
                ref={'container'}>
                {this.renderContent()}
            </div>
        )
    }
}