import CanvasView from "./CanvasView";
import {IMAGE_MODE_FILL, IMAGE_MODE_SCALE, IMAGE_MODE_STRETCH} from "../lib/ui/Image";

export class ImageLoader{
    /**
     *
     * @param {Array<id:string,url:string>} urls  资源集合
     */
    constructor(urls = []){
        // 存储加载成功的图片数据
        this.maps = {}
        this.urls = urls
    }
    
    get(imageId){
        return this.maps[imageId]
    }
    
    load = async()=>{
        for(let i = 0; i < this.urls.length; i += 1) {
            let source = this.urls[i]
            let image = await  this._loadImage(source.url)
            if(image) {
                this.maps[source.id] = image
            }
        }
    }
    _loadImage = (url)=>{
        return new Promise((resolve)=>{
            let image = new window.Image()
            image.setAttribute('crossorigin', 'anonymous')
            image.onload = function(){
                resolve(this)
            }
            image.onerror = function(){
                resolve(null)
            }
            image.src = url
        })
    }
}

export default class CanvasImage extends CanvasView{
    /**
     * @override
     */
    draw(){
        this.ctx.save()
        this.drawRect()
        this.ctx.stroke()
        this.ctx.clip()
        let {source, fill} = this.data.image
        let image = this.assets.get(this.data.id)
        // 图片加载失败
        if(!image) return
        let {x, y, width, height} = this.rect
        let xRatio = image.width / width
        let yRatio = image.height / height
        if(fill === IMAGE_MODE_STRETCH) {
            this.ctx.drawImage(image, x, y, width, height)
        } else if(fill === IMAGE_MODE_FILL) {
            let ratio = width / height
            let sw, sh, sx, sy, sImage;
            if(xRatio > yRatio) { // 高度不变，宽度裁剪
                sw = image.height * ratio
                sh = image.height
                sx = (image.width - sw) / 2
                sy = 0
            } else { // 反之
                sh = image.width / ratio
                sw = image.width
                sx = 0
                sy = (image.height - sh) / 2
            }
            this.ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height)
        } else if(fill === IMAGE_MODE_SCALE) { // 和fill相反
            let ratio = width / height
            let sw, sh, sx, sy, sImage;
            if(xRatio > yRatio) { // 宽度撑满，高度自适应
                sh = image.width / ratio
                sw = image.width
                sx = 0
                sy = (image.height - sh) / 2
            } else {
                // 反之
                sw = image.height * ratio
                sh = image.height
                sx = (image.width - sw) / 2
                sy = 0
            }
            this.ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height)
        }
        this.ctx.restore()
    }
}