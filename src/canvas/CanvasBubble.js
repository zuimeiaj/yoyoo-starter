import CanvasView from "./CanvasView";



export default class CanvasBubble extends CanvasView {
    draw(){
        let {bubble : {left}, bg} = this.data
        let ctx = this.ctx, r = 10
        ctx.save()
        this.rotateBanckground()
        let {x, y, width, height, rotation} = this.rect
        let h = height - 10
        
        if (bg && bg != 'none') {
            ctx.fillStyle = bg
        } else {
            ctx.fillStyle = this.defaultColor
        }
        
        this.drawBorderStyle()
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + width, y, x + width, y + h, r)
        ctx.arcTo(x + width, y + h, x + width - r, y + h, r)
        ctx.lineTo(x + left + 20, y + h)
        ctx.lineTo(x + left + 10, y + height)
        ctx.lineTo(x + left, y + h)
        ctx.arcTo(x, y + h, x, y, r)
        ctx.arcTo(x, y, x + r, y, r)
        ctx.fill()
        ctx.stroke()
        ctx.closePath()
        ctx.restore()
    }
}