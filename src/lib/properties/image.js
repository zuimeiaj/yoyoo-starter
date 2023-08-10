import ViewProperties from './base';
import { IMAGE_MODE_FILL, IMAGE_MODE_SCALE } from '../ui/Image';
import { DEFAULT_IMG } from '../util/helper';

export default class ImageProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'image';
    this.alias = '图片';
    this.image = {
      fill: IMAGE_MODE_FILL, //  fill | scale | stretch
      source: DEFAULT_IMG,
    };
    delete this.bg;
  }
}
