/**
 * 登录
 */
import {Http, setAuthenticated} from "./config";
import {clearPageStorage} from "../lib/util/page";

// 15分钟检测一次用户是否登录
let expireTime = 1000 * 60 * 15
let lastTestTime = 0
export const signin = (send) =>{
    return Http.post('user/login', send).then((res) =>{
        setAuthenticated()
        return res
    })
}
/**
 * 注册
 */
export const signup = (send) =>{
    return Http.post('user/register', send).then((res) =>{
        setAuthenticated()
        return res
    })
}

export const updateUserInfo = (send) =>{
    return Http.post('user/update', send)
}
/**
 * 退出登录
 * @return {AxiosPromise<any>}
 */
export const logout = () =>{
    return Http.post('user/logout').then((res) =>{
        setAuthenticated(null)
        clearPageStorage()
        return res
    })
}

/**
 * 发送验证码
 * @return {AxiosPromise<any>}
 */
export const sendEmailAuthCode = (email, type) =>{
    return Http.post('user/sendRegisterCode', {email, type})
}

/**
 * 用户偏好设置，
 * @param send
 * @return {AxiosPromise<any>}
 */
export const setUserConfig = (send) =>{
    return Http.post('user/config', send)
}

/**
 *
 * @param email
 * @return {AxiosPromise<any>}
 */
export const validateEmailHasRegister = (email) =>{
    return Http.post('user/checkEmail', {email})
}

/// 主要是怕碰到填写完一堆信息后，提示一个需要登录就尴尬了。
export const islogin = () =>{
    if (Date.now() - lastTestTime > expireTime)
        return Http.post('user/islogin').then(() =>{
            lastTestTime = Date.now()
            return true
        })
    return Promise.resolve(true)
}

export const fetchUserInfo = () =>{
    return Http.post('user/info')
}
export const uploadFile = (file) =>{
    let formdata = new FormData()
    formdata.append('file', file)
    return Http.post('file/upload', formdata)
}