import {Http} from "./config";
import {deflate, infalte} from "./zip";
import {getQuery, isArray} from "@/lib/util/helper";
import {setMasterToStore} from "@/api/master";
import {getPageTransform} from "@/lib/global/template";
import CanvasRender from "@/canvas";

export const fetchAssets = (send = {})=>{
    return Http.post('material/list', {type : 'ASSET', ...send})
}
export const fetchTemplate = (send = {})=>{
    return Http.post('material/list', {type : 'TEMPLATE', ...send}).then(infalteContent)
}

export function infalteContent(res){
    let docs = res.data.docs ? res.data.docs : res.data
    res.data.docs = docs.map(item=>{
        item.base64 = item.content
        item.content = infalte(item.content)
        return item
    })
    return res
}

export const updateMaterialName = (id, name)=>{
    return Http.post('material/name', {id, name})
}
const optMaterial = (send, uri)=>{
    let content = send.content
    return Http.post(uri, zipContent(send)).then(async(res)=>{
        if(send.type == 'MASTER') {
            send.base64 = send.content
            send.content = content
            send._id =  (res.data && res.data._id) || send._id
            content.Image = new Image()
            content.Image.src = content.image
            setMasterToStore(send)
        }
        return res
    })
}
export const createMaterial = (send)=>{
    return optMaterial(send, 'material/create')
}
export const saveMaster = async(send)=>{
    let id = getQuery().m
    let group = getPageTransform(send.nodes)
    let page = Object.assign({}, group.transform)
    page.isSingleObject = true
    let canvas = new CanvasRender
    await canvas.renderCanvas(group, page)
    let image = canvas.toImage(1, 'png')
    return optMaterial({
        _id : id,
        type :'MASTER',
        content : {
            type : 'AdvanceComponent',
            elementType : 'MASTER',
            data : group,
            page,
            image
        }
    }, 'project/saveMaster')
}

function zipContent(send){
    if(send.type != 'ASSET') {
        send = Object.assign({}, send)
        send.content = deflate(send.content)
        send.size = Buffer.byteLength(send.content)
    }
    return send
}

export const deleteMaterial = (id, url)=>{
    return Http.post('material/delete', {id, url})
}
export const deleteTemplate = (id)=>{
    if(isArray(id)) id = id.join(',')
    return Http.post('material/deleteTemplate', {id})
}