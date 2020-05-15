import {Http} from "./config";
import {deflate, infalte} from "./zip";



/**
 * 创建页面
 * @param send
 * @return {AxiosPromise<any>}
 */
export const createPage = (send) =>{
    if (!send.parentid) send.parentid = null
    send = zipNodes(send)
    return Http.post('page/create', send)
}

/**
 * 保存页面
 * @param id
 * @return {AxiosPromise<any>}
 */
export const deletePage = (id) =>{
    return Http.post('page/delete', {id})
}

/**
 * 保存页面组件数据
 * @param send
 * @return {AxiosPromise<any>}
 */
export const savePage = (send) =>{
    if (!send.parentid) send.parentid = null
    send = zipNodes(send)
    return Http.post('page/save', send)
}


function zipNodes(send){
    send = Object.assign({}, send)
    send.nodes = deflate(send.nodes)
    send.size = Buffer.byteLength(send.nodes)
    return send
}


/**
 * 保存页面配置信息,guides ,bg ,height ，alias
 */
export const updatePage = () =>{

}

export const findPageDetail = (pageid) =>{
    return Http.post('page/detail', {id : pageid}).then((res) =>{
        res.data.nodes = infalte(res.data.nodes)
        return res
    })
}