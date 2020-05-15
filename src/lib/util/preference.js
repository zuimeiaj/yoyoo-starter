//mock
import {getScreeTransform} from "../global";
import Event from "../Base/Event";
import {context_zoom_level, preferences_configchange, refresh_editor_config, workspace_scroll_center} from "./actions";
import {DEFAULT_ZOOM_LEVEL} from "../Widget/EditorScrollbar";

const width = Math.floor(window.screen.width * 5)
const height = Math.floor(window.screen.height * 10)
const VIEW_PORT_SIZE = {
    PAD : 800,
    PC : 1200,
    MOBILE : 380
}
let config = {
    editorDomRect : {
        left : 280,
        top : 70,
        right : 260,
        bottom : 0
    },
    selection : 'inner', // cross | inner
    snap : {x : 10, y : 10}, //  当前项目，移动增量
    grid : true,
    //  初始坐标
    originCoords : {
        x : width / 2,
        y : height / 2
    },
    world : {
        x : width,
        y : height
    },
    viewport : { //  当前项目屏幕尺寸
        width : VIEW_PORT_SIZE.MOBILE,
        height : 600
    },
    guides : { //  当前项目，所有的参考线
        x : {},
        y : {}
    },
    autoAlign : 1
}
window._config = config
export const getSnaplineConfig = ()=>{
    let scale = getScreeTransform().scale
    let x = config.snap.x / scale,
        y = config.snap.y / scale;
    return {x, y}
}
export const initPageSizeWithProjectType = (info)=>{
    config.viewport.width = VIEW_PORT_SIZE[info.type]
    // 麻痹的,等待ruler 和scrollbar 加载完成。。。。
    setTimeout(()=>{
        let size = {
            PAD : DEFAULT_ZOOM_LEVEL - 4,
            PC : 11,
            MOBILE : DEFAULT_ZOOM_LEVEL
        }
        Event.dispatch(preferences_configchange, config)
        if(window.screen.width < 1400) { // 小于1400的屏幕对面板进行缩放
            Event.dispatch(context_zoom_level, size[info.type])
        }
        Event.dispatch(workspace_scroll_center)
    }, 1000)
}
export default config
export const updatePreferences = (newConfig, emitEvent = true)=>{
    Object.assign(config, newConfig)
    if(emitEvent) {
        Event.dispatch(preferences_configchange, config)
        Event.dispatch(refresh_editor_config, {
            key : 'preference',
            value : newConfig
        })
    }
}
export const updatePreferenceConfig = (obj = {})=>{
    Object.assign({}, config, obj)
}