/**
 *  created by yaojun on 2018/12/5
 *
 */

import React, {Fragment} from "react";
import Ruler from "./Ruler";
import Event from "../Base/Event";
import {editor_scroll_change, window_size_change} from "../util/actions";
import config from "../util/preference";



export default class Rulers extends React.Component {
    componentWillMount(){
        Event.listen(editor_scroll_change, this.handleScrollChange)
        Event.listen(window_size_change, this.handleWindowSizeChange)
    }
    
    
    handleWindowSizeChange = () =>{
        let v = this.refs.rulerh.ruler
        let h = this.refs.rulerv.ruler
        if (v)
            v.update()
        if (h)
            h.update()
    }
    
    handleScrollChange = ({isScale, x, y, scale}) =>{
        if (isScale) {
            this.refs.rulerh.ruler.setScale(scale)
            this.refs.rulerv.ruler.setScale(scale)
        }
        this.refs.rulerh.ruler.translate(x - config.originCoords.x)
        this.refs.rulerv.ruler.translate(y - config.originCoords.y)
    }
    
    
    componentWillUnmount(){
        Event.destroy(editor_scroll_change, this.handleScrollChange)
        Event.destroy(window_size_change, this.handleWindowSizeChange)
    }
    
    
    render(){
        return (<Fragment>
            <Ruler ref={'rulerh'} type={'h'}/>
            <Ruler ref={'rulerv'} type={'v'}/>
        </Fragment>)
    }
}