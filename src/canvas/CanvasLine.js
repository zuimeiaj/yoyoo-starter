import CanvasView from "./CanvasView";



export default class CanvasLine extends CanvasView {
    draw(){
        let ctx = this.ctx
        ctx.save()
        this.rotateBanckground()
        let {x, y, width, height, rotation} = this.rect
        ctx.lineWidth = 1
        this.drawBorderStyle()
        ctx.beginPath()
        let color = this.data.border.color
        color = color == 'none' ? '#000000' : color
        this.ctx.strokeStyle = color
        ctx.moveTo(x, y)
        ctx.lineTo(x + width, y + height)
        ctx.stroke()
        ctx.closePath()
        ctx.restore()
    }
}