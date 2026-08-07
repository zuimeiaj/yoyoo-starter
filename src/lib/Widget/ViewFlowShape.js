/**
 *  created by yaojun on 2026/8/7
 *  通用流程图形状（胶囊/椭圆/预定义过程/文档/数据库圆柱/梯形/延迟/注释）：
 *  按 properties.flowShape 分派渲染，path 坐标按当前宽高实时计算（resize 自适应，无需 setTransform 特例）；
 *  继承 ShapeTextController：双击编辑文本（与其他流程图形状一致）。
 *  默认边框黑色、不填充（flow.js 属性类设置）
 */

import React from 'react';
import ShapeTextController from './ShapeTextController';
import { Dom } from '../util/helper';
import { initialCoverageIndex } from '../global';

/** 圆柱弧高（顶/底椭圆半短轴）：按高度 18%（8~24px），太浅看不出圆柱（曾踩坑） */
const cylinderArc = (h) => Math.max(Math.min(h * 0.18, 24), 8);

/** 各形状 path d（局部坐标 [0,w]×[0,h]，内缩 1px 避免 stroke 贴边被裁） */
const buildD = (shape, w, h) => {
  switch (shape) {
    // 文档（draw.io 样式）：底部一个完整波浪 = 2 段弧（波峰凸上 + 波谷凸下，谷超出组件底边
    // d/2，overflow visible 显示）；波浪深 d 按高度 32%（10~40px），弧从 3/4、1/2、1/4 均分
    case 'document': {
      let d = Math.max(Math.min(h * 0.32, 40), 10);
      return `M 1 1 H ${w - 1} V ${h - 1} Q ${(w * 3) / 4} ${h - 1 - d} ${w / 2} ${h - 1} Q ${w / 4} ${h - 1 + d} 1 ${h - 1} Z`;
    }
    // 数据库圆柱（draw.io 风格）：上下两个**完整椭圆**（外弧 + 内弧）+ 左右竖边。
    // 必须用 A 椭圆弧：Q 二次曲线端点切线斜向（指向控制点），两弧在左右端点不连续 → 尖角"眼睛"；
    // A 椭圆弧端点切线垂直，两弧平滑汇合成完整椭圆。
    // 三个子路径：外轮廓（顶弧+右竖+底弧+Z 左竖——Z 必须是左竖，曾漏画左竖边"看起来被裁剪"）、
    // 顶面内弧（凸下）、底面内弧（凸上），后两个不闭合 → 不参与填充
    case 'cylinder': {
      let a = cylinderArc(h);
      let rx = Math.max((w - 2) / 2, 0.5);
      let cy = 1 + a; // 顶面椭圆中心 y
      let by = h - 1 - a; // 底面椭圆中心 y
      return (
        `M 1 ${cy} A ${rx} ${a} 0 0 1 ${w - 1} ${cy} L ${w - 1} ${by} A ${rx} ${a} 0 0 1 1 ${by} Z ` +
        `M 1 ${cy} A ${rx} ${a} 0 0 0 ${w - 1} ${cy} ` +
        `M ${w - 1} ${by} A ${rx} ${a} 0 0 0 1 ${by}`
      );
    }
    // 预定义过程：外框矩形（双竖线由 renderContent 另画，不参与填充）
    case 'predefined':
      return `M 1 1 H ${w - 1} V ${h - 1} H 1 Z`;
    // 手动输入：上底短、下底长
    case 'trapezoid':
      return `M ${w / 4} 1 H ${(w * 3) / 4} L ${w - 1} ${h - 1} H 1 Z`;
    // 延迟（D 形）：矩形 + 右侧半圆（半径 = 高一半）
    case 'delay': {
      let r = Math.max((h - 2) / 2, 1);
      return `M 1 1 L ${w - 1 - r} 1 A ${r} ${r} 0 0 1 ${w - 1 - r} ${h - 1} L 1 ${h - 1} Z`;
    }
    // 注释：右上角 8×8 斜切
    case 'annotation':
      return `M 1 1 H ${w - 8} L ${w - 1} 9 V ${h - 1} H 1 Z`;
    // 人员（draw.io Person）：圆头 + 躯干 + 双臂 + 双腿，纯线条（fill none，renderContent 用 fill: bg 透明）
    case 'person': {
      let cx = w / 2;
      let r = Math.min(h * 0.14, w * 0.4); // 头半径（按高，宽小时钳制）
      let headC = h * 0.18; // 圆心
      let bodyTop = headC + r; // 躯干起点（圆底）
      let bodyBot = h * 0.62; // 躯干底（腿起点）
      let armY = (bodyTop + bodyBot) / 2; // 手臂高度
      let legBot = h * 0.96; // 腿底
      return (
        `M ${cx} ${headC - r} A ${r} ${r} 0 1 1 ${cx} ${headC + r} A ${r} ${r} 0 1 1 ${cx} ${headC - r} ` +
        `M ${cx} ${bodyTop} L ${cx} ${bodyBot} ` +
        `M ${w * 0.32} ${armY} L ${w * 0.68} ${armY} ` +
        `M ${cx} ${bodyBot} L ${w * 0.32} ${legBot} M ${cx} ${bodyBot} L ${w * 0.68} ${legBot}`
      );
    }
    default:
      return null;
  }
};

