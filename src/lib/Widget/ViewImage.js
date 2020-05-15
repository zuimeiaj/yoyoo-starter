/**
 *  created by yaojun on 2019/1/2
 *
 */

import React from "react";
import ViewController from "./ViewController";
import Image from "../ui/Image";
import {DEFAULT_IMG} from "../util/helper";
import {Dropable} from "../ui/NativeDragDrop";
import Event from "../Base/Event";
import {component_properties_change} from "../util/actions";
import {getFirstResponder} from "../global/instance";



export default class ViewImage extends ViewController {
    /**
     * @override
     * @return {*|SVGGElement}
     */
    getDomWrapper(){
        return this.refs.g
    }
    
    
    onDrop = (data, e) =>{
        if (data.type === 'image' && data.data && getFirstResponder()) {
            e.stopPropagation()
            e.preventDefault()
            Event.dispatch(component_properties_change, {
                target : this,
                key : 'image',
                value : Object.assign({}, this.properties.image, {source : data.data})
            })
        }
    }
    
    
    renderContent(){
        const {image : {source, fill}, transform} = this.props.properties
        
        // Block
        // Flex
        return (
            <div ref={'g'} className={'view-image'}>
                <Dropable customEvent={true} onDrop={this.onDrop} className={'view-image-wrapper'}>
                    <Image mode={fill}
                           lazyLoad={true}
                           rect={transform}
                           style={{pointerEvents : "none"}}
                           src={source || DEFAULT_IMG}/>
                </Dropable>
            </div>
        )
    }
}