export const validateItems = (items) =>{
    let error = []
    for (let i = 0, j = items.length; i < j; i++) {
        let item = items[i]
        if (item.type === 'group' && item.items.length > 0) {
            error = error.concat(validateItems(item.items))
        }
        if (!item.transform) {
            error.push({message : 'No transform', data : item})
        }
        //if (!item.shapes && item.type !== 'line') {
        //    error.push({message : 'No shapes', data : item})
        //}
        if (!item.animations) {
            error.push({message : 'No animations', data : item})
        }
        if (!item.interactions) {
            error.push({message : 'No interactions', data : item})
        }
    }
    return error
}