/**
 *  created by yaojun on 2019/3/6
 *
 */

import React, {Component} from "react";
import Types from 'prop-types'
import NumberInput from "./NumberInput";
import Select from "./Select";
import ColorInput from "./ColorInput";
import {getFirstResponder} from "../global/instance";
import Icon from "../Icon";
import Button, {ButtonGroup} from "./Button";
import {Dropable} from "./NativeDragDrop";
import {PresetIcon} from "../PresetIcons";
import './InspectorControl.scss'
import Event from "../Base/Event";
import {component_drag, component_stroke_change} from "../util/actions";
import {ANIMATIONS, isPlainObject} from "../util/helper";
import jQuery from 'jquery'
import {getPageDataWithId} from "../util/page";



function setColorPreview(key, value){
    let view = getFirstResponder()
    if (!view) return
    view.setColor(key, value)
}


class InspectorControl extends Component {
    state = {
        expand : false
    }
    
    static propTypes = {
        label : Types.string,
        children : Types.any,
        className : Types.string,
        defaultExpand : Types.bool,
        display : Types.string
    }
    
    
    componentWillMount(){
        this.setState({expand : this.props.defaultExpand || false})
    }
    
    
    handleExpand = () =>{
        this.setState({expand : !this.state.expand})
    }
    
    
    render(){
        const {label, children, className, display = 'block'} = this.props
        return (<div className={`ins-control_wrapper-content ${className}`}>{children}</div>)
    }
}

class InspectorBase extends Component {
    handleChange = (key, value) =>{
        if (!getFirstResponder()) return
        this.handleChangeImp(key, value)
    }
    
    
    handleChangeImp(key, value){
        let object = getFirstResponder().properties[this.props.field]
        if (isPlainObject(object)) {
            value = {[key] : value}
        }
        this.props.onChange(this.props.field, value)
    }
    
    
    /**
     * @protected
     */
    updateValues(){
    
    }
    
    
    componentWillReceiveProps(props){
        this.updateValues(props.value)
    }
    
    
    componentDidMount(){
        this.updateValues(this.props.value)
    }
}

/**
 * @property border
 */
export class InspectorBorder extends InspectorBase {
    static  BORDER_STYLES = [
        {label : '-----', key : 'dashed'},
        {label : '_____', key : 'solid'},
        {label : '……', key : 'dotted'},
    ]
    
    
    componentDidMount(){
        super.componentDidMount()
        Event.listen(component_stroke_change, this.handleStrokeChange)
    }
    
    
    handleStrokeChange = (width) =>{
        this.refs.borderWidth.setValue(width)
    }
    
    
    componentWillUnmount(){
        Event.destroy(component_stroke_change, this.handleStrokeChange)
    }
    
    
    updateValues = ({width, style, color}) =>{
        const {borderWidth, borderType, borderColor} = this.refs
        if (borderType) {
            borderType.setValue(style)
        }
        if (borderWidth) {
            borderWidth.setValue(width)
        }
        
        borderColor.setValue(color)
    }
    
    
    render(){
        let {style, width} = this.props.value
        return (
            <InspectorControl display={'flex'} className={'ins-control_border'} label={'描边'}>
                {width != 'none' && <NumberInput onChange={(v) => this.handleChange('width', v)} ref={'borderWidth'}
                                                 label={null} min={0} max={100}/>}
                
                {style != 'none' &&
                <Select defaultValue={style} onChange={(v) => this.handleChange('style', v)} ref={'borderType'}
                        options={InspectorBorder.BORDER_STYLES}/>}
                <ColorInput onPreview={(v) => setColorPreview('border', v)}
                            onChange={(v) => this.handleChange('color', v)} ref={'borderColor'}/>
            </InspectorControl>
        )
    }
}

/**
 * @property bg
 * @description bg of properties
 */
export class InspectorFill extends InspectorBase {
    
