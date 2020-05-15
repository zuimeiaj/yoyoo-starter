import CanvasView from "./CanvasView";



export default class CanvasInput extends CanvasView {
    draw(){
        this.ctx.save()
        this.drawRect()
        this.ctx.fill()
        this.ctx.stroke()
        this.ctx.clip()
        this.ctx.textBaseline = 'middle'
        this.ctx.textAlign = 'left'
        this.ctx.fillStyle = this.data.font.color
        let {x, y, width, height} = this.rect
        this.ctx.beginPath()
        this.ctx.fillText(this.data.fontData, x + 5, y + height / 2)
        this.ctx.restore()
    }
}
