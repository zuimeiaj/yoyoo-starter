/**
 *  created by yaojun on 2019/1/26
 *
 */

import React from "react";
import {PresetIcon} from "../lib/PresetIcons";
import './Zoomable.scss'
import Event from "../lib/Base/Event";
import {context_zoom_in, context_zoom_out, editor_scroll_change} from "../lib/util/actions";



export default class Zoomable extends React.Component {
    
    componentWillMount(){
        Event.listen(editor_scroll_change, ({isScale, scale}) =>{
            if (isScale) {
                this.refs.text.setValue(Math.round(scale * 100) + '%')
            }
        })
    }
    
    
    render(){
        return (
            <div className={'header_action-item'}>
                aj-zoom-slider <div className={'header-zoomable_icons'}>
                <PresetIcon onClick={() => Event.dispatch(context_zoom_out)} type={'icon-biaodan_minus'}/>
                <PresetIcon type={'icon-jinrong_sousuo'}/>
                <PresetIcon onClick={() => Event.dispatch(context_zoom_in)} type={'icon-xiaochengxu_zengjia2'}/>
            </div>
            </div>
        )
    }
}