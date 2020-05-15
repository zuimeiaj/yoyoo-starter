import {Http} from "./config";



/**
 * 创建新的项目
 * @param send
 * @return {AxiosPromise<any>}
 */
export const createProject = (send) =>{
    return Http.post('project/create', send)
}

/**
 * 进入项目编辑模式
 * @param id
 * @return {AxiosPromise<any>}
 */
export const useProject = (id) =>{
    return Http.post('project/user', {id})
}

/**
 * 获取项目列表
 * @param alias
 * @return {AxiosPromise<any>}
 */
export const fetchProjectList = (alias) =>{
    return Http.post('project/list', {alias})
}
/**
 * 删除项目
 * @param id
 * @return {AxiosPromise<any>}
 */
export const deleteProject = (id) =>{
    return Http.post('project/delete', {id})
}

/**
 * 修改项目信息
 * @param send
 * @return {AxiosPromise<any>}
 */
export const updateProject = (send) =>{
    return Http.post('project/update', send)
}

/**
 * 获取当前项目数据列表,没有详细信息
 * @return {AxiosPromise<any>}
 */
export const fetchProjectPages = (projectid) =>{
    return Http.post('page/list',{projectid})
}
/**
 * 获取项目master组件列表
 * @return {AxiosPromise<any>}
 */
export const fetchProjectMasters = () =>{
    return Http.post('project/master')
}
/**
 * 查看项目详情，包括pages
 */
export const fetchProjectInfo=(projectid)=>{
 return Http.post('project/info',{projectid})
}