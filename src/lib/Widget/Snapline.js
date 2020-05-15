/**
 *  created by yaojun on 2018/12/7
 *
 */
import React, {Fragment} from "react";
import Event from "../Base/Event";
import {
    component_active,
    component_drag,
    component_dragend,
    component_properties_change,
    component_resize_end,
    component_snap_change,
    component_snap_change_end,
    controllers_ready,
    editor_scroll_change,
    guide_ready
} from "../util/actions";
import './Snapline.scss'
import config from "../util/preference";
import NoZoomTransform from "../Base/NoZoomTransform";
import {Dom} from "../util/helper";
import {getGroupId} from "../global/selection";
import {getScreeTransform} from "../global";

let P = config.autoAlign
export default class Snapline extends NoZoomTransform{
    constructor(){
        super()
        /**
         * 将页面所有组件转为数组
         * @type {Array<{x:number,y:number,width:number,height:number}>}
         */
        this.arrayItems = []
        /**
         *
         * 已匹配到的数据
         * @type {Array<{x:number,y:number,width:number,height:number,rotation:number}>}
         */
        this.matched = []
        /**
         *
         * @type {ViewController}
         */
        this.target = null
        /**
         *
         * @type {Array<Line>}
         */
        this.guide = null
        /**
         *
         * @type {Array<ViewProperties>}
         */
        this.controller = null
        /**
         *
         * @type {Dom}
         */
        this.htline = null
        /**
         *
         * @type {Dom}
         */
        this.hcline = null
        /**
         *
         * @type {Dom}
         */
        this.hbline = null
        /**
         *
         * @type {Dom}
         */
        this.vlline = null
        /**
         *
         * @type {Dom}
         */
        this.vcline = null
        /**
         *
         * @type {Dom}
         */
        this.vrline = null
        Event.listen(guide_ready, this.onGuideReady)
        Event.listen(controllers_ready, this.onControllersReady)
        Event.listen(component_active, this.onComponentActive)
        Event.listen(component_drag, this.onComponentDrag)
        Event.listen(component_dragend, this.onComponentDragEnd)
        Event.listen(component_resize_end, this.onComponentDragEnd)
    }
    
    componentDidMount(){
        this.htline = Dom.of(this.refs.ht)
        this.hcline = Dom.of(this.refs.hc)
        this.hbline = Dom.of(this.refs.hb)
        this.vlline = Dom.of(this.refs.vl)
        this.vcline = Dom.of(this.refs.vc)
        this.vrline = Dom.of(this.refs.vr)
        this.setLineSize()
    }
    
    setLineSize = (scale = 1)=>{
        let view = config.viewport
        Dom.of(this.refs.g1).width(view.width * scale)
        Dom.of(this.refs.g2).height(view.height * scale)
    }
    onControllersReady = (c)=>{
        this.controller = c
    }
    onComponentActive = (t)=>{
        this.target = t
        P = config.autoAlign
        this.setBoundingRect()
        let arrayItems = []
        
        function treeToArray(items){
            let targetId = t.properties.id
            for(let i = 0, j = items.length; i < j; i += 1) {
                let item = items[i]
                //  去掉自己，和自己的子元素
                if(getGroupId()[item.id]) continue
                if(targetId === item.id) continue
                if(item.settings.isHide) continue
                if(item.type === 'block') {
                    treeToArray(item.items)
                } else {
                    let t = item.view.getOffsetTransform()
                    t._originTransform = item.view.getOffsetRect()
                    arrayItems.push(t)
                }
            }
        }
        
        treeToArray(this.controller.state.items)
        this.arrayItems = arrayItems
    }
    // Display line
    showHTLine = (t)=>{
        this.htline.top(t.y * getScreeTransform().scale).show()
    }
    showHBLine = (t)=>{
        this.hbline.top(t.y * getScreeTransform().scale + t.height * getScreeTransform().scale).show()
    }
    
    showHCLine(t){
        this.hcline.top(t.y * getScreeTransform().scale + t.height * getScreeTransform().scale / 2).show()
    }
    
