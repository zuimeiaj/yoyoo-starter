/**
 *  created by yaojun on 2018/12/1
 *
 */
import React from "react";
import Draggable from "../Draggable";
import PropTypes from 'prop-types'
import Event from "../Base/Event";
import {context_hide_color_picker, selection_change, selection_start} from "../util/actions";
import {getScreeTransform} from "../global";
import './Selection.scss'

export default class Selection extends React.Component{
    static propTypes = {
        containerId : PropTypes.string.isRequired
    }
    
    componentDidMount(){
        this.rect = {} // x,y,width,height
        this.show(false)
        let containerId = this.props.containerId
        let container = document.querySelector(`#${containerId}`)
        new Draggable(container, {
            onDragStart : ({pointX, pointY})=>{
                this.x = 0
                this.y = 0
                this.pointX = pointX
                this.pointY = pointY
                this.show(true)
                this.setTransform(pointX, pointY, 0, 0)
                Event.dispatch(selection_start)
            },
            onDragMove : ({realDeltaX, realDeltaY, mouseX, mouseY})=>{
                this.x += realDeltaX
                this.y += realDeltaY
                let x = this.pointX
                let y = this.pointY
                if(this.x < 0) {
                    x += this.x
                }
                if(this.y < 0) {
                    y += this.y
                }
                this.setTransform(x, y, Math.abs(this.x), Math.abs(this.y))
            },
            onDragEnd : ()=>{
                Event.dispatch(context_hide_color_picker)
                //  需要根据当前缩放来选择
                let s = getScreeTransform().scale
                Event.dispatch(selection_change, {
                    x : this.rect.x / s,
                    y : this.rect.y / s,
                    width : this.rect.width / s,
                    height : this.rect.height / s
                })
                this.show(false)
            }
        })
    }
    
    show = (visible)=>{
        this.refs.selection.style.display = visible ? 'block' : 'none'
    }
    setTransform = (x, y, width, height)=>{
        let style = this.refs.selection.style
        this.rect = {
            x, y, width, height
        }
        style.top = y + 'px'
        style.left = x + 'px'
        style.width = width + 'px'
        style.height = height + 'px'
    }
    
    render(){
        return <div ref={'selection'}
                    className={'aj-selection-rect'}
        ></div>
    }
}
