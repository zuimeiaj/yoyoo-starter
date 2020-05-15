import pako from 'pako'



const ENCODE = 'base64'

/**
 *
 * @param {String} base64 - base64字符串
 * @return {*}
 */
export const infalte = (base64) =>{
    let array = new Buffer(base64, ENCODE)
    let str = pako.inflate(array, {to : 'string'})
    if (str[0] == '{' && str[str.length - 1] == '}' || str[0] == '[' && str[str.length - 1] == ']') {
        return JSON.parse(str)
    }
    return str
}

/**
 *
 * @param {String|Array|Object} object - 要压缩的对象
 * @return {string} -
 */
export const deflate = (object) =>{
    if (typeof object !== 'string') {
        object = JSON.stringify(object)
    }
    let array = pako.deflate(object, {to : "binary"})
    let code = new Buffer(array).toString(ENCODE)
    return code
}

