/**
 *  created by yaojun on 2019/1/24
 *
 */
import React from "react";
import Icon from "../lib/Icon";
import Poplist, {Menu, MenuItem} from "../lib/ui/Poplist";
import {getFirstResponder} from "../lib/global/instance";
import {component_active, component_alignment, component_inactive} from "../lib/util/actions";
import Event from "../lib/Base/Event";
import {getFormatShortcutsWithAction, KeyboardActionNameMap} from "../lib/service/KeyboradHandler";
import IconText from "@/lib/ui/IconText";

const Alignment = [
    {
        action : 'alignment_left',
        label : <span><Icon type={'zuoduiqi'}/>左对齐</span>,
        extra : getFormatShortcutsWithAction(KeyboardActionNameMap.ALIGNMENT_LEFT)
    },
    {
        action : 'alignment_center',
        label : <span><Icon type={'juzhongduiqi'}/>水平居中</span>,
        extra : getFormatShortcutsWithAction(KeyboardActionNameMap.ALIGNMENT_CENTER)
    },
    {
        action : 'alignment_right',
        label : <span><Icon type={'youduiqi'}/>右对齐</span>,
        extra : getFormatShortcutsWithAction(KeyboardActionNameMap.ALIGNMENT_RIGHT),
        line : 1
    },
    {
        action : 'alignment_top',
        label : <span><Icon type={'shangduiqi'}/>顶对齐</span>,
        extra : getFormatShortcutsWithAction(KeyboardActionNameMap.ALIGNMENT_TOP),
        disabled : false
    },
    {
        action : 'alignment_middle',
        label : <span><Icon type={'juzhongduiqi1'}/>垂直居中</span>,
        extra : getFormatShortcutsWithAction(KeyboardActionNameMap.ALIGNMENT_MIDDLE)
    }, {
        action : 'alignment_bottom',
        label : <span><Icon type={'xiaduiqi-2'}/>底对齐</span>,
        extra : getFormatShortcutsWithAction(KeyboardActionNameMap.ALIGNMENT_BOTTOM),
        line : 1
    }, {
        action : 'alignment_x',
        label : <span><Icon type={'shuipingfenbu'}/>水平分布</span>,
    }, {
        action : 'alignment_y',
        label : <span><Icon type={'chuizhifenbu'}/>垂直分布</span>,
    }
]

class ActionWrapper extends React.Component{
    state = {
        disabled : true
    }
    
    componentWillMount(){
        Event.listen(component_active, this.handleActive)
        Event.listen(component_inactive, this.handleInactive)
    }
    
    componentWillUnmount(){
        Event.destroy(component_active, this.handleActive)
        Event.destroy(component_inactive, this.handleInactive)
    }
    
    handleActive = ()=>{
        this.setState({disabled : false})
        this.handleChange(false)
    }
    handleInactive = ()=>{
        this.setState({disabled : true})
        this.handleChange(true)
    }
    handleChange = (disabled)=>{
        this.props.onChange(disabled)
    }
    
    render(){
        return <IconText className={`header_action-item_sub ${this.state.disabled ? 'disabled' : ''}`}
                         icon={'youduiqi'}>对齐</IconText>
    }
}

export default class HeaderAlignment extends React.Component{
    handleAlignmentClick = (key)=>{
        if(this.disabled === false)
            Event.dispatch(component_alignment, key)
    }
    
    render(){
        return (<span className={'header_action-item'}>
            <Poplist
                overlay={
                    <Menu onClick={this.handleAlignmentClick} style={{width : 180}}>
                        {
                            ()=>Alignment.map(item=>{
                                let current = getFirstResponder()
                                let disabled = !current
                                let action = item.action
                                if(!disabled) {
                                    if(action === 'alignment_x' || action === 'alignment_y') {
                                        disabled = !(current.properties.isTemporaryGroup && current.group.length > 2 || current.properties.type === 'group' && current.properties.items && current.properties.items.length > 1)
                                    }
                                }
                                return <MenuItem disabled={disabled} action={action} label={item.label}
                                                 extra={item.extra}
                                                 key={item.action}/>
                            })
                        }
                    </Menu>}>
            <ActionWrapper onChange={disabled=>this.disabled = disabled}/>
        </Poplist></span>)
    }
}
