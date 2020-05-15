import React from "react";
import Types from 'prop-types'
import './NativeDragDrop.scss'
import jquery from 'jquery'
import {isPlainObject} from "@/lib/util/helper";

export class Draggable extends React.PureComponent{
    static propTypes = {
        children : Types.any,
        params : Types.any,
        namespace : Types.string
    }
    static defaultProps = {
        namespace : 'dragdata'
    }
    handleDragStart = (e)=>{
        let p = this.props.params
        e.dataTransfer.setData(this.props.namespace,
            isPlainObject(p) ? JSON.stringify(p) : p);
    }
    
    render(){
        const children = this.props.children;
        return (
            <div onDragStart={this.handleDragStart}
                 className={'aj-component-draggable'}
                 draggable={true}>
                {children}
            </div>);
    }
}

export class Dropable extends React.PureComponent{
    static propTypes = {
        onDrop : Types.func,
        children : Types.any,
        className : Types.string,
        domRef : Types.func,
        namespace : Types.string,
        customEvent : Types.bool
    }
    static defaultProps = {
        namespace : 'dragdata',
        customEvent : false
    }
    
    componentDidMount(){
        this.props.domRef && this.props.domRef(this.refs.g)
    }
    
    handleDrop = (e)=>{
        if(!this.props.customEvent) {
            e.preventDefault();
            e.stopPropagation()
        }
        let data = e.dataTransfer.getData(this.props.namespace);
        if(data && data[0] == '{' && data[data.length - 1] == '}') data = JSON.parse(data);
        data && this.props.onDrop(data, e);
        jquery(this.refs.g).removeClass('enter')
    };
    allowDrop = (e)=>{
        e.preventDefault();
        e.stopPropagation()
    };
    onEnter = ()=>{
        jquery(this.refs.g).addClass('enter')
    }
    onLeave = ()=>{
        jquery(this.refs.g).removeClass('enter')
    }
    
    render(){
        const {className = ''} = this.props
        return (
            <div ref={'g'}
                 onDragEnter={this.onEnter}
                 onDragLeave={this.onLeave}
                 className={`aj-component-dropable ${className}`} onDragOver={this.allowDrop}
                 onDrop={this.handleDrop}>
                {this.props.children}
            </div>);
    }
}