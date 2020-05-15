let GroupId = {}

export const getGroupId = () =>{
    return GroupId
}
/**
 * 在当前分组中的组件id，用于判断该组件是否被选取
 * @param ids
 */
export const setGroupId = (ids) =>{
    GroupId = ids
}