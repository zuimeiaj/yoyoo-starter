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
        // 自定义 SVG 图标：type 以 "svg:" 开头时渲染内联 svg（iconfont 无此字形时的补充方案，
        // 如表格图标；内容为 svg 内部 HTML，来源是组件库常量非用户输入）
        if (type && type.indexOf('svg:') === 0) {
            return <svg style={{transform : `rotate(${rotation}deg)`, width : '1em', height : '1em', ...style}} onClick={onClick}
                        className={`iconfont ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        dangerouslySetInnerHTML={{__html : type.slice(4)}}/>
        }
        return <i style={{transform : `rotate(${rotation}deg)`, ...style}} onClick={onClick}
                  className={`iconfont icon-${type} ${className}`}/>
    }
}
