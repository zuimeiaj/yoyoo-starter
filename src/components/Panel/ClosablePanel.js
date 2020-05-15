/**
 *  created by yaojun on 2019/5/14
 *
 */

import React from "react";
import Icon from "../../lib/Icon";
import PropTypes from 'prop-types'
import './ClosablePanel.scss'
import Event from "@/lib/Base/Event";
import {outline_closable_panel_hide, outline_closable_panel_show} from "@/lib/util/actions";



export default class ClosablePanel extends React.Component {
    static propTypes = {
        title : PropTypes.string.isRequired,
        children : PropTypes.any
    }
    
    state = {
        visible : false,
        title : ''
    }
    
    
    componentWillMount(){
        Event.listen(outline_closable_panel_show, this.show)
        Event.listen(outline_closable_panel_hide, this.hide)
    }
    
    
    componentWillUnmount(){
        Event.destroy(outline_closable_panel_show, this.show)
        Event.destroy(outline_closable_panel_hide, this.hide)
    }
    
    
    show = (title) =>{
        this.setState({visible : true, title})
    }
    
    hide = () =>{
        this.setState({visible : false, title : ''})
    }
    
    handlePnaleTransition = () =>{
        if (!this.state.visible)
            this.refs.panel.style.display = 'none'
    }
    
    
    render(){
        return (<div ref={'panel'} onTransitionEnd={this.handlePnaleTransition}
                     className={`closable-panel ${this.state.visible ? 'show' : 'hide'}`}>
            <div className={'panel-title'}>
                <span>{this.props.title}</span>
                <Icon onClick={this.hide} type={'guanbi'} className={'panel-close'}/>
            </div>
            <div className={'panel-content'}>
                {this.props.children}
            </div>
        </div>)
    }
}