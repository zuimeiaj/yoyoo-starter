let positions = {}
export const clearComponentPosition = ()=>{
    positions = {x : {}, y : {}}
}
export const setComponentPosition = (k, v)=>{
    positions[k][v] = true
}
export const getComponentPosition = ()=>{
    return positions
}