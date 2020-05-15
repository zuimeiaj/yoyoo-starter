import {infalteContent} from "@/api/material";
import {Http} from "@/api/config";

let MasterStore = {}
let MasterCache = null
window.MasterStore = MasterStore
export const fetchMaster = (send)=>{
    if(MasterCache) return Promise.resolve(MasterCache)
    return Http.post('project/master', send).then(infalteContent).then(async res=>{
        let docs = res.data.docs
        for(let i = 0; i < docs.length; i += 1) {
            let item = docs[i]
            MasterStore[item._id] = item
            let image = new Image()
            image.src = item.content.image
            item.content.Image = image
        }
        MasterCache = res
        return res
    })
}
export const getMasterFromStore = (id)=>{
    return MasterStore[id]
}
export const setMasterNodes = (id, nodes)=>{
    MasterStore[id].content.data.items = nodes
}
export const getMasterSnapshootFromStore = (id)=>{
    return MasterStore[id].content.Image
}
export const setMasterToStore = (data)=>{
    if(typeof  data === 'string') {
        delete MasterStore[data]
        let index = MasterCache.data.docs.findIndex(item=>item._id === data)
        MasterCache.data.docs.splice(index, 1)
    } else {
        MasterStore[data._id] = data
        if(MasterCache) {
            let docs = MasterCache.data.docs;
            if(docs.findIndex(item=>item._id == data._id) == -1){
                docs.push(data)
            }
        }
    }
}