    showVCLine(t){
        this.vcline.left(t.x * getScreeTransform().scale + t.width * getScreeTransform().scale / 2).show()
    }
    
    showVLLine(t){
        this.vlline.left(t.x * getScreeTransform().scale).show()
    }
    
    showVRLine(t){
        this.vrline.left(t.x * getScreeTransform().scale + t.width * getScreeTransform().scale).show()
    }
    
    onComponentDrag = (target, options = {})=>{
        if(options.hideGuides) return
        if(options.from === 'Snapline') return
        // Refresh current position
        this.setBoundingRect()
        let t2 = this.target.getOffsetTransform()
        let matched = this.checkComponentDistance(t2)
        let cmatched = this.alignParent()
        // Fix BUG : 2019-02-01 22:00,根据父元素没有匹配到时把其他对齐线隐藏了
        if(cmatched[0] !== void 0) {
            this.showVLLine(t2)
        } else if(!matched[3]) {
            this.vlline.hide()
        }
        if(cmatched[1] !== void 0) {
            this.showVCLine(t2)
        } else if(!matched[4]) {
            this.vcline.hide()
        }
        if(cmatched[2] !== void 0) {
            this.showVRLine(t2)
        } else if(!matched[5]) {
            this.vrline.hide()
        }
        if(cmatched[3] !== void 0) {
            this.showHTLine(t2)
        } else if(!matched[0]) {
            this.htline.hide()
        }
        if(cmatched[4] !== void 0) {
            this.showHCLine(t2)
        } else if(!matched[1]) {
            this.hcline.hide()
        }
        if(cmatched[5] !== void 0) {
            this.showHBLine(t2)
        } else if(!matched[2]) {
            this.hbline.hide()
        }
        for(let i = 0; i < matched.length; i += 1) {
            if(matched[i]) {
                Event.dispatch(component_snap_change, matched[i]._originTransform, i)
            } else {
                Event.dispatch(component_snap_change_end, i)
            }
        }
        this.matched = matched
        this.cmatched = cmatched
    }
    /**
     *
     * @return {number} 0=h,1=v
     */
    alignParent = ()=>{
        let vw = config.viewport.width
        let vh = config.viewport.height
        let x = 0
        let parent = this.target.properties.parent
        let t = this.target.getCurrentTransform()
        if(parent) {
            vw = parent.transform.width
            vh = parent.transform.height
        }
        let matched = []
        let dx = 0 - t.x, dx2 = vw / 2 - (t.x + t.width / 2), dx3 = vw - (t.x + t.width)
        if(Math.abs(dx) < P) matched[0] = dx // Left
        else if(Math.abs(dx2) < P) matched[1] = dx2 // Center
        else if(Math.abs(dx3) < P) matched[2] = dx3 // Right
        dx = 0 - t.y
        dx2 = vh / 2 - (t.y + t.height / 2)
        dx3 = vh - (t.y + t.height)
        if(Math.abs(dx) < P) matched[3] = dx // Top
        else if(Math.abs(dx2) < P) matched[4] = dx2 //Middle
        else if(Math.abs(dx3) < P) matched[5] = dx3  // Bottom
        return matched
    }
    /**
     * 返回匹配的 元素
     * @param items {Array<ViewProperties>}
     * @return {Array<ViewProperties>}
     */
    checkComponentDistance = (t2)=>{
        let items = this.arrayItems
        let ht, hc, hb, vl, vc, vr;
        for(let i = 0, j = items.length; i < j; i++) {
            let t1 = items[i]
            if(!ht) ht = this.matchHT(t1, t2)
            if(!hc) hc = this.matchHC(t1, t2)
            if(!hb) hb = this.matchHB(t1, t2)
            if(!vl) vl = this.matchVL(t1, t2)
            if(!vc) vc = this.matchVC(t1, t2)
            if(!vr) vr = this.matchVR(t1, t2)
        }
        return [ht, hc, hb, vl, vc, vr]
    }
    matchVL = (t1, t2)=>{
        let dx = t1.x - t2.x,
            dx2 = (t1.x + t1.width) - t2.x
        // v left
        if(Math.abs(dx) < P) {
            t1._alignType_v_left = true
            t1._alignDiff_v_left = dx
            this.showVLLine(t2)
            return t1
        } else if(Math.abs(dx2) < P) {
            t1._alignType_v_right_left = true
            t1._alignDiff_v_right_left = dx2
            this.showVLLine(t2)
            return t1
        }
    }
    matchVC = (t1, t2)=>{
        let dx = t1.x + t1.width / 2 - (t2.x + t2.width / 2)
        // v center
        if(Math.abs(dx) < P) {
            t1._alignType_v_center = true
            t1._alignDiff_v_center = dx
            this.showVCLine(t2)
            return t1
        }
    }
    matchVR = (t1, t2)=>{
        let dx = t1.x + t1.width - (t2.x + t2.width),
            dx2 = t1.x - (t2.x + t2.width)
        // v right
        if(Math.abs(dx) < P) {
            t1._alignType_v_right = true
            t1._alignDiff_v_right = dx
            this.showVRLine(t2)
            return t1
        } else if(Math.abs(dx2) < P) {
            t1._alignType_v_left_right = true
            t1._alignDiff_v_left_right = dx2
            this.showVRLine(t2)
            return t1
        }
    }
    matchHT = (t1, t2)=>{
        let ht, dx = t1.y - t2.y, dx2 = (t1.height + t1.y) - t2.y
        //h top
        if(Math.abs(dx) < P) {
            ht = t1
            ht._alignType_h_top = true
            ht._alignDiff_h_top = dx
            this.showHTLine(t2)
        } else if(Math.abs(dx2) < P) {
            ht = t1
            ht._alignType_h_bottom_top = true
            ht._alignDiff_h_bottom_top = dx2
            this.showHTLine(t2)
        }
        return ht
    }
    matchHC = (t1, t2)=>{
        // h center
        let hc, dx = t1.y + t1.height / 2 - (t2.y + t2.height / 2)
        if(Math.abs(dx) < P) {
            hc = t1
            hc._alignType_h_center = true
            hc._alignDiff_h_center = dx
            this.showHCLine(t2)
        }
        return hc
    }
    matchHB = (t1, t2)=>{
        var hb, dx = t1.y + t1.height - (t2.y + t2.height), dx2 = t1.y - (t2.y + t2.height)
        // h bottom
        if(Math.abs(dx) < P) {
            hb = t1
            hb._alignType_h_bottom = true
            hb._alignDiff_h_bottom = dx
            this.showHBLine(t2)
        } else if(Math.abs(dx2) < P) {
            hb = t1
            hb._alignType_h_top_bottom = true
            hb._alignDiff_h_top_bottom = dx2
            this.showHBLine(t2)
        }
        return hb
    }
    checkGuidesDistance = ()=>{
    }
    _getRectWithParent = ()=>{
        return this.target.properties.parent ? this.target.properties.parent.view.getOffsetRect() : {
            x : 0,
            y : 0,
            width : config.viewport.width,
            height : config.viewport.height
        }
    }
    onComponentDragEnd = ()=>{
        this.htline.hide()
        this.hcline.hide()
        this.hbline.hide()
        this.vlline.hide()
        this.vrline.hide()
        this.vcline.hide()
        let matched = this.matched
        let cmatched = this.cmatched
        if(!matched) return
        if(!cmatched) return
        let ht = matched[0], hc = matched[1], hb = matched[2];
        let vl = matched[3], vc = matched[4], vr = matched[5];
        let t2 = this.target.properties.transform
        let parent = this.target.properties.parent
        let pRect = this._getRectWithParent()
        let x, y
        if(ht) {
            if(ht._alignType_h_top) {
                y = t2.y + ht._alignDiff_h_top
            } else if(ht._alignType_h_bottom_top) {
                y = t2.y + ht._alignDiff_h_bottom_top
            }
        }
        if(hc) {
            y = t2.y + hc._alignDiff_h_center
        }
        if(hb) {
            if(hb._alignType_h_bottom) {
                y = t2.y + hb._alignDiff_h_bottom
            } else if(hb._alignType_h_top_bottom) {
                y = t2.y + hb._alignDiff_h_top_bottom
            }
        }
        if(vl) {
            if(vl._alignType_v_left) {
                x = t2.x + vl._alignDiff_v_left
            } else if(vl._alignType_v_right_left) {
                x = t2.x + vl._alignDiff_v_right_left
            }
        }
        if(vc) {
            x = t2.x + vc._alignDiff_v_center
        }
        if(vr) {
            if(vr._alignType_v_right) {
                x = t2.x + vr._alignDiff_v_right
            } else if(vr._alignType_v_left_right) {
                x = t2.x + vr._alignDiff_v_left_right
            }
        }
        if(cmatched[0] !== void 0) { // left of parent
            x = t2.x + cmatched[0]
        } else if(cmatched[1] !== void 0) {
            x = t2.x + cmatched[1]
        } else if(cmatched[2] !== void 0) {
            x = t2.x + cmatched[2]
        }
        if(cmatched[3] !== void 0) {
            y = t2.y + cmatched[3]
        } else if(cmatched[4] !== void 0) {
            y = t2.y + cmatched[4]
        } else if(cmatched[5] !== void 0) {
            y = t2.y + cmatched[5]
        }
        let transform = Object.assign({}, t2)
        let align = false
        if(x !== void 0) {
            transform.x = x
            align = true
        }
        if(y !== void 0) {
            align = true
            transform.y = y
        }
        //if (ht && hb && ht === hb && ht.rotation === transform.rotation) {
        //    transform.height = hb.height
        //}
        //if (vl && vr && vl === vr && vl.rotation === transform.rotation) {
        //    transform.width = vr.width
        //}
        if(align) {
            let values = {}
            if(this.target.properties.isTemporaryGroup) {
                this.target.getItems().forEach(item=>{
                    let x = transform.x + item._xPercent * transform.width
                    let y = transform.y + item._yPercent * transform.height
                    let w = item._wPercent * transform.width
                    let h = item._hPercent * transform.height
                    values[item.id] = {x, y, width : w, height : h, rotation : item.transform.rotation}
                })
            } else {
                values = transform
            }
            Event.dispatch(component_properties_change, {
                target : this.target,
                key : 'transform',
                value : values,
                from : "Snapline"
            })
        }
        matched.forEach(item=>{
            for(let key in item) {
                if(key.startsWith('_alignType')) {
                    item[key] = null
                }
            }
        })
        this.matched = []
        this.cmatched = []
        Event.dispatch(component_snap_change_end)
    }
    onGuideReady = (guide)=>{
        this.guide = guide
    }
    
