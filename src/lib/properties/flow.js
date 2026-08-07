/**
 *  created by yaojun on 2026/8/7
 *  流程图新增形状属性类（胶囊/椭圆/预定义过程/文档/数据库圆柱/梯形/延迟/注释）：
 *  边框默认黑色、不填充（流程图节点规范）；flowShape 标识形状，ViewFlowShape 按它渲染。
 *  各形状用工厂生成（type/alias/flowShape/默认尺寸不同，其余规范一致）
 */

import ViewProperties, { FLOW_BG, FLOW_BORDER } from './base';

const makeFlowShape = (type, alias, flowShape, width, height) =>
  class extends ViewProperties {
    constructor() {
      super();
      this.type = type;
      this.alias = alias;
      this.flowShape = flowShape;
      this.transform.width = width;
      this.transform.height = height;
      this.border.width = 1;
      this.border.color = FLOW_BORDER;
      this.bg = FLOW_BG;
      this.text = '';
      delete this.shadow;
      delete this.corner;
    }
  };

export const Capsule = makeFlowShape('capsule', '胶囊', 'capsule', 200, 80);
export const Ellipse = makeFlowShape('ellipse', '椭圆', 'ellipse', 200, 100);
export const Predefined = makeFlowShape('predefined', '预定义', 'predefined', 200, 100);
export const Document = makeFlowShape('document', '文档', 'document', 160, 120);
export const Cylinder = makeFlowShape('cylinder', '数据库', 'cylinder', 180, 120);
export const Trapezoid = makeFlowShape('trapezoid', '梯形', 'trapezoid', 200, 100);
export const Delay = makeFlowShape('delay', '延迟', 'delay', 200, 100);
export const Annotation = makeFlowShape('annotation', '注释', 'annotation', 160, 120);
