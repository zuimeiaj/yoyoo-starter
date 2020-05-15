import ViewProperties, {DEFAULT_COLOR} from "./base";



export default class SelectProperties extends ViewProperties {
    constructor(){
        super()
        this.type = 'select'
        this.alias = '下拉选择'
        // 解析换行符
        this.selectOptions = ''
        this.border.width = 1
        this.corner.topRight = 4
        this.corner.topLeft = 4
        this.corner.bottomLeft = 4
        this.corner.bottomRight = 4
        this.font = {size : 12, color : DEFAULT_COLOR}
    }
}