    updateValues = (bg) =>{
        const {color} = this.refs
        color.setValue(bg)
    }
    
    
    render(){
        return (<InspectorControl className={'ins-control_bg'} label={'填充'}>
            <ColorInput onPreview={(v) => setColorPreview('bg', v)} onChange={(v) => this.handleChange('bg', v)}
                        ref={'color'}/>
            <span onClick={(v) => this.handleChange('bg', 'rgba(255,255,255,1)')}
                  className={'color-preset-item white'}></span>
            <span onClick={(v) => this.handleChange('bg', 'rgba(0,0,0,1)')}
                  className={'color-preset-item black'}></span>
            <span onClick={(v) => this.handleChange('bg', 'rgba(255,255,255,0)')}
                  className={'color-preset-item none'}></span>
        </InspectorControl>)
    }
}

export class InspectorShadow extends InspectorBase {
    
    updateValues = ({type, offsetX, offsetY, blur, spread, color}) =>{
        const {shadowType, shadowColor, shadowOffsetX, shadowOffsetY, shadowBlur, shadowSpread} = this.refs
        shadowType.setValue(type)
        shadowColor.setValue(color)
        shadowOffsetX.setValue(offsetX)
        shadowOffsetY.setValue(offsetY)
        shadowBlur.setValue(blur)
        shadowSpread.setValue(spread)
    }
    
    
    render(){
        return (
            <InspectorControl className={'ins-control_shadow'} label={'阴影'}>
                <div className={'ins-control_wrapper-item'}>
                    <Select onChange={(v) => this.handleChange('type', v)} ref={'shadowType'}
                            options={['outset', 'inset']}/>
                    <ColorInput
                        onPreview={(v) => setColorPreview('shadow', v)}
                        onChange={(v) => this.handleChange('color', v)}
                        ref={'shadowColor'}/></div>
                <div className={'ins-control_wrapper-item'}>
                    <NumberInput onChange={(v) => this.handleChange('offsetX', v)} ref={'shadowOffsetX'}
                                 label={'X'}/>
                    <NumberInput onChange={(v) => this.handleChange('offsetY', v)} ref={'shadowOffsetY'}
                                 label={'Y'}/>
                    <NumberInput onChange={(v) => this.handleChange('blur', v)} ref={'shadowBlur'}
                                 label={'B'}/>
                    <NumberInput onChange={(v) => this.handleChange('spread', v)} ref={'shadowSpread'}
                                 label={'S'}/>
                </div>
            </InspectorControl>
        )
    }
}

export class InspectorCorner extends InspectorBase {
    
    handleChangeImp = (key, value) =>{
        let corner = Object.assign({}, getFirstResponder().properties.corner)
        if (key == 'all') {
            for (let name in corner) {
                corner[name] = value
            }
            const {borderTopLeft, borderTopRight, borderBottomLeft, borderBottomRight} = this.refs
            borderTopLeft.setValue(value)
            borderTopRight.setValue(value)
            borderBottomLeft.setValue(value)
            borderBottomRight.setValue(value)
        } else {
            corner = {[key] : value}
        }
        this.props.onChange('corner', corner)
    }
    
    updateValues = ({topLeft, topRight, bottomLeft, bottomRight}) =>{
        const {borderRadius, borderTopLeft, borderTopRight, borderBottomLeft, borderBottomRight, circleType} = this.refs
        const disableAngle = topLeft.toString().endsWith('%')
        if (disableAngle) {
            circleType.setValue('circle')
        } else {
            circleType.setValue('square')
        }
        
        if (topLeft == topRight && topLeft == bottomLeft && topLeft == bottomRight) {
            borderRadius.setValue(topLeft)
        } else {
            borderRadius.setValue('')
        }
        borderTopLeft.setValue(topLeft)
        borderTopRight.setValue(topRight)
        borderBottomLeft.setValue(bottomLeft)
        borderBottomRight.setValue(bottomRight)
        
        this.setDisableAngle(disableAngle)
        
    }
    
    setDisableAngle = (status) =>{
        const {borderTopLeft, borderTopRight, borderBottomLeft, borderBottomRight} = this.refs
        borderTopLeft.disabled(status)
        borderTopRight.disabled(status)
        borderBottomLeft.disabled(status)
        borderBottomRight.disabled(status)
    }
    
