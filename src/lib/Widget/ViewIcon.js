/**
 *  created by yaojun on 2019/1/1
 *
 */

import React from "react";
import {Dom, getDropView} from "../util/helper";
import PresetIcons from "../PresetIcons";
import ViewController from "./ViewController";
import {Dropable} from "../ui/NativeDragDrop";
import Event from "../Base/Event";
import {component_properties_change} from "../util/actions";



export default class ViewIcon extends ViewController {
    
    /**
     * @override
     */
    initProperties(){
        super.initZIndex()
        let {transform : {width}, bg} = this.properties
        this.iconDom.fontSize(width)
        this.iconDom.fontColor(bg)
    }
    
    
    setTransform(x, y, w, h, r){
        super.setTransform(x, y, w, h, r)
        this.iconDom.fontSize(w)
    }
    
    
    _saveIconRef = (res) =>{
        this.refsText = res
        this.iconDom = Dom.of(res)
    }
    
    
    setColor(key, value){
        this.iconDom.fontColor(value)
    }
    
    
    handleDrop = (data, e) =>{
        if (data && data.type == 'icon') {
            let view = getDropView(e, data)
            Event.dispatch(component_properties_change, {
                key : 'icon',
                target : this,
                value : {
                    data : data.data,
                    content : data.fontContent
                }
            })
        }
    }
    getWrapperClassName(){
        return super.getWrapperClassName() +' view-icon'
    }
    
    
    renderContent(){
        return (
            <Dropable onDrop={this.handleDrop}>
                <PresetIcons saveRef={this._saveIconRef} type={this.properties.icon.data}/>
            </Dropable>
        )
    }
}