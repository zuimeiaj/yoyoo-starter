/**
 *  created by yaojun on 2018/12/2
 *
 */
import React, {Fragment, PureComponent} from "react";
import PropTypes from 'prop-types'
import Event from "../Base/Event";
import {
    context_zoom_in,
    context_zoom_level,
    context_zoom_out,
    editor_scroll_change,
    window_size_change,
    workspace_scroll_center
} from '../util/actions'
import Scroller from "../Scroller";
import {getZooms, isUndefined} from "../util/helper";
import config from "../util/preference";
import {setScreenTransform} from "../global";
import {scroller_move} from "@/lib/util/actions";

const TWEEN = require('@tweenjs/tween.js')
//  保证每次移动的单位都为整数，需要固定缩放比例系数
const _min = getZooms(11).slice(1).reverse()
const _max = getZooms(9, -1)
const zooms = _min.concat(_max)
const defaultLevelIndex = zooms.indexOf(1)
export const MAX_ZOOM_LEVEL = zooms.length - 1
export const DEFAULT_ZOOM_LEVEL = defaultLevelIndex
export default class EditorScrollbar extends PureComponent{
    static propTypes = {
        containerId : PropTypes.string.isRequired
    }
    
    componentDidMount(){
        /**
         *
         * @type {TWEEN.Tween}
         */
        this.tween = null
        this.positionX = config.originCoords.x
        this.positionY = config.originCoords.y
        this.scale = 1
        this.isScale = false
        this.maxScale = MAX_ZOOM_LEVEL
        this.minScale = 0
        this.level = DEFAULT_ZOOM_LEVEL
        this.container = document.querySelector(`#${this.props.containerId}`)
        this.container.addEventListener('mousewheel', this.handleWheel, false)
        this.container.addEventListener('DOMMouseScroll', this.handleWheel, false)
        Event.listen(window_size_change, this.handleSizeChange)
        Event.listen(context_zoom_in, this.zoomIn)
        Event.listen(context_zoom_out, this.zoomOut)
        Event.listen(workspace_scroll_center, this.handlePanToCenter)
        Event.listen(context_zoom_level, this.zoomWithLevel)
        Event.listen(scroller_move, this.handleScrollerMove)
    }
    
    componentWillUnmount(){
        Event.destroy(window_size_change, this.handleSizeChange)
        Event.destroy(workspace_scroll_center, this.handlePanToCenter)
        Event.destroy(context_zoom_in, this.zoomIn)
        Event.destroy(context_zoom_out, this.zoomOut)
        Event.destroy(context_zoom_level, this.zoomWithLevel)
        Event.destroy(scroller_move, this.handleScrollerMove)
    }
    
    handleScrollerMove = ({axis, deltaX, deltaY})=>{
        this.refs[axis].emitScrollChange(deltaX, deltaY)
    }
    handlePanToCenter = ()=>{
        if(this.tween) return
        let x = this.refs.sx.panToCenter()
        let y = this.refs.sy.panToCenter()
        let coords = {x : x.x1, y : y.x1}
        let self = this
        
        // Setup the animation loop.
        function animate(time){
            if(!self.tween) return
            requestAnimationFrame(animate);
            TWEEN.update(time);
        }
        
        requestAnimationFrame(animate);
        let tween = new TWEEN.Tween(coords).to({x : x.x2, y : y.x2}, 500).onUpdate(()=>{
            this.positionX = coords.x * x.ratio / this.scale
            this.positionY = coords.y * y.ratio / this.scale
            this.refs.sx.updateScrollPosition(coords.x)
            this.refs.sy.updateScrollPosition(coords.y)
            this.scroll()
        }).onComplete(()=>{
            this.tween = null
        })
        tween.start()
        this.tween = tween
    }
    handleSizeChange = ()=>{
        this.refs.sx.update()
        this.refs.sy.update()
    }
    zoomIn = ()=>{
        this.level += 1
        this.applyZoom()
    }
    zoomWithLevel = (level)=>{
        this.level = level
        this.applyZoom()
    }
    zoomOut = ()=>{
        this.level -= 1
        this.applyZoom()
    }
    applyZoom = (e)=>{
        if(this.level >= this.maxScale) this.level = this.maxScale
        if(this.level <= this.minScale) this.level = this.minScale
        this.scale = zooms[this.level]
        this.isScale = true
        this.refs.sx.updateFromScale(this.scale, e)
        this.refs.sy.updateFromScale(this.scale, e)
    }
    handleWheel = (e)=>{
        e.preventDefault()
        let deltaX = 0, deltaY = 0
        if(!isUndefined(e.deltaX)) {
            deltaX = e.deltaX / (this.scale * 30)
            deltaY = e.deltaY / (this.scale * 30)
        } else {
            deltaY = -Math.max(-1, Math.min(1, e.wheelDelta || -e.detail))
        }
        if(e.ctrlKey || e.metaKey) {
            if(deltaY < 0) {
                this.level += 1
            } else if(deltaY > 0) {
                this.level -= 1
            }
            this.applyZoom(e)
            return
        }
        this.isScale = false
        //  同步滚动条数据
        let x = this.refs.sx.updateFromWheel(deltaX)
        let y = this.refs.sy.updateFromWheel(deltaY)
        if(x != 0) {
            this.positionX = x / this.scale
        }
        if(y !== 0) {
            this.positionY = y / this.scale
        }
        //  触发滚动事件
        this.scroll()
    }
    scroll = ()=>{
        Event.dispatch(editor_scroll_change, {
            isScale : this.isScale,
            x : this.positionX,
            y : this.positionY,
            scale : this.scale,
            level : this.level,
            maxLevel : this.maxScale
        })
        // Set to global, easy to access
        setScreenTransform(this.positionX, this.positionY, this.scale, this.level)
    }
    scrollX = (x)=>{
        this.positionX = x / this.scale
        this.scroll()
    }
    scrollY = (y)=>{
        this.positionY = y / this.scale
        this.scroll()
    }
    
    render(){
        return (
            <Fragment>
                <Scroller defaultStart={config.originCoords.x} ref={'sx'} onChange={this.scrollX} type={'h'}/>
                <Scroller defaultStart={config.originCoords.y} ref={'sy'} onChange={this.scrollY} type={'v'}/>
            </Fragment>
        )
    }
}