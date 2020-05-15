/**
 *  created by yaojun on 2018/12/9
 *
 */
import React from "react";
import NoZoomTransform from "../Base/NoZoomTransform";
import config from "../util/preference";
import Event from "../Base/Event";
import {context_page_update, outline_page_select, preferences_configchange} from "../util/actions";
import './ViewportBackground.scss'
import Draggable from "../Draggable";
import Icon from "../Icon";
import ColorInput from "../ui/ColorInput";
import {getCurrentPage} from "../global/instance";
import {getPageData} from "../util/page";

/**
 * @class ViewportBackground
 * @memberOf React.Component
 */
export default class ViewportBackground extends NoZoomTransform{
    state = {
        height : 0,
        width : 0
    }
    
    componentDidMount(){
        Event.listen(preferences_configchange, this.refreshTarget)
        Event.listen(outline_page_select, this.handlePageSelect)
        let height = 0
        new Draggable(this.refs.resize, {
            onDragStart : ()=>{
                height = config.viewport.height
            },
            onDragMove : ({deltaY})=>{
                height += deltaY
                config.viewport.height = height
                this.refs.size.innerText = `${config.viewport.width} x ${Math.round(height)}`
                this.refreshTarget(config)
                console.log(height)
            },
            onDragEnd : ()=>{
                Event.dispatch(preferences_configchange, config)
                Event.dispatch(context_page_update, {
                    id : getCurrentPage(),
                    key : 'height',
                    value : config.viewport.height
                })
            }
        })
        this.refreshTarget(config)
    }
    
    refreshTarget = (config)=>{
        const {viewport, grid} = config
        this.target = {
            getOffsetRect(){
                return {
                    x : 0, y : 0, width : config.viewport.width, height : viewport.height, rotation : 0
                }
            }
        }
        this.setBoundingRect()
        this.setState({width : config.viewport.width, height : config.viewport.height})
        this.refs.grid.style.display = grid ? 'block' : 'none'
    }
    
    componentWillUnmount(){
        Event.destroy(preferences_configchange, this.refreshTarget)
        Event.destroy(outline_page_select, this.handlePageSelect)
    }
    
    handlePreview = (color)=>{
        this.refs.container.style.background = color
    }
    handlePageSelect = (id)=>{
        let page = getPageData().find(item=>item.id == id)
        this.refs.colorBg.setValue(page.bg)
        config.viewport.height = page.height
        this.handlePreview(page.bg)
        this.refreshTarget(config)
        this.setState({
            width : config.viewport.width,
            height : page.height
        })
    }
    handleChange = (color)=>{
        Event.dispatch(context_page_update, {
            id : getCurrentPage(),
            key : "bg",
            value : color
        })
    }
    
    render(){
        return (<div className={'viewport-background'} ref={'container'}>
            <div ref={'resize'} className={'resize'}>
                <ColorInput ref={'colorBg'} onPreview={this.handlePreview} onChange={this.handleChange}
                            defaultValue={'rgba(0,0,0,0)'}/>
                <Icon type={'shuipingheix'}/>
                <span ref={'size'}
                      className={'viewport-bg_size'}>{this.state.width} x {this.state.height}</span>
            </div>
            <svg ref={'grid'} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="gridSmall" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none"
                              stroke="rgba(207, 207, 207, 0.2)" strokeWidth={1}></path>
                    </pattern>
                    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <rect width="100" height="100" fill="url(#gridSmall)"></rect>
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(186, 186, 186, 0.1)"
                              strokeWidth={1}></path>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)"></rect>
            </svg>
        </div>)
    }
}