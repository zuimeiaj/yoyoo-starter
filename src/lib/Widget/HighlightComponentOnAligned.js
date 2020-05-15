/**
 *  created by yaojun on 2019/2/15
 *
 */

import React, {Fragment} from "react";
import Event from "../Base/Event";
import {component_snap_change, component_snap_change_end} from "../util/actions";
import {Dom} from "../util/helper";
import {getScreeTransform} from "../global";
import './HighlightComponentOnAligned.scss'



const types = ['vl', 'vc', 'vr', 'ht', 'hc', 'hb']
export default class HighlightComponentOnAligned extends React.Component {
    /**
     *
     * @type {Dom}
     */
    g = null;
    
    
    componentWillMount(){
        Event.listen(component_snap_change, this.handleSnapChange)
        Event.listen(component_snap_change_end, this.handleSnapEnd)
    }
    
    
    componentDidMount(){
        this.ht = Dom.of(this.refs.ht)
        this.hc = Dom.of(this.refs.hc)
        this.hb = Dom.of(this.refs.hb)
        this.vl = Dom.of(this.refs.vl)
        this.vc = Dom.of(this.refs.vc)
        this.vr = Dom.of(this.refs.vr)
        
    }
    
    
    componentWillUnmount(){
        Event.destroy(component_snap_change, this.handleSnapChange)
        Event.destroy(component_snap_change_end, this.handleSnapEnd)
    }
    
    
    handleSnapChange = ({x, y, width, height, rotation}, index) =>{
        let scale = getScreeTransform().scale
        this[types[index]].css('transform',`rotate(${rotation}deg)`)
        this[types[index]].show().left(scale * x).top(scale * y).width(scale * width).height(scale * height)
    }
    
    handleSnapEnd = (index) =>{
        if (index === void 0) {
            types.forEach(item =>{
                this[item].hide()
            })
        } else {
            this[types[index]].hide()
        }
    }
    
    
    render(){
        return (
            <Fragment>
                <div className={'aligned-rect'} ref={'ht'}></div>
                <div className={'aligned-rect'} ref={'hc'}></div>
                <div className={'aligned-rect'} ref={'hb'}></div>
                <div className={'aligned-rect'} ref={'vl'}></div>
                <div className={'aligned-rect'} ref={'vc'}></div>
                <div className={'aligned-rect'} ref={'vr'}></div>
            </Fragment>
        )
    }
}