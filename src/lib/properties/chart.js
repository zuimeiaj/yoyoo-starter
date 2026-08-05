import ViewProperties from './base';

/**
 * 图表组件属性
 * chartData 统一数据模型（JSON 序列化）：
 *   { categories: string[], series: [{ name: string, data: number[] }] }
 *   - 柱/线/面积：categories = X 轴类目，series = 各数据系列
 *   - 饼图：categories = 扇形名称，series[0].data = 各扇形值
 *   - 雷达图：categories = 指标名，series = 各数据系列（按顺序对应指标）
 */
export default class ChartProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'chart';
    this.alias = '图表';
    this.chartType = 'bar';
    this.chartData = {
      categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
      series: [{ name: '销量', data: [120, 200, 150, 80, 70, 110] }],
    };
    // 维度配置：与 series 索引对齐（Inspector 配置），每项 { type?, color? }，type 缺省跟随整体图表类型
    this.chartSeries = [];
    // 坐标轴刻度标签显示：xLabel / yLabel（缺省显示）
    this.chartAxis = { xLabel: true, yLabel: true };
    this.border.width = 0;
    this.bg = 'rgba(255,255,255,1)';
    delete this.shadow;
    delete this.corner;
  }
}

export class BarProperties extends ChartProperties {
  constructor() {
    super();
    this.alias = '柱状图';
    this.chartType = 'bar';
    this.chartData = {
      categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
      series: [{ name: '销量', data: [120, 200, 150, 80, 70, 110] }],
    };
  }
}

export class LineProperties extends ChartProperties {
  constructor() {
    super();
    this.alias = '折线图';
    this.chartType = 'line';
    this.chartData = {
      categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      series: [{ name: '访问量', data: [820, 932, 901, 934, 1290, 1330, 1320] }],
    };
  }
}

export class AreaProperties extends ChartProperties {
  constructor() {
    super();
    this.alias = '面积图';
    this.chartType = 'area';
    this.chartData = {
      categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
      series: [{ name: '邮件营销', data: [120, 132, 101, 134, 90, 230] }],
    };
  }
}

export class PieProperties extends ChartProperties {
  constructor() {
    super();
    this.alias = '饼图';
    this.chartType = 'pie';
    this.chartData = {
      categories: ['直接访问', '邮件营销', '联盟广告', '视频广告', '搜索引擎'],
      series: [{ name: '访问来源', data: [335, 310, 234, 135, 1548] }],
    };
  }
}

export class RadarProperties extends ChartProperties {
  constructor() {
    super();
    this.alias = '雷达图';
    this.chartType = 'radar';
    this.chartData = {
      categories: ['销售', '管理', '信息技术', '客服', '研发', '市场'],
      series: [{ name: '预算分配', data: [4200, 3000, 2000, 3500, 5000, 3200] }],
    };
  }
}
