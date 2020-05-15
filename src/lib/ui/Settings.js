/**
 *  created by yaojun on 2019/1/16
 *
 */

import React, {Fragment} from "react";
import Event from "../Base/Event";
import {
    component_active,
    component_properties_change,
    component_settings_lock,
    component_settings_show,
    outline_coverage_name_change
} from "../util/actions";
import './Settings.scss'
import InspectorCard from "./InspectorCard";
import ToggleIcon from "./ToggleIcon";
import {getFirstResponder} from "../global/instance";
import Select from "./Select";
import {Dom} from "../util/helper";
import Icon from "../Icon";
import EditableLabel from "./EditableLabel";
import Checkbox from "./Checkbox";



const Overflow = [
    {
        label : '无',
        key : ''
    },
    {
        label : '水平滚动',
        key : 'scroll-x'
    }, {
        label : '垂直滚动',
        key : 'scroll-y'
    }, {
        label : '自由滚动',
        key : 'scroll-auto'
    }, {
        label : '隐藏',
        key : 'hidden'
    }
]

export default class Settings extends React.Component {
    componentWillMount(){
        Event.listen(component_active, this.onActive)
        Event.listen(outline_coverage_name_change, this.onNameChange)
        Event.listen(component_settings_lock, this.onSettingsLockChange)
        Event.listen(component_settings_show, this.onSettingsHideChange)
    }
    
    state={
        value:""
    }
    
    componentDidMount(){
        this.props.target && this.onActive(this.props.target)
    }
    
    
    componentWillUnmount(){
        Event.destroy(component_active, this.onActive)
        Event.destroy(outline_coverage_name_change, this.onNameChange)
        Event.destroy(component_settings_lock, this.onSettingsLockChange)
        Event.destroy(component_settings_show, this.onSettingsHideChange)
    }
    
    
    onSettingsLockChange = (stat) =>{
        this.refs.lock.setValue(stat)
    }
    
    onSettingsHideChange = (stat) =>{
        this.refs.show.setValue(!stat)
    }
    
    onSettingsChange = (settings) =>{
        let view = getFirstResponder()
        this.refs.show.setValue(!view.properties.settings.isHide)
        this.refs.lock.setValue(view.properties.settings.isLock)
    }
    
    onNameChange = (newName) =>{
        this.setState({value : newName})
    }
    
    onActive = (target) =>{
        this.target = target
        const {show, lock,fixation} = this.refs
        let values = target.properties
        if (values.type === 'group' && !values.isTemporaryGroup) {
            Dom.of(this.refs.scroll).show()
        } else {
            Dom.of(this.refs.scroll).hide()
        }
        this.setState({value : values.alias})
        show.setValue(!values.settings.isHide)
        lock.setValue(values.settings.isLock)
        fixation.setValue(values.settings.fixation)
    }
    
    
    onChange(namespace, key, value){
        let values = {}
        if (this.target.properties.isTemporaryGroup) {
            this.target.getItems().forEach(item =>{
                if (namespace === 'alias') {
                    values[item.id] = key
                } else {
                    values[item.id] = Object.assign({}, item[namespace], {[key] : value})
                }
            })
        } else {
            if (namespace === 'alias') {
                values = key
            } else {
                values = Object.assign({}, this.target.properties.settings, {[key] : value})
                
            }
        }
        
        Event.dispatch(component_properties_change, {
            target : this.target,
            key : namespace,
            value : values
        })
        if(namespace === 'alias'){
            this.setState({value:key})
        }
    }
    
    
    handleOverflowChange = (v) =>{
        let value = Object.assign({}, this.target.properties.settings)
        value['overflow'] = v
        console.log(value)
        Event.dispatch(component_properties_change, {
            target : this.target,
            key : 'settings',
            value : value
        })
    }
    
    
    render(){
        return (
            <InspectorCard title={<Fragment><Icon type={'shezhi1'}/> 设置</Fragment>} className="component-settings">
                <div className={'settings_name'}>
                    <EditableLabel value={this.state.value} onChange={(v) => this.onChange('alias', v)}
                                   className={'component-alias'}/>
                    <ToggleIcon onChange={(v) => this.onChange('settings', 'isHide', !v)} ref={'show'} selected={'eye2'}
                                unselected={'uneye'}/>
                    <ToggleIcon onChange={(v) => this.onChange('settings', 'isLock', v)} ref={'lock'}
                                selected={'lock'} unselected={'pic-unlock'}/>
                </div>
                
                <div className={'fixation'}>固定<Checkbox onChange={(v)=>this.onChange('settings','fixation',v)} ref={'fixation'}/></div>
                <div ref={'scroll'} className={'settings_overflow'}><label>滚动</label> <Select
                    onChange={this.handleOverflowChange}
                    options={Overflow}/></div>
            </InspectorCard>
        )
    }
}