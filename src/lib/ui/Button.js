/**
 *  created by yaojun on 2018/12/22
 *
 */

import React from "react";
import PropTypes from 'prop-types'
import './Button.scss'
import Icon from "../Icon";



export default class Button extends React.Component {
    static propTypes = {
        children : PropTypes.any,
        icon : PropTypes.any,
        type : PropTypes.oneOf(['primary', 'default', 'hollow','danger']),
        className : PropTypes.string,
        style : PropTypes.object,
        checked : PropTypes.bool,
        onClick : PropTypes.func,
        block : PropTypes.bool
    }
    
    static defaultProps = {
        type : 'default',
        icon : null,
        children : null,
        className : '',
        style : {},
        checked : false,
        block : false,
        onClick : () =>{}
    }
    
    
    render(){
        let {children, icon, type, className, style, checked, onClick, block} = this.props
        return (
            <button onClick={onClick} style={style}
                    className={`${block ? 'block' : ''} aj-button aj-button__${type} ${className} ${checked ? 'checked' : ''}`}>
                {icon && <Icon type={icon}/>}
                {children}
            </button>)
    }
}

export class ButtonGroup extends React.Component {
    
    state = {
        checked : null // [] or string
    }
    
    static propTypes = {
        children : PropTypes.array,
        onClick : PropTypes.func,
        type : PropTypes.oneOf(['primary', 'default', 'hollow']),
        multiple : PropTypes.bool,
        defaultChecked : PropTypes.any
    }
    
    static defaultProps = {
        onClick : () =>{},
        children : [],
        type : 'default',
        multiple : false
    }
    
    
    componentWillMount(){
        this.state.checked = this.props.defaultChecked ? this.props.defaultChecked : (this.props.multiple ? [] : null)
    }
    
    
    // Update checked keys
    setValue = (value) =>{
        this.setState({checked : value})
    }
    
    bindItemClick = (key) =>{
        return (e) =>{
            e.stopPropagation()
            
            if (this.props.multiple) {
                let checked = this.state.checked.slice(0)
                let index = checked.indexOf(key)
                if (index > -1) checked.splice(index, 1)
                else checked.push(key)
                this.setState({checked})
                this.props.onClick(checked)
            } else {
                let checked = key == this.state.checked ? '' : key
                this.setState({checked})
                this.props.onClick(checked)
            }
            
        }
    }
    
    
    render(){
        let {children} = this.props
        children = React.Children.map(children, (button) =>{
            let props = Object.assign({}, button)
            props.type = this.props.type
            props.checked = this.props.multiple ? this.state.checked.indexOf(button.key) > -1 : this.state.checked === button.key
            props.onClick = this.bindItemClick(button.key)
            return React.cloneElement(button, props)
        })
        return <div className={'aj-button-group'}>{children}</div>
    }
}
