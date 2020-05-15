/**
 *  created by yaojun on 2019/1/30
 *
 */
import React from "react";
import Event from "../lib/Base/Event";
import {workspace_scroll_center} from "../lib/util/actions";
import IconText from "@/lib/ui/IconText";

export default class HeaderPanToCenter extends React.Component{
    handleClick = ()=>{
        Event.dispatch(workspace_scroll_center)
    }
    
    render(){
        return (<IconText onClick={this.handleClick}
                          icon={'juzhong4'}
                          className={'header_action-item'}>居中</IconText>)
    }
}