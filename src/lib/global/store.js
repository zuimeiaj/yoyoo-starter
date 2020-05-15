var store = {}

export const setStore = (key, value) =>{
    store[key] = value
}
export const getStore = (key) =>{
    return store[key]
}
export const clearStore = () =>{
    store = {}
}
export const removeStoreItem = (key) =>{
    delete store[key]
}