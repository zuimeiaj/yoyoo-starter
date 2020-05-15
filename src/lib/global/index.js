import config from "../util/preference";



const globalKey = '__global_data__'

var data = window[globalKey] = {}
var coverage = 1000
var backCoverage = 1000


export function initialCoverageIndex(){
    return (coverage += 1)
}
export function getCurrentIndex(){
    return coverage
}


export function backZindex(){
    return (backCoverage -= 1)
}


export function setLastCoverageIndex(index){
    coverage = index
}


export function resetZIndex(){
    coverage = 0
}


// 0 | -1 | 1
var globalCoverageMode = 0


export function getCoveragePickeMode(){
    return globalCoverageMode
}


export function setCoveragePikeMode(mode){
    globalCoverageMode = mode
    if (mode === 0) {
        document.body.style.cursor = 'default'
    } else {
        document.body.style.cursor = 'crosshair'
    }
}


var globalCanvasDraggable = false


export function setCanvasDraggable(dragging){
    if (dragging) {
        document.body.style.cursor = 'grab'
    } else {
        document.body.style.cursor = 'default'
    }
    globalCanvasDraggable = dragging
}


export function getCanvasDraggable(){
    return globalCanvasDraggable
}


export function setScreenTransform(x, y, scale, level){
    window[globalKey].screen = {
        x, y, scale, level
    }
}


export const pointToWorkspaceCoords = (e) =>{
    let {x, y, scale} = getScreeTransform()
    let {viewport} = getScreenOffset()
    y = (y - config.originCoords.y) * scale + e.pageY - viewport.y * scale
    x = (x - config.originCoords.x) * scale + e.pageX - viewport.x * scale
    x = (x - config.editorDomRect.left) / scale
    y = (y - config.editorDomRect.top) / scale
    return {x, y}
}
export const workspaceToPointCoords = () =>{
    let {x, y, scale} = getScreeTransform()
    let {viewport} = getScreenOffset()
    let x1 = x * scale + config.editorDomRect.left + viewport.x * scale - (x - config.originCoords.x) * scale
    let y1 = y * scale + config.editorDomRect.top + viewport.y * scale - (y - config.originCoords.y) * scale
    return {x : x1 - x * scale, y : y1 - y * scale}
    
}
window.workToPoint = workspaceToPointCoords
window.pointToWork = pointToWorkspaceCoords


export function getScreeTransform(){
    let g = window[globalKey]
    let defaults = {
        x : 0,
        y : 0,
        scale : 1
    }
    return g && g.screen ? g.screen : defaults
}


export function setViewport(width, height){
    window[globalKey].viewport = {
        width, height
    }
}


export function getViewport(){
    let defaults = {
        width : 100,
        height : 100
    }
    let g = window[globalKey].viewport
    return g || defaults
}


data.offset = {}


export function setScreenOffset(x, y, viewpowt){
    data.offset.x = x
    data.offset.y = y
    if (viewpowt) data.offset.viewport = viewpowt
}


export function getScreenOffset(){
    return data.offset
}