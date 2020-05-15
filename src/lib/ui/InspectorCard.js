/**
 *  created by yaojun on 2018/12/23
 *
 */

import React from "react";
import PropTypes from 'prop-types'
import './InspectorCard.scss'
import Icon from "../Icon";


export default class InspectorCard extends React.Component {
    state={
        expand:true
    }
    static propTypes = {
        title : PropTypes.any,
        children : PropTypes.any,
        className : PropTypes.string,
        style : PropTypes.object
    }
    
    toggleDisplay=()=>{
        this.setState({expand:!this.state.expand})
    }
    
    render(){
        const {title, children, style, className = ''} = this.props
        return (<div style={style} className={`inspector-card`}>
            <div className={'ins-card-title'}> {title} <Icon onClick={this.toggleDisplay} rotation={this.state.expand ? 180 : 0} className={'switch'} type={'shouqi'}/></div>
            <div style={{display:this.state.expand ? 'block':'none'}} className={`ins-card-content  ${className}`}>
                {children}
            </div>
        </div>)
    }
}