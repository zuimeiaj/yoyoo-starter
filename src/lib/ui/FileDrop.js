/**
 *  created by yaojun on 2019/1/30
 *
 */

import React from "react";
import Types from 'prop-types'



export default class FileDrop extends React.Component {
    static propTypes = {
        children : Types.any,
        className : Types.string,
        style : Types.object,
        onChange : Types.func,
        onComplete : Types.func,
        
    }
    
    dropHandler = (ev) =>{
        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();
        ev.stopPropagation()
        let files = []
        if (ev.dataTransfer.items) {
            
            // Use DataTransferItemList interface to access the file(s)
            for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                // If dropped items aren't files, reject them
                if (ev.dataTransfer.items[i].kind === 'file') {
                    let file = ev.dataTransfer.items[i].getAsFile()
                    files.push(file)
                }
            }
        } else {
            files = ev.dataTransfer.files
        }
        
        files = this.filterFiles(files)
        if (files.length === 0) return
        this.props.onChange(files)
    }
    
    filterFiles = (files) =>{
        let png = /(png|jpe?g)$/
        return files.filter(item =>{
            let isPng = png.test(item.name)
            let matchSize = (item.size / 1024 < 1024)
            return isPng && matchSize
        })
    }
    
    
    dragOverHandler(ev){
        ev.stopPropagation()
        ev.preventDefault();
    }
    
    
    render(){
        const {className, style, children} = this.props
        return (<div className={className}
                     style={style}
                     onDragOver={this.dragOverHandler}
                     onDrop={this.dropHandler}>{children}</div>)
    }
}