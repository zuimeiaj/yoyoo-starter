import { createViewFrom, updateIn } from '../lib/properties/types';
import { getFirstResponder } from '../lib/global/instance';
import config from '../lib/util/preference';
import { getClientBoundingRect, isTemporaryGroup } from '../lib/util/helper';
import { proxyPropsChange } from '@/lib/util/controllers';

export default class AlignmentService {
  /**
   *
   * @param {array<ViewProperties>} items
   * @param {string} type
   */
  constructor(items, type) {
    this.items = items;
    this.type = type;
    let target = getFirstResponder();
    let ist = isTemporaryGroup();
    // 通过选取批量处理
    if (ist) {
      this.target = target.properties;
      let axis = this.isSpaceX() ? 'x' : 'y';
      this.groupItems = this.getBoundingSortItems(target);
      // 已分组下面的数据进行分布
      // 相对于父元素
    } else {
      if (target._parent) {
        this.target = {
          transform: Object.assign({}, target._parent.properties.transform),
        };
      } else {
        this.target = {
          transform: {
            x: 0,
            width: config.viewport.width,
            y: 0,
            height: config.viewport.height,
          },
        };
      }
    }
  }

  getBoundingSortItems = (target) => {
    let axis = this.isSpaceX() ? 'x' : 'y';
    return target.group
      .map((item) => {
        let id = item.properties.id;
        item = getClientBoundingRect(item.properties.transform);
        item.id = id;
        return item;
      })
      .sort((a, b) => a[axis] - b[axis]);
  };
  isSpaceType = () => {
    return this.isSpaceX() || this.isSpaceY();
  };
  isSpaceX = () => {
    return this.type === 'alignment_x';
  };
  isSpaceY = () => {
    return this.type === 'alignment_y';
  };
  static alignment = (items, type) => {
    let align = new AlignmentService(items, type);
    let view = getFirstResponder();
    let ist = isTemporaryGroup();
    if (ist) {
      return align.handleTemporaryGroup();
    }
    return align.handleSingleView();
  };
  /**
   * 只处理等间距的情况
   * @return {Array<ViewProperties>}
   */
  handleGroup = () => {
    let view = getFirstResponder();
    let offset = 0;
    let av = this.getMinAndAve(this.type.slice(-1));
    let v = this.getVectorWithAxis();
    return updateIn(this.items, view.properties, (item) => {
      item.items = item.items.map((item, index) => {
        // 创建一个新的 view
        item = createViewFrom(Object.assign({}, item));
        let transform = Object.assign({}, item.transform);
        if (index > 0) offset += av.ave;
        transform = this[this.type](transform, offset);
        offset += transform[v];
        item.transform = transform;
        return item;
      });
      return item;
    });
  };
  getVectorWithAxis = () => {
    return this.type.slice(-1) === 'x' ? 'width' : 'height';
  };
  _applyBlockTransform = (block, x, y) => {
    return block.items.map((item) => {
      item = createViewFrom(item);
      item.transform.x += x;
      item.transform.y += y;
      if (item.type == 'block') {
        item.items = this._applyBlockTransform(item, x, y);
      }
      return item;
    });
  };
  handleTemporaryGroup = () => {
    let index = 0;
    let offset = this.target.transform[this.type.slice(-1)];
    let v = this.getVectorWithAxis();
    let av = this.getMinAndAve();
    return proxyPropsChange(this.items, this.groupItems.slice(), (item) => {
      let transform = getClientBoundingRect(item.transform);
      if (this.isSpaceType()) {
        if (index > 0) offset += av.ave;
        transform = this[this.type](transform, offset);
        index += 1;
        offset += transform[v];
      } else {
        transform = this[this.type](transform);
      }
      let dx = transform.x - item.transform.x;
      let dy = transform.y - item.transform.y;
      item.transform.x += dx;
      item.transform.y += dy;
      if (item.type == 'block') {
        item.items = this._applyBlockTransform(item, dx, dy);
      }
      item._xPercent = (transform.x - this.target.transform.x) / this.target.transform.width;
      item._yPercent = (transform.y - this.target.transform.y) / this.target.transform.height;
      return item;
    });
  };
  handleSingleView = () => {
    let view = getFirstResponder();
    return proxyPropsChange(this.items, view, (item) => {
      let transform = getClientBoundingRect(item.transform);
      transform = this[this.type](transform);
      let dx = transform.x - item.transform.x;
      let dy = transform.y - item.transform.y;
      item.transform.x += dx;
      item.transform.y += dy;
      if (item.type == 'block') {
        item.items = this._applyBlockTransform(item, dx, dy);
      }
      return item;
    });
  };

  alignment_left(transform) {
    let diff = transform.x - this.target.transform.x;
    transform.x = transform.origin.x - diff;
    transform.y = transform.origin.y;
    return transform;
  }

  alignment_right(transform) {
    let diff = transform.x + transform.width - (this.target.transform.x + this.target.transform.width);
    transform.x = transform.origin.x - diff;
    transform.y = transform.origin.y;
    return transform;
  }

  alignment_center(transform) {
    transform.y = transform.origin.y;
    let t = this.target.transform;
    transform.x = t.width / 2 - transform.origin.width / 2;
    if (isTemporaryGroup()) {
      transform.x += t.x;
    }
    return transform;
  }

  alignment_top(transform) {
    let diff = transform.y - this.target.transform.y;
    transform.y = transform.origin.y - diff;
    transform.x = transform.origin.x;
    return transform;
  }

  alignment_middle(transform) {
    let t = this.target.transform;
    transform.y = t.height / 2 - transform.origin.height / 2;
    transform.x = transform.origin.x;
    if (isTemporaryGroup()) {
      transform.y += t.y;
    }
    return transform;
  }

  alignment_bottom(transform) {
    let diff = transform.y + transform.height - (this.target.transform.y + this.target.transform.height);
    transform.y = transform.origin.y - diff;
    transform.x = transform.origin.x;
    return transform;
  }

  alignment_x(transform, offset) {
    let diff = offset - transform.x;
    transform.x = transform.origin.x + diff;
    transform.y = transform.origin.y;
    return transform;
  }

  /**
   *
   * @param axis
   * @return {{min : number, ave : number}}
   */
  getMinAndAve = () => {
    let length = 0;
    let axis = this.type.slice(-1);
    let v = this.getVectorWithAxis();
    this.groupItems.forEach((item) => {
      length += item[v];
    });
    let total = this.target.transform[v];
    let spaceBetween = (total - length) / (this.groupItems.length - 1);
    return {
      min: this.target.transform[axis],
      ave: spaceBetween,
    };
  };

  alignment_y(transform, offset) {
    let diff = offset - transform.y;
    transform.y = transform.origin.y + diff;
    transform.x = transform.origin.x;
    return transform;
  }
}