export default class ViewFlowShape extends ShapeTextController {
  initProperties() {
    let dom = Dom.of(this.refs.container);

    //  初始化层级，最后挂载的元素都在最上面
    if (this.properties.zIndex === -1) {
      this.properties.zIndex = initialCoverageIndex();
    }
    dom.zIndex(this.properties.zIndex);
    dom.showHide(!this.properties.settings.isHide);
  }

  setColor(key, value) {
    if (key == 'border') key = 'stroke';
    if (key == 'bg') key = 'fill';
    Dom.of(this.refs.line).css(key, value);
  }

  setTransform(x, y, w, h, r) {
    super.setTransform(x, y, w, h, r);
    // resize 拖动中实时刷新内部图形：拖动时 React 不重渲染，必须直接操作 DOM
    //（与 ViewDiamond/ViewParallelogram 同模式；renderContent 首次渲染走 JSX，二者几何一致）
    this._applyBody();
  }

  // 按当前 transform 重写内部图形（主元素 + 附加元素：预定义双竖线）
  _applyBody = () => {
    let line = this.refs.line;
    if (!line) return;
    let { width: w, height: h } = this.properties.transform;
    let shape = this.properties.flowShape || 'capsule';
    if (shape === 'rect' || shape === 'capsule') {
      line.setAttribute('x', 1);
      line.setAttribute('y', 1);
      line.setAttribute('width', Math.max(w - 2, 0));
      line.setAttribute('height', Math.max(h - 2, 0));
      line.setAttribute('rx', shape === 'capsule' ? (h - 2) / 2 : 0);
    } else if (shape === 'ellipse') {
      line.setAttribute('cx', w / 2);
      line.setAttribute('cy', h / 2);
      line.setAttribute('rx', Math.max((w - 2) / 2, 0));
      line.setAttribute('ry', Math.max((h - 2) / 2, 0));
    } else {
      line.setAttribute('d', buildD(shape, w, h));
    }
    if (shape === 'predefined' && this.refs.divider) {
      this.refs.divider.setAttribute('d', `M ${w / 6} 1 V ${h - 1} M ${(w * 5) / 6} 1 V ${h - 1}`);
    }
  };

  renderContent() {
    let { width: w, height: h } = this.properties.transform;
    let {
      border: { width: sw, color, style },
      bg,
    } = this.properties;
    let strokeDash = {};
    if (style == 'dashed') {
      strokeDash.strokeDasharray = sw * 3;
      strokeDash.strokeDashoffset = 3;
    } else if (style == 'dotted') {
      strokeDash.strokeDasharray = sw;
      strokeDash.strokeDashoffset = sw;
    }
    let shape = this.properties.flowShape || 'capsule';
    let body;
    if (shape === 'rect' || shape === 'capsule') {
      // 流程矩形（直角 SVG rect）/ 胶囊（起止）：全圆角矩形
      body = (
        <rect
          ref={'line'}
          x={1}
          y={1}
          width={Math.max(w - 2, 0)}
          height={Math.max(h - 2, 0)}
          rx={shape === 'capsule' ? (h - 2) / 2 : 0}
          {...strokeDash}
          strokeWidth={sw}
          style={{ fill: bg, stroke: color }}
        />
      );
    } else if (shape === 'ellipse') {
      body = (
        <ellipse
          ref={'line'}
          cx={w / 2}
          cy={h / 2}
          rx={Math.max((w - 2) / 2, 0)}
          ry={Math.max((h - 2) / 2, 0)}
          {...strokeDash}
          strokeWidth={sw}
          style={{ fill: bg, stroke: color }}
        />
      );
    } else {
      body = <path ref={'line'} d={buildD(shape, w, h)} {...strokeDash} strokeWidth={sw} style={{ fill: bg, stroke: color }} />;
    }
    return [
      <svg
        key={'s'}
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        xmlns={'http://www.w3.org/2000/svg'}
        data-uid={this.properties.id}
        className={'view-flow-shape'}
      >
        {body}
        {/* 预定义过程：左右双竖线（不填充，与外框同色同宽；ref 供 resize 实时刷新） */}
        {shape === 'predefined' ? (
          <path ref={'divider'} d={`M ${w / 6} 1 V ${h - 1} M ${(w * 5) / 6} 1 V ${h - 1}`} stroke={color} strokeWidth={sw} fill={'none'} />
        ) : null}
      </svg>,
      this.renderText(),
    ];
  }
}
