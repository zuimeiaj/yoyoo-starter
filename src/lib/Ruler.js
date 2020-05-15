/**
 *  created by yaojun on 2018/12/1
 *
 */
import BaseCanvas from "./Base/BaseCanvas";
import config from "./util/preference";
import {getScreeTransform} from "./global";



class Ruler extends BaseCanvas {
    init(){
        super.init()
        this.scale = getScreeTransform().scale
        this.segment = 10
        this.step = 10
        this.realSegment = this.getRealSegment()
        this.offset = this.getScaleOffset()
        
    }
    
    
    update(){
        // Reset the size of the canvas
        super.init()
        this.draw()
    }
    
    
    getScaleOffset(){
        return this.getRealSegment() * this.scale / this.step - this.step
    }
    
    
    getRealSegment(){
        return Math.round(this.step / this.scale) * this.step
    }
    
    
    setScale(n){
        this.scale = n
        this.realSegment = this.getRealSegment()
        this.offset = this.getScaleOffset()
        this.draw()
    }
    
    
    translate(start){
        this.start = start
        this.draw()
    }
    
    
    draw(){
        let {fontColor = '#989898', lineColor = '#d3d3d3'} = this.options
        this.context.strokeStyle = lineColor
        this.context.fillStyle = fontColor
        this.context.clearRect(0, 0, this.width, this.height)
    }
    
}

export class HorizontalRuler extends Ruler {
    constructor(canvas, options){
        super(canvas, options)
        this.start = - config.originCoords.x // 默认从0 开始
        this.draw()
    }
    
    
    draw(){
        super.draw()
        let width = this.width + this.start, height = this.height,
            segment = this.segment, step = this.step + this.offset, steps = this.width / this.step,
            ctx = this.context, short = height / 1.5, index = 0,
            realSegment = this.realSegment
        ctx.beginPath()
        ctx.moveTo(0, height)
        ctx.lineTo(this.width, height)
        let segmentStartIndex = Math.ceil(this.start / realSegment)
        let startIndex = Math.ceil(this.start * this.scale / step)
        steps += startIndex + 20
        for (let i = startIndex; i < steps; i += 1) {
            let x = i * step
            x -= this.start * this.scale
            if (i % segment === 0) {
                ctx.moveTo(x , 0)
                ctx.fillText((index + segmentStartIndex) * realSegment, x + 2, 10)
                index += 1
            } else
                ctx.moveTo(x, short)
            ctx.lineTo(x , height)
        }
        ctx.stroke()
        ctx.closePath()
        
    }
}

export class VerticalRuler extends Ruler {
    constructor(canvas, options){
        super(canvas, options)
        this.start = -config.originCoords.y // 默认从0 开始
        this.draw()
    }
    
    
    draw(){
        super.draw()
        let width = this.width, height = this.height, start = this.start,
            segment = this.segment, step = this.step + this.offset, steps = height / this.step,
            ctx = this.context, short = width / 1.5, index = 0, realSegment = this.realSegment
        ctx.beginPath()
        ctx.moveTo(width, 0)
        ctx.lineTo(width, height)
        let segmentStartIndex = Math.ceil(this.start / this.realSegment)
        let startIndex = Math.ceil(this.start * this.scale / step)
        steps += startIndex + 20
        for (let i = startIndex; i < steps; i += 1) {
            let y = i * step
            y -= this.start * this.scale
            if (i % segment === 0) {
                ctx.moveTo(0, y)
                ctx.save()
                ctx.translate(3, y + 2)
                ctx.rotate(Math.PI / 2)
                ctx.fillText((index + segmentStartIndex) * realSegment, 0, 0)
                ctx.restore()
                index += 1
            } else
                ctx.moveTo(short, y )
            ctx.lineTo(width, y )
        }
        ctx.stroke()
        ctx.closePath()
    }
}
