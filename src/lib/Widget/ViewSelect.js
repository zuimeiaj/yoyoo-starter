/**
 *  created by yaojun on 2019/1/22
 *
 */

import React, {Fragment} from "react";
import ViewController from "../Widget/ViewController";
import './ViewSelect.scss'
import {Dom} from "../util/helper";
import Event from "../Base/Event";
import {component_close_edit_mode, component_edit_mode} from "../util/actions";
import {getTemporaryGroup, setCurrentEditor} from "../global/instance";
import {getGroupId} from "../global/selection";



export default class ViewSelect extends ViewController {
    onDBClick(e){
        if (getGroupId()[this.properties.id] && getTemporaryGroup().isLockChildren) {
            super.onDBClick(e)
        } else {
            e.stopPropagation()
            Dom.of(this.refs.poplist).show().top(this.properties.transform.height + 3)
            setCurrentEditor(this)
            Event.dispatch(component_edit_mode)
        }
    }
    
    
    initBackground(){
        Dom.of(this.refs.defaultSelect).background(this.properties.bg)
    }
    
    
    initProperties(){
        super.initProperties()
        const corner = this.properties.corner
        this.setDefaultSelectValue()
        Dom.of(this.refs.select).borderRadiusBottomLeft(corner.bottomLeft).borderRadiusBottomRight(corner.bottomRight).borderRadiusTopRight(corner.topRight).borderRadiusTopLeft(corner.topLeft)
    }
    
    
    setEditorBlur = () =>{
        
        this.setDefaultSelectValue()
        Event.dispatch(component_close_edit_mode)
        console.log(this.refs.poplist)
        if(this.refs.poplist){
            Dom.of(this.refs.poplist).hide()
        }else{
            throw '-1'
        }
        
    }
    
    setDefaultSelectValue = () =>{
        let options = this.properties.selectOptions
        if (!options) return
        let defaultSelect = options.split(/\n/).filter(item => item.trim().startsWith('>'))
        if (defaultSelect && defaultSelect[0]) {
            this.refs.defaultSelect.value = defaultSelect[0].trim().slice(1)
        }
        
    }
    
    
    setColor(key, value){
        if (key == 'fontColor') {
            Dom.of(this.refs.defaultSelect).fontColor(value)
        } else if (key == 'bg') {
            Dom.of(this.refs.defaultSelect).background(value)
        } else {
            super.setColor(key, value)
        }
    }
    
    
    getWrapperClassName(){
        return super.getWrapperClassName() + ' view-select'
    }
    
    
    _handlePoplistChange = (e) =>{
        this.properties.selectOptions = e.target.value
    }
    
    
    renderContent(){
        return (
            <Fragment>
                <div ref={'select'} className={'view-select-wrapper'}>
                    <input style={{color : this.properties.font.color}} ref={'defaultSelect'} readOnly={true}
                           defaultValue={'请选择'}/>
                    <div className={'view-select-arrows'}>
                        <i className={'arrows_up'}/>
                        <i className={'arrows_down'}/>
                    </div>
                </div>
                <textarea onBlur={this.setEditorBlur} onChange={this._handlePoplistChange} data-event="ignore"
                          data-drag="false" ref={'poplist'} className={'aj-select-poplist'}
                          placeholder={'换行分隔，">" 表示默认选中该项，示例：\n > a \n b \n c '}>
            
            </textarea>
            </Fragment>
        )
    }
}