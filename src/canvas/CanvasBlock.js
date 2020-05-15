import CanvasView from "@/canvas/CanvasView";
import {getMasterFromStore, getMasterSnapshootFromStore} from "@/api/master";

export default class CanvasBlock extends CanvasView{
    draw(){
    }
}

export class CanvasMaster extends CanvasView{
    draw(){
        this.ctx.save()
        this.drawRect()
        this.ctx.stroke()
        this.ctx.clip()
        let id = this.data.masterId
        let data = getMasterSnapshootFromStore(id)
        if(data) {
            let page = getMasterFromStore(id)
            let {x, y, width, height} = this.rect
            this.ctx.drawImage(data, x, y, page.content.page.width, page.content.page.height)
        }
        this.ctx.restore()
    }
}