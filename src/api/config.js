import axios from 'axios'
import {message, Modal} from 'antd'
import JSCookies from 'js-cookie'
import {BASE_OSS} from "@config";



export const API_BASE_URL = '/api/v1/'
const AUTH_KEY = 'Authenticated'
export const getAuthenticated = () =>{
    return JSCookies.get(AUTH_KEY)
}
export const setAuthenticated = (empty) =>{
    if (empty === null) {
        JSCookies.remove(AUTH_KEY)
    } else {
        JSCookies.set(AUTH_KEY, 'HAS_AUTHED', {expires : 1 / 12})
    }
}
export const getOSSUrl = (uri) => `${BASE_OSS}${uri}`
export const getBaseUrl = (uri) => `${API_BASE_URL}${uri}`
axios.defaults.headers['Content-Type'] = 'application/json;charset=utf8'
axios.defaults.baseURL = API_BASE_URL

let exitModal = null
axios.interceptors.response.use((result) =>{
    let data = result.data
    let authed = getAuthenticated()
    if (authed) {
        setAuthenticated()// 延长授权时间
    }
    return data
}, (e) =>{
    if (e.response.status == 401) {
        let callback = encodeURIComponent(location.pathname + location.search)
        window.TokenExpired = true
        if (!exitModal) exitModal = Modal.info()
        exitModal.update({
            title : '提示',
            content : '由于您长时间没有操作，为了确保数据安全。系统已自动退出登录',
            onOk : () =>{
                location.replace('/signin?callback=' + callback)
            }
        })
    } else {
        message.warn(e.response.data.errmsg)
    }
    throw  e
})

export const Http = axios