import CanvasView from "./CanvasView";



export default class CanvasTriangle extends CanvasView {
    draw(){
        let ctx = this.ctx
        ctx.save()
        this.rotateBanckground()
        let {x, y, width, height, rotation} = this.rect
        let {bg : fill, border : {width : stroke}} = this.data
        
        this.drawBorderStyle()
        ctx.beginPath()
        
        ctx.moveTo(x + width / 2, y)
        
        ctx.lineTo(x + width, y + height)
        ctx.lineTo(x, y + height)
        ctx.closePath()
        ctx.lineWidth = stroke
        if (fill && fill != 'none') {
            ctx.fillStyle = fill
            ctx.fill()
        }
        
        ctx.stroke()
        
        ctx.restore()
    }
}