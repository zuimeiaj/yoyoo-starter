/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from "react";
import Clipboard from 'react-clipboard.js'
import {getQuery} from "../lib/util/helper";
import {message} from 'antd'
import {PREVIEW_URL} from "@config";
import IconText from "@/lib/ui/IconText";

export default class HeaderShare extends React.Component{
    render(){
        let item = getQuery().p
        return (
            <Clipboard component={'div'} onSuccess={()=>message.success('链接已复制，快去分享给你的朋友吧')}
                       data-clipboard-text={`${PREVIEW_URL}?p=${item}`}>
                <span><IconText className={'header_action-item'} icon={'fenxiang'}>分享</IconText></span>
            </Clipboard>
        )
    }
}