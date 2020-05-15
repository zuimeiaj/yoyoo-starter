/**
 *  created by yaojun on 2018/12/22
 *
 */

import React, {Fragment} from "react";
import NumberInput from "./NumberInput";
import ColorInput from "./ColorInput";
import Button, {ButtonGroup} from "./Button";
import Icon from "../Icon";
import './InspectorText.scss'
import InspectorCard from "./InspectorCard";
import Event from "../Base/Event";
import {component_active, component_properties_change} from "../util/actions";
import TextProperties, {FontIconProperties} from "../properties/text";
import {Dropable} from "./NativeDragDrop";
import {PresetIcon} from "../PresetIcons";
import {Dom} from "../util/helper";
import Checkbox from "./Checkbox";



export default class InspectorText extends React.PureComponent {
    componentWillMount(){
        Event.listen(component_active, this.onActive)
    }
    
    componentDidMount(){
        this.props.target &&  this.onActive(this.props.target)
    }
    
    componentWillUnmount(){
        Event.destroy(component_active, this.onActive)
    }
    
    
    onActive = (target) =>{
        let type = target.properties.type
        if (!(target.properties instanceof TextProperties)) return
        this.target = target
        let font = target.properties.font
        let {fontSize, fontColor, fontStyle, fontDecorator, fontAlignX, fontAlignY, lineHeight, letterSpacing} = this.refs
        
        fontSize.setValue(font.size)
        fontColor.setValue(font.color)
        fontStyle.setValue(font.style)
        fontDecorator.setValue(font.decorator)
        fontAlignX.setValue(font.alignX)
        fontAlignY.setValue(font.alignY)
        lineHeight.setValue(font.lineHeight)
        letterSpacing.setValue(font.spacing)
        
    }
    
    updateProps = (key, value, font) =>{
        let result = Object.assign({}, font)
        result[key] = value
        return result
    }
    
    onChange = (key, value) =>{
        let font = null
        if (this.target) {
            font = {}
            if (this.target.properties.isTemporaryGroup) {
                this.target.getItems().forEach(item =>{
                    font[item.id] = this.updateProps(key, value, item.font)
                })
            } else {
                font = this.updateProps(key, value, this.target.properties.font)
            }
            
            Event.dispatch(component_properties_change, {
                target : this.target,
                key : 'font',
                value : font
            })
        }
    }
    
    
    render(){
        return (<InspectorCard title={<Fragment><Icon type={'wenben1'}/>文本</Fragment>} className={'inspector-text'}>
            <div className={'item'}>
                <div className={'control-label'}>字号</div>
               
            </div>
            <div className={'item'}>
                <div className={'control-label'}>样式</div>
                <div className={'control-items'}>
                   
               
                </div>
            </div>
           
            
           
        
        
        </InspectorCard>)
    }
}

export class FontIconEditor extends InspectorText {
    onActive = (target) =>{
        let type = target.properties.type
        if (type !== 'text' && !(target.properties instanceof FontIconProperties)) return
        this.target = target
        let font = target.properties.font
        let {fontColor, fontStyle, icon, icon2, icon3, toggle, signle, checked} = this.refs
        
        fontColor.setValue(font.color)
        fontStyle.setValue(font.style)
        icon.setValue(font.data)
        
        if (target.properties.font.iconType === 'toggle') {
            icon2.setValue(font.iconSelected)
            icon3.setValue(font.iconUnselected)
            checked.setValue(font.iconStatus)
            Dom.of(signle).hide()
            Dom.of(toggle).show()
        } else {
            Dom.of(toggle).hide()
            Dom.of(signle).show()
        }
    }
    
    handleIconDrop = (data, key) =>{
        let keys = {
            'data' : 'icon',
            'iconSelected' : 'icon2',
            'iconUnselected' : 'icon3'
        }
        if (data && data.type === 'icon') {
            this.refs[keys[key]].setValue(data.data)
            let font = Object.assign({}, this.target.properties.font)
            font.data = data.data
            font.fontContent = data.fontContent
            
            Event.dispatch(component_properties_change, {
                target : this.target,
                key : 'font',
                value : font
            })
        }
    }
    
    handleToggleChang = (checked) =>{
        this.onChange('iconStatus', checked)
    }
    
    
    render(){
        return (
            <InspectorCard className={'inspector-text inspector-font'}
                           title={<Fragment><Icon type={'jianyi'}/>图标</Fragment>}>
                <div className={'item'}>
                    <div className={'control-label'}>加粗</div>
                    <div className={'control-items'}>
                        <ButtonGroup onClick={(value) => this.onChange('style', value)} ref={'fontStyle'}
                                     multiple={true}>
                            <Button key={'bold'}><Icon type={'cuti'}/></Button>
                            <Button key={'italic'}><Icon type={'xieti'}/></Button>
                        </ButtonGroup>
                    </div>
                </div>
                <div className={'item'}>
                    <div className={'control-label'}>颜色</div>
                    <ColorInput onPreview={(v)=>this.target.setColor('iconColor',v)} onChange={(value) => this.onChange('color', value)} ref={'fontColor'}/>
                </div>
                <div className={'drop-icons'} ref={'signle'}>
                    <div className={'item'}>
                        <div className={'control-label'}>图标</div>
                        <div className={'control-items drop-icon'}>
                            <Dropable onDrop={(data) => this.handleIconDrop(data, 'data')}>拖拽新图标到此
                            </Dropable>
                            【<PresetIcon ref={'icon'}/>】
                        </div>
                    </div>
                </div>
                <div className={'drop-icons'} ref={'toggle'}>
                    <div className={'item'}>
                        <div className={'control-label'}>勾选状态</div>
                        <div className={'control-items drop-icon'}>
                            <Dropable onDrop={(data) => this.handleIconDrop(data, 'iconSelected')}>拖拽新图标到此
                            </Dropable>
                            【<PresetIcon ref={'icon2'}/>】
                        </div>
                    </div>
                    <div className={'item'}>
                        <div className={'control-label'}>未勾选</div>
                        <div className={'control-items drop-icon'}>
                            <Dropable onDrop={(data) => this.handleIconDrop(data, 'iconUnselected')}>拖拽新图标到此
                            </Dropable>
                            【<PresetIcon ref={'icon3'}/>】
                        </div>
                    </div>
                    <div className={'item'}>
                        <div className={'control-label'}>是否勾选</div>
                        <div className={'control-items'}>
                            <Checkbox ref={'checked'} onChange={this.handleToggleChang}/>
                        </div>
                    </div>
                
                </div>
            
            
            </InspectorCard>
        )
    }
}