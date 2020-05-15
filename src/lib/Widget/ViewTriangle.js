/**
 *  created by yaojun on 2019/2/21
 *
 */

import React from "react";
import ViewController from "./ViewController";
import {Dom, uuid} from "../util/helper";
import {initialCoverageIndex} from "../global";



export default class ViewTriangle extends ViewController {
    initProperties(){
        let dom = Dom.of(this.refs.container)
        
        //  初始化层级，最后挂载的元素都在最上面
        if (this.properties.zIndex === -1) {
            this.properties.zIndex = initialCoverageIndex()
        }
        dom.zIndex(this.properties.zIndex)
        dom.showHide(!this.properties.settings.isHide)
        
    }
    
    
    setColor(key, value){
        if(key =='border') key='stroke'
        if(key =='bg') key ='fill'
        Dom.of(this.refs.line).css(key, value)
    }
    
    
    setTransform(x, y, w, h, r){
        super.setTransform(x, y, w, h, r)
        let {width, height} = this.properties.transform
        this.refs.line.setAttribute('points', `0,${height}  ${width / 2},0  ${width},${height}`)
    }
    
    
    renderContent(){
        let {x, y, rotation, width, height} = this.properties.transform
        let {border:{width:sw,color,style},bg} = this.properties
        let strokeDash ={}
        if(style =='dashed'){
            strokeDash.strokeDasharray=sw* 3
            strokeDash.strokeDashoffset=3
        }else if(style =='dotted'){
            strokeDash.strokeDasharray=sw
            strokeDash.strokeDashoffset=sw
        }
        return (
            <svg style={{width : '100%', height : '100%'}} xmlns={'http://www.w3.org/2000/svg'} data-uid={this.properties.id}
                 className={'view-triangle'}>
                <polygon ref={'line'}
                         strokeWidth={sw}
                         {...strokeDash}
                         points={`1,${height -1 }  ${width / 2},0  ${width -1},${height -1}`}
                         style={{fill :bg,stroke:color}}/>
             
            </svg>
        )
    }
}