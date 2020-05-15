/**
 *  created by yaojun on 2019/1/31
 *
 */
import React from "react";
import Event from "../lib/Base/Event";
import {guide_display, guide_hide, guide_toggle} from "../lib/util/actions";
import IconText from "@/lib/ui/IconText";

export default class HeaderGuides extends React.Component{
    state = {
        show : true
    }
    
    componentWillMount(){
        Event.listen(guide_display, this.handleDisplay)
        Event.listen(guide_hide, this.handleHide)
        Event.listen(guide_toggle, this.handle)
    }
    
    componentWillUnmount(){
        Event.destroy(guide_display, this.handleDisplay)
        Event.destroy(guide_hide, this.handleHide)
        Event.destroy(guide_toggle, this.handle)
    }
    
    handleDisplay = ()=>{
        this.setState({show : true})
    }
    handleHide = ()=>{
        this.setState({show : false})
    }
    handle = ()=>{
        if(this.state.show) {
            Event.dispatch(guide_hide)
        } else {
            Event.dispatch(guide_display)
        }
    }
    
    render(){
        return (
            <IconText onClick={this.handle}
                      className={`header_action-item`}
                      icon={this.state.show ? 'cankaoxian-biyan-' : 'cankaoxian-biyan-1'}>辅助线</IconText>)
    }
}