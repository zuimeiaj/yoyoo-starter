/**
 *  created by yaojun on 2018/12/6
 *
 */

import React from "react";
import Event from "../Base/Event";
import {component_active, component_inactive} from "../util/actions";
import {getCurrentEditor} from "../global/instance";
import {component_empty} from "@/lib/util/actions";



/**
 * 当前选中元素与上一个元素
 */
export default class FirstResponder extends React.Component {
    componentWillMount(){
        this.responder = null
        this.last = null
        Event.listen(component_active, this._handleActiv)
        Event.listen(component_inactive, this._handleInactive)
    }
    
    _handleInactive = () =>{
        let editor = getCurrentEditor()
        if (editor) {
            editor.setEditorBlur()
        }
    }
    
    _handleActiv = (target) =>{
        this.last = this.responder
        this.responder = target
    }
    
    
    componentWillUnmount(){
        Event.destroy(component_active, this._handleActiv)
        Event.destroy(component_inactive, this._handleInactive)
    }
    
    
    render(){
        return null
    }
}