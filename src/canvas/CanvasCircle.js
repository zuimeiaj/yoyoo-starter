import CanvasView from "./CanvasView";

export default class CanvasCircle extends CanvasView{
    draw(){
        let ctx = this.ctx
        ctx.save()
        this.rotateBanckground()
        let {x, y, width, height} = this.rect
        let {border : {width : strokeWidth}, circle : {offset, array}} = this.data
        ctx.lineWidth = strokeWidth
        this.drawBorderStyle()
        ctx.beginPath()
        ctx.arc(x + width / 2, y + height / 2, (width - strokeWidth) / 2, 0, Math.abs((array - offset) / array) * 2 * Math.PI)
        ctx.stroke()
        ctx.restore()
    }
}