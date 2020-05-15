/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from "react";
import {Menu} from "antd";
import {Link, withRouter} from 'react-router-dom'
import IconText from "@/lib/ui/IconText";

const MenuItem = Menu.Item

class HeaderUser extends React.Component{
    handlelogin = async()=>{
        this.props.history.push(`/ucenter/project`)
    }
    
    render(){
        return (
            <IconText onClick={this.handlelogin} className={'header_action-item'} icon={'denglu1'}>我的</IconText>
        )
    }
}

export default withRouter(HeaderUser)