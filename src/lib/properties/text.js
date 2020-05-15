import ViewProperties from "./base";

const DEFAULT_COLOR = 'rgba(224,224,224,1)'
export default class TextProperties extends ViewProperties{
    constructor(){
        super()
        this.type = 'text'
        this.alias = '文本'
        this.font = {
            size : 14,
            color : 'rgba(0,0,0,1)',
        }
        this.align = {
            x : 'flex-start', // flex-start center flex-end
            y : 'flex-start',// flex-start center flex-end
        }
        this.fontStyle = []
        this.decorator = 'none'
        this.fontData = 'Text'
        this.spacing = {
            height : 1,
            width : 0
        }
    }
}

export class ButtonProperties extends TextProperties{
    constructor(){
        super()
        this.type = 'text'
        this.alias = '文本'
        this.align = {
            x : 'center',
            y : 'center',
        }
        this.decorator = 'none'
        this.fontData = 'Button'
        this.bg = DEFAULT_COLOR
        delete  this.spacing
        delete  this.decorator
        delete  this.fontStyle
    }
}

export class FontIconProperties extends ViewProperties{
    constructor(){
        super()
        this.type = 'icon'
        this.alias = '图标'
        this.icon = {
            data : '', // css class name
            content : '' // unicode
        }
        this.settings.ratio = true
        this.transform.width = 20
        this.transform.height = 20
        this.bg = 'rgba(0,0,0,1)'
        delete this.shadow
        delete this.corner
        delete this.border
    }
}

export class InputProperties extends TextProperties{
    constructor(){
        super()
        this.type = 'input'
        this.alias = '输入'
        this.fontData = '请输入'
        this.font.color = DEFAULT_COLOR
        this.border.width = 1
        this.border.color = DEFAULT_COLOR
        this.corner.bottomRight = 4
        this.corner.bottomLeft = 4
        this.corner.topLeft = 4
        this.corner.topRight = 4
        delete  this.spacing
        delete  this.decorator
        delete  this.fontStyle
        delete  this.align
    }
}

export class TextAreaProperties extends InputProperties{
    constructor(){
        super()
        this.type = 'textarea'
        this.alias = '多行输入'
        this.fontData = '请输入'
    }
}

export class CommentProperties extends TextProperties{
    constructor(){
        super()
        this.type = 'comment'
        this.alias = '标注'
        this.fontData = '输入'
        this.font.color = 'rgb(103, 103, 103)'
        this.spacing.height = 1.5
        this.corner.topLeft = 4
        this.corner.topRight = 4
        this.corner.bottomLeft = 4
        this.corner.bottomRight = 4
        this.font.size = 12
        this.bg = 'rgba(255, 250, 239,1)'
        this.shadow.blur = 8
        this.shadow.spread = 0
        this.border.style = 'dashed'
        //  rgba(0, 0, 0, 0.45) 1px 2px 9px 0px
        this.shadow.offsetX = 1
        this.shadow.offsetY = 2
        this.shadow.color = 'rgba(0,0,0,0.45)'
        this.settings.resize = ['borderLeft', 'borderTop', 'borderBottom', 'borderRight', 'tr', 'tm', 'tl', 'l', 'r', 'bl', 'bm', 'br']
    }
}