    onShapeTypeChange = (key) =>{
        let isCircle = key == 'circle'
        if (isCircle) {
            this.handleChange('all', '50%')
        } else {
            this.handleChange('all', 0)
        }
        this.setDisableAngle(isCircle)
    }
    
    
    render(){
        return (
            <InspectorControl className={'ins-control_corner'} label={'圆角'}>
                <div className={'control-items'}>
                    <NumberInput onChange={(v) => this.handleChange('all', v)} ref={'borderRadius'}
                                 label={<Icon type={'iconfontdaojiaofangxing2'}/>}/>
                    <ButtonGroup ref={'circleType'} onClick={this.onShapeTypeChange}>
                        <Button key={'circle'} className={'aj-button-circle'}><Icon
                            type={'circle'}/></Button>
                        <Button key={'square'}
                                className={'aj-button-circle'}><Icon
                            type={'iconfontdaojiaofangxing2'}/></Button>
                    </ButtonGroup>
                </div>
                <div className={'control-items circle-side-top'}>
                    <NumberInput onChange={(v) => this.handleChange('topLeft', v)} ref={'borderTopLeft'}
                                 label={<Icon type={'quxian'}/>}/>
                    <NumberInput onChange={(v) => this.handleChange('topRight', v)} ref={'borderTopRight'}
                                 addon={<Icon rotation={90} type={'quxian'}/>}/>
                    <NumberInput onChange={(v) => this.handleChange('bottomLeft', v)} ref={'borderBottomLeft'}
                                 label={<Icon rotation={270} type={'quxian'}/>}/>
                    <NumberInput onChange={(v) => this.handleChange('bottomRight', v)} ref={'borderBottomRight'}
                                 addon={<Icon rotation={180} type={'quxian'}/>}/>
                </div>
            </InspectorControl>
        )
    }
}

export class InspectorTransform extends InspectorBase {
    
    componentDidMount(){
        super.componentDidMount()
        Event.listen(component_drag, this.handleTransform)
    }
    
    
    componentWillUnmount(){
        Event.destroy(component_drag, this.handleTransform)
    }
    
    
    handleTransform = (target) =>{
        this.updateValues(target.properties.transform)
    }
    
    updateValues = (value) =>{
        const {x, y, w, h} = this.refs
        x.setValue(Math.round(value.x))
        y.setValue(Math.round(value.y))
        w.setValue(Math.round(value.width))
        h.setValue(Math.round(value.height))
    }
    
    handlePreview = (k, v) =>{
        let view = getFirstResponder()
        if (!view) return
        let t = Object.assign({}, view.properties.transform)
        console.log(t)
        t[k] = v
        view.setTransform(t.x, t.y, t.width, t.height, t.rotation)
        this.props.onChange(this.props.field, t)
    }
    
    
    render(){
        
        return <InspectorControl defaultExpand={true} className={'ins-control_transform'} label={'位置'}>
            <NumberInput onChange={(v) => this.handleChange('x', v)}
                         ref={'x'} label={'X'}/>
            <NumberInput onChange={(v) => this.handleChange('y', v)}
                         ref={'y'} label={'Y'}/>
            <NumberInput
                onChange={(v) => this.handleChange('width', v)} ref={'w'} label={'W'}/>
            <NumberInput
                onChange={(v) => this.handleChange('height', v)} ref={'h'} label={'H'}/>
        </InspectorControl>
    }
}

export class InspectorFont extends InspectorBase {
    
    updateValues = ({color, size}) =>{
        const {fontSize, fontColor} = this.refs
        fontSize.setValue(size)
        fontColor.setValue(color)
    }
    
    
    render(){
        
        return <InspectorControl display={'flex'} className={'ins-control_font'} label={'字体'}>
            <NumberInput onChange={(value) => this.handleChange('size', value)} ref={'fontSize'}/>
            <ColorInput
                onPreview={(v) => setColorPreview('fontColor', v)}
                onChange={(value) => this.handleChange('color', value)} ref={'fontColor'}/>
        </InspectorControl>
    }
}

