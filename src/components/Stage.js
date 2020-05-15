/**
 *  created by yaojun on 2018/12/7
 *
 */

import React from "react";
import Event from "../lib/Base/Event";
import {editor_scroll_change, preferences_configchange} from "../lib/util/actions";
import config from "../lib/util/preference";
import PropTypes from 'prop-types'
import {setScreenOffset} from "../lib/global";



export default class Stage extends React.Component {
    static propTypes = {
        className : PropTypes.string,
        children : PropTypes.any,
        zoomable : PropTypes.bool
    }
    
    
    componentWillMount(){
        if (this.props.zoomable) {
            Event.listen(preferences_configchange, this.handlePreferenceChange)
        }
    }
    
    
    handlePreferenceChange = () =>{
    }
    
    
    componentDidMount(){
        setTimeout(() =>{
            Event.listen(editor_scroll_change, this.handleScrollChange)
            let rect = this.refs.w.parentNode.getBoundingClientRect()
            this.cx = config.originCoords.x
            this.cy = config.originCoords.y
            this.refs.w.style.left = this.cx + 'px'
            this.refs.w.style.top = this.cy + 'px'
            setScreenOffset(this.cx, this.cy, {x : 0, y : 0})
        })
    }
    
    
    handleScrollChange = ({x, y, scale, isScale}) =>{
        let zoom = this.props.zoomable ? scale : 1
        this.refs.g.style.transform = `matrix(${zoom},0,0,${zoom},${-x * scale},${-y * scale})`
        if (isScale) {
            let g = this.refs.w.style
            g.left = this.cx * scale + 'px'
            g.top = this.cy * scale + 'px'
            
            setScreenOffset(this.cx, this.cy)
        }
    }
    
    
    componentWillUnmount(){
        Event.destroy(editor_scroll_change, this.handleScrollChange)
        Event.destroy(preferences_configchange, this.handlePreferenceChange)
    }
    
    
    render(){
        const {className, children} = this.props
        return (
            <div ref={'w'} style={{position : 'absolute'}}>
                {/* Initial stage from original coordinates */}
                <div className={className} style={{position : 'absolute'}} ref={'g'}>
                    {children}
                </div>
            </div>)
    }
}