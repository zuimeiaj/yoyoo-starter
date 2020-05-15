/**
 *  created by yaojun on 2019/6/5
 *
 */
import React from "react";
import ViewText from "@/lib/Widget/ViewText";

export default class Comment extends ViewText{
    constructor(){
        super()
    }
    
    getContextMenu(){
        let menus = super.getContextMenu()
        return menus.slice(3)
    }
}