/**
 *  created by yaojun on 2018/12/12
 *
 */

import React from "react";
import {isMac} from "../util/platform";



export default class CtrlKey extends React.Component {
    render(){
        const {children} = this.props
        return (<span>{isMac() ? '⌘':'ctrl'} {children}</span>)
    }
}