/**
 *  created by yaojun on 2018/11/30
 *
 */

import React, {Fragment} from "react";
import Event from "../Base/Event";
import {canvas_dragend, component_active, component_inactive, context_shiftkey_press} from "../util/actions";
import KeyboradHandler from "../service/KeyboradHandler";
import {isMac} from "../util/platform";
import {setShiftKeyPressed} from "../global/instance";



export default class ReactEvents extends React.Component {
    constructor(){
        super()
        this.current = null
    }
    
    
    componentWillUnmount(){
        Event.destroy(component_active, this.handleActive)
        Event.destroy(component_inactive, this.handleInactive)
        document.removeEventListener('keydown', this.handleKeyDown, false)
        document.removeEventListener('keyup', this.handleKeyUp)
    }
    
    
    componentWillMount(){
        Event.listen(component_active, this.handleActive)
        Event.listen(component_inactive, this.handleInactive)
        document.addEventListener('keydown', this.handleKeyDown, false)
        document.addEventListener('keyup', this.handleKeyUp)
    }
    
    
    handleKeyUp = (e) =>{
        e.stopPropagation()
        e.preventDefault()
        if (e.keyCode === 16) {
            setShiftKeyPressed(false)
            Event.dispatch(context_shiftkey_press, false)
        }
        if (e.keyCode === 32) {
            Event.dispatch(canvas_dragend)
        }
    }
    
    handleKeyDown = (e) =>{
        if (e.target.dataset.event === 'ignore' && !e.target.readOnly ) return
        e.stopPropagation()
        e.preventDefault()
        let ctrlKey = e.ctrlKey || e.metaKey
        new KeyboradHandler(e.shiftKey, e.altKey, ctrlKey, e.keyCode)
        if (e.shiftKey) {
            setShiftKeyPressed(true)
            Event.dispatch(context_shiftkey_press, true)
        }
        
        return false
        
    }
    
    dispatchTransformChangeWithArrowKey = (key) =>{
        if (!this.current || !this.current.properties) return
        
    }
    
    handleActive = (target) =>{
        this.current = target
    }
    
    handleInactive = () =>{
        this.current = null
    }
    
    
    render(){
        return null
    }
}

const getCombomKenNumber = (number) =>{
    return 1 << number
}
const CombomKeyNumber = {
    1 : 'shift',
    2 : 'alt',
    4 : () =>{
        return isMac() ? 'meta' : 'control'
    },
}
