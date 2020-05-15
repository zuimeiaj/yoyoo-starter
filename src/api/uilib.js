import {Http} from "@/api/config";
import {isArray} from "@/lib/util/helper";
import jQuery from 'jquery'
import {BASE_OSS} from '@config'


export const publishToUILibrary = (send) =>{
    return Http.post('uilib/publish', send)
}
export const renameLib = (id, name) =>{
    return Http.post('uilib/rename', {id, name})
}
export const deleteLib = (id) =>{
    if (isArray(id)) id = id.join(',')
    return Http.post('uilib/delete', {id})
}
export const findAllLib = (send) =>{
    return Http.post('uilib/list', send)
}
export const findAllLibAndConetnt = (send) =>{
    return  fetch(BASE_OSS+'template/template.json')
}
export const findDetailLib = (id) =>{
    return Http.post('uilib/detail', {id})
}