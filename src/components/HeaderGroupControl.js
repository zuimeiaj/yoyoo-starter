/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from "react";
import Event from "../lib/Base/Event";
import {component_active, component_inactive, context_pack, context_unpack} from "../lib/util/actions";
import {getFirstResponder} from "@/lib/global/instance";
import IconText from "@/lib/ui/IconText";

export default class HeaderGroupControl extends React.Component{
    state = {
        disabled : true,
        text : 'combination',
        msg : '组合'
    }
    
    componentWillMount(){
        Event.listen(component_active, this.handleActive)
        Event.listen(component_inactive, this.handleInactive)
    }
    
    componentWillUnmount(){
        Event.destroy(component_active, this.handleActive)
        Event.destroy(component_inactive, this.handleInactive)
    }
    
    handleActive = (target)=>{
        if(target.properties.isTemporaryGroup === true) {
            this.setState({text : 'combination', disabled : false, msg : '组合'})
        } else if(target.properties.type == 'block') {
            this.setState({text : 'zuhe', disabled : false, msg : '解散'})
        } else {
            this.setState({disabled : true})
        }
    }
    handleInactive = ()=>{
        this.setState({disabled : true})
    }
    handleGroup = ()=>{
        if(this.state.disabled === true) return
        if(getFirstResponder().properties.type == 'block') {
            Event.dispatch(context_unpack)
        } else if(getFirstResponder().properties.isTemporaryGroup) {
            Event.dispatch(context_pack)
        }
    }
    
    render(){
        return (<IconText className={`header_action-item ${this.state.disabled ? 'disabled' : ''}`}
                          onClick={this.handleGroup}
                          icon={this.state.text}>{this.state.msg}</IconText>)
    }
}