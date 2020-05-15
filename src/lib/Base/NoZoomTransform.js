/**
 *  created by yaojun on 2018/12/7
 *
 */

import React from "react";
import {getScreeTransform} from "../global";
import Event from "./Event";
import {editor_scroll_change} from "../util/actions";



/**
 * @description  同步缩放
 */
export default class NoZoomTransform extends React.Component {
    constructor(){
        super()
        /**
         * Must implements this prop
         * @type {ViewController}
         */
        this.target = null
        // 缩放前坐标。当缩放时，已此位置为基础缩放。
        this._x = 0
        this._y = 0
        this._width = 0
        this._height = 0
        this._rotation = 0
        // 缩放后坐标。
        /**
         * 当前选中元素的X 坐标
         * @type {number}
         */
        this.x = 0
        /**
         * 当前选中元素的 Y 坐标
         * @type {number}
         */
        this.y = 0
        /**
         * 元素的宽度
         * @type {number}
         */
        this.width = 0
        /**
         * 元素的高度
         * @type {number}
         */
        this.height = 0
        /**
         * 元素的旋转
         * @type {number}
         */
        this.rotation = 0
        
        Event.listen(editor_scroll_change, this.handleScale)
    }
    
    
    handleScale = ({isScale, scale}) =>{
        
        if (isScale) {
            this.setScale(scale)
        }
    }
    
    
    setScale(scale){
        
        this.x = (this._x) * scale
        this.y = (this._y) * scale
        this.width = this._width * scale
        this.height = this._height * scale
        
        this.applyToDom()
    }
    
    
    setBoundingRect = () =>{
        let scale = getScreeTransform().scale
        let {x, y, width, height, rotation} = this.target.getOffsetRect()
        this.x = Math.round(x * scale)
        this.y = Math.round(y * scale)
        this.width = Math.round(width * scale)
        this.height = Math.round(height * scale)
        this.rotation = rotation
        
        this._x = x
        this._y = y
        this._width = width
        this._height = height
        this._rotation = rotation
        
        this.applyToDom()
    }
    
    
    applyToDom(){
        let style = this.refs.container.style
        let {x, y, width, height, rotation} = this
        style.transform = `translate(${x}px,${y}px) rotate(${rotation}deg)`
        style.width = width + 'px'
        style.height = height + 'px'
    }
    
    
    render(){
        return null
        
    }
}