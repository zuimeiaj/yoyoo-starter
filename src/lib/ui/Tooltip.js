import React from 'react'
import RectDOM from 'react-dom'
import './Tooltip.scss'
import Types from 'prop-types'

const TooltipNode = document.querySelector('#aj-tooltip')



class TooltipWrapper extends React.Component {
    render(){
        const {left, top, title, d,className=''} = this.props
        return <div className={`aj-tooltip-wrapper ${d}`} style={{left, top}}>{title}</div>
    }
}

export class Tooltip extends React.Component {
    static propTypes={
        className:Types.string,
        placement:Types.string,
        title:Types.string
    }
    handleMouseEnter = (e) =>{
        let rect = e.currentTarget.getBoundingClientRect()
        let d = this.props.placement || 'bottom',
            x = e.pageX, y = e.pageY, offset = 10 ;
        
        if (d == 'bottom') {
            y = rect.top + rect.height + offset
            x = rect.left + rect.width/2
        } else if (d == 'right') {
            x = rect.left + rect.width + offset
        }
        RectDOM.render(<TooltipWrapper className={this.props.className} d={d} left={x} top={y} title={this.props.title}/>, TooltipNode)
    }
    
    handleMouseLeave = () =>{
        RectDOM.unmountComponentAtNode(TooltipNode)
    }
    
    
    render(){
        let {children,className} = this.props
        return <span className={className} onMouseLeave={this.handleMouseLeave} onMouseEnter={this.handleMouseEnter}>{children}</span>
    }
}