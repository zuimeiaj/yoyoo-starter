import {c} from "@/api/hash";
import {k, k2} from "@/api/key";



export const digest = (object) =>{
    let md5 = c('md5')
    let before = Object.keys(object).map(item =>{
        let str = object[item]
        return item + (typeof str != 'string' ? JSON.stringify(str) : str)
    }).join('')
    md5.update(k + before + k2)
    return md5.digest('hex')
}