    componentWillUnmount(){
        Event.destroy(controllers_ready, this.onControllersReady)
        Event.destroy(guide_ready, this.onGuideReady)
        Event.destroy(component_active, this.onComponentActive)
        Event.destroy(component_drag, this.onComponentDrag)
        Event.destroy(component_dragend, this.onComponentDragEnd)
        Event.destroy(editor_scroll_change, this.handleScale)
        Event.destroy(component_resize_end, this.onComponentDragEnd)
    }
    
    /**
     * @override
     */
    setScale(scale){
        super.setScale(scale)
        this.setLineSize(scale)
    }
    
    /**
     * @override
     */
    applyToDom = ()=>{
    }
    
    render(){
        return (
            <Fragment>
                <div ref={'g1'} id={'snapline-wrapper-h'}>
                    <div className={'snapline snapline-h'} ref={'ht'}></div>
                    {/*中心线*/}
                    <div className={'snapline snapline-h'} ref={'hc'}></div>
                    <div className={'snapline snapline-h'} ref={'hb'}></div>
                
                </div>
                <div ref={'g2'} className={'snapline-wrapper-v'}>
                    <div className={'snapline snapline-v'} ref={'vl'}></div>
                    {/*中心线*/}
                    <div className={'snapline snapline-v'} ref={'vc'}></div>
                    {/**/}
                    <div className={'snapline snapline-v'} ref={'vr'}></div>
                </div>
            </Fragment>
        )
    }
}