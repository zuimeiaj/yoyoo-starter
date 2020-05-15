import React from 'react'
import PropTypes from 'prop-types'
import './iconfont.css'



export default class Icon extends React.Component {
    static propTypes = {
        type : PropTypes.string,
        onClick : PropTypes.func,
        rotation : PropTypes.number,
        className : PropTypes.string,
        style : PropTypes.object
    }
    
    
    render(){
        const {type, onClick, rotation = 0, className = '', style = {}} = this.props
        return <i style={{transform : `rotate(${rotation}deg)`, ...style}} onClick={onClick}
                  className={`iconfont icon-${type} ${className}`}/>
    }
}