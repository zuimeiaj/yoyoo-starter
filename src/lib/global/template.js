import {getFirstResponder} from "./instance";
import CanvasRender from "../../canvas";
import {getClientBoundingRect, uuid} from "../util/helper";
import {toJSON} from "../properties/types";
import Event from "../Base/Event";
import {workspace_save_template_success} from "../util/actions";
import GroupProperties from "../properties/group";
import {createMaterial} from "../../api/material";
import {message} from 'antd'
import {proxyTransformOffset} from "@/lib/util/controllers";

const CACHE_KEY = 'self_template'
var globalTempalteData = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')

export function getSelfTemplateData(){
    return globalTempalteData
}

export function updateSelfTemplateAlias(index, value){
    let data = Object.assign({}, globalTempalteData[index])
    data.alias = value
    globalTempalteData[index] = data
    localStorage.setItem(CACHE_KEY, JSON.stringify(globalTempalteData))
    return globalTempalteData
}

export function updateSelfTemplateData(data){
    globalTempalteData = data
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

function makeGroup(data){
    let group = new GroupProperties()
    group = toJSON(group)
    group.items = data.view.getItems().map(item=>{
        item = toJSON(item)
        let dx = item.transform.x - data.transform.x,
            dy = item.transform.y - data.transform.y;
        dx -= item.transform.x
        dy -= item.transform.y
        proxyTransformOffset(item, dx, dy)
        return item
    })
    group.transform = Object.assign({}, data.transform)
    group.border.color = 'rgba(255,255,255,1)'
    return group
}

// render page
export function getPageTransform(data){
    let x1 = [], x2 = [], y1 = [], y2 = []
    for(let i = 0, j = data.length; i < j; i += 1) {
        let t = getClientBoundingRect(data[i].transform)
        x1.push(t.x)
        x2.push(t.x + t.width)
        y1.push(t.y)
        y2.push(t.y + t.height)
    }
    let x = Math.min.apply(null, x1);
    let y = Math.min.apply(null, y1);
    let x3 = Math.max.apply(null, x2)
    let y3 = Math.max.apply(null, y2)
    let transform = {
        x : x,
        y : y,
        width : x3 - x,
        height : y3 - y,
        rotation : 0
    }
    data = data.map(item=>{
        item = Object.assign({}, item)
        item.transform = Object.assign({}, item.transform)
        item.transform.x -= transform.x
        item.transform.y -= transform.y
        return item
    })
    let page = new GroupProperties()
    page = toJSON(page)
    transform.x = 0
    transform.y = 0
    page.transform = transform
    page.items = data
    return page
}

export async function setSelfTemplateData(type = 'TEMPLATE'){
    let data = getFirstResponder().properties
    let template = getSelfTemplateData()
    let item = {}
    let source
    if(data.type !== 'group') {
        // 默认使用rect 包裹
        let child = data
        let t = Object.assign({}, child.transform)
        data = new GroupProperties()
        let rect = getClientBoundingRect(child.transform)
        data.transform.width = rect.width
        data.transform.height = rect.height
        source = toJSON(data)
        item.page = Object.assign({}, data.transform)
        child = toJSON(child)
        let dx = data.transform.width / 2 - t.width / 2,
            dy = data.transform.height / 2 - t.height / 2
        dx -= child.transform.x
        dy -= child.transform.y
        proxyTransformOffset(child, dx, dy)
        source.items = [child]
    } else {
        if(data.isTemporaryGroup) {
            source = makeGroup(data)
        } else {
            source = data
        }
        item.page = getClientBoundingRect(source.transform)
    }
    item.page.isSingleObject = true
    source.transform.x = 0
    source.transform.y = 0
    let canvas = new CanvasRender()
    await canvas.renderCanvas(source, item.page)
    item.image = canvas.toImage(0.5)
    canvas.destroy()
    item.data = source
    item.id = uuid('ad_')
    item.type = 'AdvanceComponent'
    item.elementType = type
    item.alias = data.alias
    let send = Object.assign({}, item)
    // save to remove server
    let result = await createMaterial({
        name : item.alias,
        content : send,
        type : type
    })
    send.image = item.image
    send._id = result.data._id
    send.name = result.data.name
    send.length = result.data.length
    Event.dispatch(workspace_save_template_success, {type : type, data : send})
    message.success('已添成功')
    return result
}

window._selfTemplateData = globalTempalteData