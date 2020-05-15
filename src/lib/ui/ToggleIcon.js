/**
 *  created by yaojun on 2019/1/14
 *
 */

import React from "react";
import PropTypes from 'prop-types'
import Icon from "../Icon";



export default class ToggleIcon extends React.Component {
    static propTypes = {
        selected : PropTypes.string.isRequired,
        unselected : PropTypes.string.isRequired,
        onChange : PropTypes.func,
    }
    
    state = {
        clicked : false
    }
    
    setValue = (clicked = false) =>{
        this.setState({clicked})
    }
    
    handleClick = (e) =>{
        e && e.stopPropagation()
        let clicked = !this.state.clicked
        this.setState({clicked})
        this.props.onChange(clicked)
    }
    
    
    render(){
        let {selected, unselected, children} = this.props
        return (<Icon onClick={this.handleClick}
                      type={this.state.clicked ? selected : unselected}/>)
    }
}