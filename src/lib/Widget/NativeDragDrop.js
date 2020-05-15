/**
 *  created by yaojun on 2018/12/1
 *
 */
import React from "react";



export default class Draggable extends React.Component {
    
    handleDragStart = (e) =>{
        e.dataTransfer.setData("dragdata", JSON.stringify(this.props.params));
    }
    
    
    render(){
        const children = this.props.children;
        return (
            <div onDragStart={this.handleDragStart}
                 className={styles.draggable}
                 draggable={true}>
                {children}
            </div>);
    }
}

export class Dropable extends React.Component {
    handleDrop = (e) =>{
        e.preventDefault();
        let data = e.dataTransfer.getData("dragdata");
        if (data) data = JSON.parse(data);
        this.props.onDrop(data);
    };
    
    allowDrop = (e) =>{
        e.preventDefault();
    };
    
    
    render(){
        return (
            <div className={'html5-dropable'} onDragOver={this.allowDrop} onDrop={this.handleDrop}>
                {this.props.children}
            </div>);
    }
}