export class InspectorAlign extends InspectorBase {
    updateValues = ({x, y}) =>{
        const {fontAlignX, fontAlignY} = this.refs
        fontAlignX.setValue(x)
        fontAlignY.setValue(y)
    }
    
    
    render(){
        return <InspectorControl label={'对齐'}>
            <div className={'control-items'}>
                <ButtonGroup onClick={(value) => this.handleChange('x', value)} ref={'fontAlignX'}>
                    <Button key={'flex-start'}><Icon type={'duiqi2'}/></Button>
                    <Button key={'center'}><Icon type={'duiqi1'}/></Button>
                    <Button key={'flex-end'}><Icon type={'duiqi'}/></Button>
                </ButtonGroup>
            </div>
            <div className={'control-items'}>
                <ButtonGroup onClick={(value) => this.handleChange('y', value)} ref={'fontAlignY'}>
                    <Button key={'flex-start'}><Icon type={'top'}/></Button>
                    <Button key={'center'}><Icon type={'duiqishuiping'}/></Button>
                    <Button key={'flex-end'}><Icon type={'duiqi_xiangshang'}/></Button>
                </ButtonGroup>
            </div>
        </InspectorControl>
    }
}

export class InspectorSpacing extends InspectorBase {
    updateValues = ({width, height}) =>{
        const {lineHeight, letterSpacing} = this.refs
        lineHeight.setValue(height)
        letterSpacing.setValue(width)
    }
    
    
    render(){
        return <InspectorControl className={'ins-control_spacing'} label={'间距'}>
            <div className={'control-items'}>
                <NumberInput onChange={(value) => this.handleChange('height', value)} ref={'lineHeight'}
                             label={<Icon type={'xinggao1'}/>}/>
                <NumberInput onChange={(value) => this.handleChange('width', value)} ref={'letterSpacing'}
                             label={<Icon type={'zijianju'}/>}/>
            </div>
        </InspectorControl>
    }
}

export class InspectorFontStyle extends InspectorBase {
    handleChangeImp = (key, value) =>{
        this.props.onChange(key, value)
    }
    
    updateValues = (fontStyle) =>{
        const {style} = this.refs
        style.setValue(fontStyle)
    }
    
    
    render(){
        return <InspectorControl className={'ins-control_font-style'} label={'样式'}>
            <ButtonGroup onClick={(value) => this.handleChange('fontStyle', value)} ref={'style'}
                         multiple={true}>
                <Button key={'bold'}><Icon type={'cuti'}/></Button>
                <Button key={'italic'}><Icon type={'xieti'}/></Button>
            </ButtonGroup>
        </InspectorControl>
    }
}

export class InspectorFontDecorator extends InspectorBase {
    
    handleChangeImp = (key, value) =>{
        this.props.onChange(key, value)
    }
    
    updateValues = (decorator) =>{
        const {fontDecorator} = this.refs
        fontDecorator.setValue(decorator)
    }
    
    
    render(){
        return <InspectorControl className={'ins-control_font-decorator'} label={'下划线'}>
            <ButtonGroup onClick={(value) => this.handleChange('decorator', value)} ref={'fontDecorator'}>
                <Button key={'underline'}><Icon type={'xiahuaxian'}/></Button>
                <Button key={'line-through'}><Icon type={'shanchuxian'}/></Button>
            </ButtonGroup>
        </InspectorControl>
    }
}

export class InspectorFontContent extends InspectorBase {
    handleChangeImp = (key, value) =>{
        this.props.onChange(key, value)
    }
    
    updateValues = (font) =>{
        const {icon} = this.refs
        const data = getFirstResponder().properties.icon.data
        icon.setValue(data)
    }
    
    handleIconDrop = (data) =>{
        if (data && data.type == 'icon' && data.fontContent) {
            this.handleChange('icon', {data : data.data, content : data.fontContent})
            this.refs.icon.setValue(data.data)
        }
    }
    
    
    render(){
        return <InspectorControl className={'ins-control_font-content'} label={'图标'}>
            <div className={'drop-icons'} ref={'signle'}>
                <div className={'control-items drop-icon'}>
                    <Dropable className={'ins-content_control-input font-content-drop'}
                              onDrop={this.handleIconDrop}><PresetIcon ref={'icon'}/> 拖拽新图标到此
                    </Dropable>
                </div>
            </div>
        </InspectorControl>
    }
}

