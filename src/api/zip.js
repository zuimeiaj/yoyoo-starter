import pako from 'pako'

const ENCODE = 'base64'

/**
 *
 * @param {String} base64 - base64字符串
 * @return {*}
 */
export const infalte = (base64) => {
  return JSON.parse(base64)
}

/**
 *
 * @param {String|Array|Object} object - 要压缩的对象
 * @return {string} -
 */
export const deflate = (object) => {
  return typeof object === 'string' ? object : JSON.stringify(object)
}
