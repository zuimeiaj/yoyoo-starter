/**
 *  created by yaojun on 2019/1/14
 *
 */

import React from "react";
import PropTypes from 'prop-types'



export default class ToggleColor extends React.Component {
    static propTypes = {
        selected : PropTypes.string.isRequired,
        unselected : PropTypes.string.isRequired,
        onChange : PropTypes.func,
        children : PropTypes.any
    }
    
    state = {
        clicked : false
    }
    
    setValue = (clicked = false) =>{
        this.setState({clicked})
        this.props.onChange(clicked)
    }
    
    handleClick = (e) =>{
        e && e.stopPropagation()
        let clicked = !this.state.clicked
        this.setState({clicked})
        this.props.onChange(clicked)
    }
    
    
    render(){
        let {selected, unselected, children} = this.props
        return (<span onClick={this.handleClick}
                      style={{color : this.state.clicked ? selected : unselected}}>{children}</span>)
    }
}