const DELAY = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 15, 20]
const SPEED = [
    {label : '极快', key : 'faster'}, {label : '快', key : 'fast'}, {label : '慢', key : 'slow'}, {
        label : '极慢',
        key : 'slower'
    }
]
const LOOP = [
    {label : '无限', key : 'infinite'}, {label : '一次', key : 1}, {label : '二次', key : 2}, {
        label : '三次',
        key : 3
    }, {key : 0, label : '无'}
]

export class InspectorAnimation extends InspectorBase {
    updateValues({n, d, s, l}){
        let {name, delay, speed, loop} = this.refs
        console.log()
        name.setValue(n)
        delay.setValue(d)
        speed.setValue(s)
        loop.setValue(l)
    }
    
    
    render(){
        return <InspectorControl label={'动画'} className={'ins-control_animation'}>
            <div className={'ins-animation_preview'}>
                <span className={'ins-animation_preview-target'}></span>
            </div>
            <div className={'ins-content_control-item'}>
                <div className={'ins-content_control-label'}>效果</div>
                <Select ref={'name'} onChange={(v) => this.handleChange('n', v)} className={'ins-content_control-input'}
                        options={ANIMATIONS}/>
            </div>
            <div className={'ins-content_control-item'}>
                <div className={'ins-content_control-label'}>延时</div>
                <Select ref={'delay'} onChange={v => this.handleChange('d', v)} className={'ins-content_control-input'}
                        options={DELAY}/>
            </div>
            <div className={'ins-content_control-item'}>
                <div className={'ins-content_control-label'}>速度</div>
                <Select ref={'speed'} onChange={v => this.handleChange('s', v)} className={'ins-content_control-input'}
                        options={SPEED}/>
            </div>
            <div className={'ins-content_control-item'}>
                <div className={'ins-content_control-label'}>循环</div>
                <Select ref={'loop'} onChange={v => this.handleChange('l', v)} className={'ins-content_control-input'}
                        options={LOOP}/>
            </div>
        
        </InspectorControl>
    }
}

const animations = ANIMATIONS
const EVENTS = [
    {
        label : '单击',
        key : 'click'
    }, {
        label : '双击',
        key : 'dbclick'
    }, {
        label : '鼠标划入',
        key : 'enter'
    }, {
        label : '鼠标离开',
        key : 'leave'
    }
]
const MouseMap = {
    click : '单击',
    dbclick : '双击',
    enter : '鼠标滑入',
    leave : '鼠标滑出'
}
const EventsMap = {
    play : '播放动画',
    hide : '隐藏',
    show : '显示',
    toggle : '显示/隐藏',
    jump : '跳转页面'
}
let COMPONENTS = [
    {
        label : EventsMap.toggle,
        key : 'toggle'
    }, {
        label : EventsMap.show,
        key : 'show'
    }, {
        label : EventsMap.hide,
        key : 'hide'
    }, {
        label : EventsMap.play,
        key : 'play',
        params : 'none'
    }
]
let PAGES = [
    {
        label : '跳转页面',
        key : 'jump',
    }
]

export class InspectorInteraction extends InspectorBase {
    state = {
        list : [],
        type : 'c',
        current : {
            e : '',
            t : [],
            o : '',
            a : ''
        },
        selectedIndex : -1
    }
    
    
    updateValues(list){
        this.setState({list, current : {e : '', t : [], o : '', a : '',}, selectedIndex : -1, type : 'c'})
    }
    
    
    handleDrop = (id) =>{
        if (id.startsWith('page')) {
            // page
            let current = jQuery.extend(true, {}, this.state.current)
            let page = getPageDataWithId(id)
            current.t = [{id, alias : page.alias}]
            current.o = 'jump'
            current.a = ''
            console.log(current)
            this.setState({current, type : 'p'})
        } else {
            //view
            let alias = window.allWidgets[id].alias
            let current = Object.assign({}, this.state.current)
            if (this.state.type == 'p') {
                current.t = [{id, alias}]
            } else {
                let t = this.state.current.t.slice()
                let index = t.findIndex((item => item.id == id))
                if (index > -1) {
                    return
                }
                t.push({id, alias})
                current.t = t
            }
            current.o = ''
            current.a = ''
            this.setState({type : 'c', current})
        }
    }
    
