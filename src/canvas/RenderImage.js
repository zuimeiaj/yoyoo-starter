/**
 *  created by yaojun on 2019/1/31
 *
 */

import React from "react";
import BaseCanvas from "../lib/Base/BaseCanvas";



export default class RenderImage extends React.Component {
    componentDidMount(){
        new BaseCanvas(this.refs.g)
    }
    static  render(data,width,height){
    }
    render(){
        return (<canvas ref={'g'}></canvas>)
    }
}