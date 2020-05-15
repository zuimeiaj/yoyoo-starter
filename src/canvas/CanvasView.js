import 'inset.js'

/**
 * @class CanvasView
 */
export default class CanvasView{
    /**
     * @description 视图数据源
     * @param data
     */
    constructor(data, parent){
        this.defaultColor = 'rgba(0,0,0,0)'
        /**
         * 基于画布中心旋转，单个组件绘制时候，以组件边界作为画布宽高
         * @type {boolean}
         */
        this.isSingleObject = false
        /**
         *
         * @type {CanvasRenderingContext2D | WebGLRenderingContext}
         */
        this.ctx = null
        /**
         *
         * @type {HTMLCanvasElement}
         */
        this.canvas = null
        /**
         *
         * @type {CanvasView}
         */
        this.parent = parent
        /**
         * @type {ViewProperties | TextProperties | FontIconProperties}
         */
        this.data = data
        /**
         *
         * @type {ImageLoader} 资源加载器，存放所有加载后的资源
         */
        this.assets = null
        /**
         *
         * @type {null}
         */
        this.rect = this.getRect()
    }
    
    drawBorderStyle = ()=>{
        let border = this.data.border || {}
        if(border.style === 'dotted') {
            this.ctx.setLineDash([1, 1])
        } else if(border.style === 'dashed') {
            this.ctx.setLineDash([5, 2])
        }
        // shadow
        if(border.color && border.color != 'none' && border.width > 0) {
            this.ctx.strokeStyle = border.color
        } else {
            this.ctx.strokeStyle = this.defaultColor
        }
    }
    
    /**
     * 该函数只能调用一次，
     * 基于组件中心点旋转后，组件原坐标将变为 宽高的一半
     *
     */
    rotateBanckground(){
        let {x, y, width, height, rotation} = this.rect
        if(this.isSingleObject) {
            let w = this.canvas.width, h = this.canvas.height
            // 基于画布旋转
            this.ctx.translate(w / 2, h / 2)
            this.rect.x = -w / 2
            this.rect.y = -h / 2
        } else {
            //  基于组件中心旋转
            this.ctx.translate(x + width / 2, y + height / 2)
            this.rect.x = -width / 2
            this.rect.y = -height / 2
        }
        // 重置组件坐标
        this.ctx.rotate(rotation / 180 * Math.PI)
    }
    
    /**
     * 获取 组件到 相对于画布的绝对坐标
     * @return {{x : number, y : number, width : number, height : number, rotation : number}}
     */
    getRect(){
        return this.data.transform;
    }
    
    /**
     * 外观绘制 border shadow
     */
    drawRect(){
        this.rotateBanckground()
        let {x, y, width, height, rotation} = this.rect
        const {border = {}, bg : background, shadow = {}, corner = {}} = this.data
        this.ctx.beginPath()
        if(background && background !== 'none') {
            this.ctx.fillStyle = background
        } else {
            this.ctx.fillStyle = this.defaultColor
        }
        this.ctx.lineWidth = border.width
        this.drawBorderStyle()
        if(shadow.color && shadow.color !== 'none') {
            if(shadow.type == 'inset') {
                this.ctx.shadowInset = true
            }
            this.ctx.shadowColor = shadow.color
            this.ctx.shadowBlur = shadow.blur
            this.ctx.shadowOffsetX = shadow.offsetX
            this.ctx.shadowOffsetY = shadow.offsetY
        }
        let {topLeft = 0, topRight = 0, bottomRight = 0, bottomLeft = 0} = corner || {}
        let wc = width / 2, hc = height / 2
        if(topLeft.toString().endsWith('%')) {
            this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI)
        } else {
            topLeft = Math.min(topLeft, width / 2, height)
            topRight = Math.min(topRight, width / 2, height)
            bottomLeft = Math.min(bottomLeft, width / 2, height)
            bottomRight = Math.min(bottomRight, width / 2, height)
            // corner
            this.ctx.moveTo(x + topLeft, y)
            this.ctx.arcTo(x + width, y, x + width, y + height, topRight)
            this.ctx.arcTo(x + width, y + height, x, y + height, bottomRight)
            this.ctx.arcTo(x, y + height, x, y, bottomLeft)
            this.ctx.arcTo(x, y, x + topLeft, y, topLeft)
        }
        this.ctx.closePath()
    }
    
    /**
     * @protected 矩形背景绘制
     */
    draw(){
        this.ctx.save()
        this.drawRect()
        this.ctx.fill()
        this.ctx.stroke()
        this.ctx.restore()
    }
}


