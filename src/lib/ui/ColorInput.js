/**
 *  created by yaojun on 2018/12/15
 *
 */

import React from "react";
import Event from "../Base/Event";
import {colorpicker_active} from "../util/actions";
import PropTypes from 'prop-types'
import './ColorInput.scss'



export default class ColorInput extends React.Component {
    constructor(){
        super()
        /**
         * @readonly
         * @type {string}
         */
        this.value = ''
        this.mouseX = 0
        this.mouseY = 0
    }
    
    
    static propTypes = {
        width : PropTypes.number,
        height : PropTypes.number,
        onChange : PropTypes.func,
        defaultValue : PropTypes.string,
        onPreview : PropTypes.func
    }
    
    static defaultProps = {
        width : 28,
        height : 28,
        onChange : () =>{},
        onPreview:()=>{},
        defaultValue : 'rgba(255,255,255,1)'
    }
    
    
    componentDidMount(){
        this.setValue(this.props.defaultValue)
    }
    
    
    setValue(value){
        this.value = value
        this.refs.g.style.background = value
    }
    
    
    /**
     *
     * @param value
     * @param {boolean} isPreview 是否是预览模式
     */
    notifyChange(value, isPreview){
        this.setValue(value)
        if (isPreview) {
            this.props.onPreview(value)
        } else {
            this.props.onChange(value)
        }
        
    }
    
    
    getValue(){
        return this.value
    }
    
    
    onClick = (e) =>{
        e.stopPropagation()
        this.mouseX = e.clientX
        this.mouseY = e.clientY
        Event.dispatch(colorpicker_active, this)
    }
    
    
    render(){
        const {width, height} = this.props
        return (
            <span className={'aj-color-input'} style={{width, display : 'inline-block'}} onClick={this.onClick}>
                <span className={'aj-color-input-bg'}></span>
                <span ref={'g'}></span>
            </span>
        )
    }
}