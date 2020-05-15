/**
 *  created by yaojun on 2018/11/6
 *
 */
import React, {Component} from "react";
import EditorViews from "./EditorViews";
import Rulers from "../lib/Widget/Rulers";
import './Editor.scss'
import ColorPicker from "../lib/ui/ColorPicker/ColorPicker";
import Event from "../lib/Base/Event";
import {window_size_change} from "../lib/util/actions";
import {Settings} from "./HeaderSettings";
import CanvasDraggable from "../lib/Widget/CanvasDraggable";
import LineNumber from "../lib/ui/LineNumber";
import BackToProject from '../lib/Widget/BackToProject'
import {BaseComponentsActionBar} from "@/components/OutlineComponents";
import ZoomSlider from "@/lib/ui/ZoomSlider";

const debounce = require('debounce')
export default class Editor extends Component{
    state = {
        loading : false
    }
    
    componentWillMount(){
        //  this.handleResize = debounce(this.handleResize, 500)
        window.addEventListener('resize', this.handleResize, false)
    }
    
    handleResize = ()=>{
        Event.dispatch(window_size_change)
    }
    
    componentWillUnmount(){
        window.removeEventListener('resize', this.handleResize, false)
    }
    
    render(){
        return (
            <div className={'root-layout-editor'}>
                <EditorViews/>
                <Rulers/>
                {/*Global Color picker*/}
                <ColorPicker/>
                {/*Global preference*/}
                <Settings/>
                
                <CanvasDraggable/>
                
                <LineNumber/>
                
                <ZoomSlider/>
                
                
                <BaseComponentsActionBar/>
                
                <BackToProject/>
            </div>)
    }
}

