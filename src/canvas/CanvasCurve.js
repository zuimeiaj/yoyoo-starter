import CanvasView from "./CanvasView";



export default class CanvasCurve extends CanvasView {
    draw(){
        let ctx = this.ctx
        ctx.save()
        this.rotateBanckground()
        let {x, y, width, height, rotation} = this.rect
        let {curve:{x : x1, y : y1},bg} = this.data
        ctx.beginPath()
        
        ctx.strokeStyle='rgba(0,0,0,0)'
        ctx.moveTo(x, y)
        ctx.lineTo(x + width, y)
        ctx.lineTo(x + width, y + height)
        ctx.lineTo(x, y + height)
        ctx.closePath()
        ctx.clip()
        //
        ctx.beginPath()
        this.drawBorderStyle()
        ctx.fillStyle = bg
        ctx.lineWidth = 1
        ctx.moveTo(x, y + height)
        ctx.quadraticCurveTo(x + x1, y + y1, x + width, y + height)
        if (bg && bg !== 'none') {
            ctx.fill()
        }
        
        ctx.stroke()
        ctx.restore()
    }
}