    save = () =>{
        let current = jQuery.extend(true, {}, this.state.current)
        if (!current.e || current.t.length == 0 || !current.o || (current.o == 'play' && !current.a)) {
            // TODO Message box
            return
        }
        let list = this.state.list.slice(0)
        if (this.state.selectedIndex > -1) { // update
            list[this.state.selectedIndex] = current
        } else { //add
            current.id = Date.now()
            list.push(current)
        }
        this.setState({list, current : {e : '', a : '', o : '', t : []}, selectedIndex : -1})
        this.props.onChange(this.props.field, list)
    }
    
    update = (index) =>{
        let current = jQuery.extend(true, {}, this.state.list[index])
        this.setState({selectedIndex : index, current, type : current.o == 'jump' ? 'p' : 'c'})
    }
    
    handleDeleteDropItem = (index) =>{
        let current = jQuery.extend(true, {}, this.state.current)
        current.t.splice(index, 1)
        this.setState({current})
    }
    
    onChange = (key, value) =>{
        let current = Object.assign({}, this.state.current)
        current[key] = value
        this.setState({current})
    }
    
    getEventName = (item) =>{
        let alias = '【EMPTY】'
        if (item.o == 'jump') {
            let page = getPageDataWithId(item.t[0].id)
            if (page) alias = page.alias
        } else {
            let view = window.allWidgets[item.t[0].id]
            if (view) alias = view.alias
        }
        return MouseMap[item.e] + ' - ' + EventsMap[item.o] + `【${alias}】`
    }
    
    delIndex = (index) =>{
        let list = this.state.list.slice()
        list.splice(index, 1)
        this.props.onChange(this.props.field, list)
    }
    
    
    render(){
        let options = this.state.type == 'p' ? PAGES : COMPONENTS
        return <InspectorControl label={'交互'} className={'ins-control_interactions'}>
            {this.state.list.length > 0 && <div className={'ins-control_interactions-list'}>
                {
                    this.state.list.map((item, index) =>{
                        return <div className={'interactions-list_item'} key={item.id}>
                            <div className={'interactions-list_item-name'}>
                                {this.getEventName(item)}</div>
                            <Icon onClick={() => this.update(index)} type={'edit'}/> <Icon
                            onClick={() => this.delIndex(index)}
                            type={'delete'}/></div>
                    })
                }
            
            </div>}
            <div className={'ins-content_control-item'}>
                <div className={'ins-content_control-label'}>事件</div>
                <Select onChange={(v) => this.onChange('e', v)} value={this.state.current.e} options={EVENTS}
                        className={'ins-content_control-input'}></Select>
            </div>
            <div className={'ins-content_control-item'}>
                <div className={'ins-content_control-label'}>目标</div>
                <Dropable onDrop={this.handleDrop} namespace={'nodedrag'} className={'ins-content_control-input'}>
                    {
                        this.state.current.t.map((item, index) =>{
                            return <div className={'ins-content_drop-item'} key={item.id}>{item.alias} <Icon
                                onClick={() => this.handleDeleteDropItem(index)}
                                type={'delete'}/>
                            </div>
                        })
                    }
                    {this.state.current.t.length == 0 && <div className={'desc'}>拖拽图层或页面到此处</div>}
                </Dropable>
            </div>
            <div className={'ins-content_control-item'}>
                <div className={'ins-content_control-label'}>操作</div>
                <Select onChange={(v) => this.onChange('o', v)} value={this.state.current.o} options={options}
                        className={'ins-content_control-input'}></Select>
            </div>
            
            {
                this.state.current.o == 'play' && (
                    <div className={'ins-content_control-item'}>
                        <div className={'ins-content_control-label'}>动画</div>
                        <Select value={this.state.current.a} onChange={(v) => this.onChange('a', v)}
                                options={ANIMATIONS}
                                className={'ins-content_control-input'}></Select>
                    </div>
                )
            }
            
            <div className={'ins-content_control-item'}>
                <Button onClick={this.save} type={'primary'} className={'ins-content_control-input'}>{
                    this.state.selectedIndex == -1 ? '添加' : '保存'
                }</Button>
            </div>
        </InspectorControl>
    }
}

