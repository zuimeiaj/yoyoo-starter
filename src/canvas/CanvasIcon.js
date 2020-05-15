import CanvasView from "./CanvasView";



export default class CanvasIcon extends CanvasView {
    draw(){
        this.ctx.save()
        this.rotateBanckground()
        let {icon : {content}, bg} = this.data
        let {x, y, width, height} = this.rect
        this.ctx.beginPath()
        this.ctx.fillStyle = bg
        this.ctx.font = `${width}px preseticons`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(String.fromCharCode(parseInt(content, 16)), x + width / 2, y + height / 2)
        this.ctx.closePath()
        this.ctx.restore()
    }
}