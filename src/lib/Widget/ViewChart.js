/**
 *  created by yaojun on 2026/8/4
 *  图表组件：ECharts 封装（SVG 渲染器，html2canvas 导出兼容）。
 *  支持 bar / line / area / pie / radar 五种基础图表，数据模型统一为
 *  { categories: string[], series: [{ name, data }] }，双击弹 textarea 编辑 JSON（容错写回）。
 */
import React from 'react';
import { createPortal } from 'react-dom';
import * as echarts from 'echarts';
import ViewController from './ViewController';
import { Dom } from '../util/helper';
import Event from '../Base/Event';
import { component_close_edit_mode, component_edit_mode, component_properties_change, editor_scroll_change } from '../util/actions';
import { getTemporaryGroup, setCurrentEditor } from '../global/instance';
import { getGroupId } from '../global/selection';
import './ViewChart.scss';

export default class ViewChart extends ViewController {
  // 图表可自由调整宽高：全量手柄
  getResizeHandles = () => ['rotation', 'tl', 'tm', 'tr', 'r', 'br', 'bm', 'bl', 'l', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom'];

  componentDidMount() {
    super.componentDidMount();
    // SVG 渲染器：canvas 渲染在 html2canvas 导出时会空白
    this._chart = echarts.init(this.refs.chart, null, { renderer: 'svg' });
    this._render();
    // 编辑弹窗挂在 body（portal），画布缩放/平移时需跟随组件重定位
    Event.listen(editor_scroll_change, this._handleScrollWhileEdit);
  }

  componentDidUpdate(prevProps) {
    // 属性变更链路会替换 properties 引用（componentWillReceiveProps → initProperties），引用变化即数据变化
    if (prevProps && prevProps.properties !== this.properties) {
      this._render();
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Event.destroy(editor_scroll_change, this._handleScrollWhileEdit);
    if (this._chart) {
      this._chart.dispose();
      this._chart = null;
    }
  }

  setTransform(x, y, w, h, r) {
    super.setTransform(x, y, w, h, r);
    // 组件 resize（拖手柄改尺寸）后容器尺寸变化，图表需手动 resize 跟随
    if (this._chart) this._chart.resize();
  }

  setColor(key, value) {
    if (key === 'bg' || key === 'border') {
      this.forceUpdate(); // 背景/边框由 option 渲染（backgroundColor），直接重渲染
    } else {
      super.setColor(key, value);
    }
  }

  getWrapperClassName() {
    return super.getWrapperClassName() + ' view-chart';
  }

  // ==================== ECharts option 构建 ====================
  _render() {
    if (!this._chart) return;
    let option = this._buildOption();
    if (option) this._chart.setOption(option, true);
  }

  _buildOption() {
    let { chartType, chartData, chartSeries, chartColors, chartAxis, bg, font } = this.properties;
    let data = chartData || { categories: [], series: [] };
    let categories = data.categories || [];
    let series = data.series || [];
    // 维度配置（chartSeries，与系列索引对齐）：每项 { type?, color? }；旧数据 chartColors 兼容回退
    let colors = [],
      types = [];
    if (chartSeries && chartSeries.length) {
      colors = chartSeries.map((c) => (c && c.color) || undefined);
      types = chartSeries.map((c) => (c && c.type) || undefined);
    } else {
      colors = (chartColors || []).slice();
    }
    let fontColor = (font && font.color) || '#222';
    // 每系列实际类型：维度配置覆盖，缺省跟随整体 chartType（新组件模板默认值）
    // 防御：chartType 曾被旧 bug 污染为数组（onChange key 错位），非字符串时回退 bar
    let fallbackType = typeof chartType === 'string' ? chartType : 'bar';
    let sts = series.map((s, i) => types[i] || fallbackType);
    let base = {
      backgroundColor: bg || 'transparent',
      textStyle: { color: fontColor },
    };
    // 含笛卡尔坐标系系列（柱/线/面积）时配轴
    if (sts.some((t) => t === 'bar' || t === 'line' || t === 'area')) {
      let axis = chartAxis || {}; // X/Y 轴刻度标签显示开关（缺省显示）
      base.xAxis = { type: 'category', data: categories, axisLabel: { show: axis.xLabel !== false, color: fontColor } };
      base.yAxis = { type: 'value', axisLabel: { show: axis.yLabel !== false, color: fontColor } };
      // 多系列图例占位：按系列名长度估算图例行数，grid.top 动态预留（组件内部自适应，不依赖外部）
      // 每项约 28px（色块+间距）+ 名称 12px/字；单系列或含饼图（图例在底部）不预留
      let legendRows = 0;
      if (series.length > 1 && !sts.includes('pie')) {
        let totalW = series.reduce((sum, s) => sum + 28 + String(s.name || '').length * 12, 0);
        let containerW = Math.max((this.properties.transform.width || 300) - 20, 100);
        legendRows = Math.max(1, Math.ceil(totalW / containerW));
      }
      // 紧凑布局：containLabel 使 grid 包含轴标签不裁切
      base.grid = { left: 10, right: 10, top: legendRows ? 8 + legendRows * 22 : 10, bottom: 10, containLabel: true };
    }
    // 含雷达系列时配雷达坐标系（指标 max 取数据最大值 1.2 倍）
    if (sts.includes('radar')) {
      let max = 0;
      series.forEach((s) => {
        (s.data || []).forEach((v) => {
          max = Math.max(max, v);
        });
      });
      base.radar = {
        indicator: categories.map((name) => ({ name, max: Math.max(max * 1.2, 1) })),
        axisName: { color: fontColor },
      };
    }
    // 图例：含饼图放底部，多系列在顶部，单系列隐藏
    if (sts.includes('pie')) base.legend = { orient: 'horizontal', bottom: 0 };
    else if (series.length > 1) base.legend = {};
    else base.legend = { show: false };
    base.series = series.map((s, i) => {
      let st = sts[i];
      let color = colors[i] || undefined;
      if (st === 'pie') {
        return {
          type: 'pie',
          radius: '70%',
          label: { color: fontColor },
          // 扇形按 categories 索引着色
          data: categories.map((name, j) => ({ name, value: (s.data || [])[j] || 0, color: colors[j] || undefined })),
        };
      }
      if (st === 'radar') {
        return { type: 'radar', data: [{ name: s.name, value: s.data || [], color }] };
      }
      let isArea = st === 'area';
      return {
        name: s.name,
        type: isArea ? 'line' : st,
        smooth: st !== 'bar',
        data: s.data || [],
        color,
        ...(isArea ? { areaStyle: {} } : {}),
      };
    });
    return base;
  }

  // ==================== 双击编辑数据（表格文本） ====================
  // 表格格式：每行一条记录，空白/制表符/逗号分隔（支持从 Excel 直接粘贴）
  //   2 列：维度 值        → 单系列（维度 = X 轴类目，如 语文 80）
  //   3 列：分组 维度 值    → 多系列（分组 = 系列名，如 2024 语文 80）
  onDBClick(e) {
    if (getGroupId()[this.properties.id] && getTemporaryGroup().isLockChildren) {
      super.onDBClick(e);
    } else {
      e.stopPropagation();
      let poplist = this.refs.poplist;
      // 回显当前数据为表格文本，blur 写回（非受控 textarea，直接设 DOM value）
      poplist.value = this._chartDataToTable(this.properties.chartData);
      Dom.of(poplist).show();
      this._positionPop(); // 弹窗挂在 body（fixed），按组件屏幕位置定位
      poplist.focus();
      setCurrentEditor(this);
      Event.dispatch(component_edit_mode);
    }
  }

  // 弹窗 fixed 定位到组件屏幕位置（组件下方 3px）；画布缩放/平移时重新计算
  _positionPop = () => {
    let poplist = this.refs.poplist;
    if (!poplist) return;
    let rect = this.refs.container.getBoundingClientRect();
    poplist.style.left = rect.left + 'px';
    poplist.style.top = rect.bottom + 3 + 'px';
  };
  _handleScrollWhileEdit = () => {
    if (this.refs.poplist && this.refs.poplist.style.display !== 'none') {
      this._positionPop();
    }
  };

  setEditorBlur = () => {
    Event.dispatch(component_close_edit_mode);
    if (this.refs.poplist) {
      Dom.of(this.refs.poplist).hide();
    }
  };

  _handlePoplistChange = (e) => {
    // 表格 → chartData（实时解析渲染；行无法解析时跳过，不打断编辑）
    let parsed = this._tableToChartData(e.target.value);
    if (parsed) {
      this.properties.chartData = parsed;
      this.forceUpdate();
      this._render();
    }
  };

  /**
   * 表格文本 → chartData 统一模型
   * 2 列（维度 值）→ 单系列；3 列（分组 维度 值）→ 多系列（按分组聚合，缺失值补 null 显示缺口）
   */
  _tableToChartData = (text) => {
    let categories = [];
    let catIndex = new Map();
    let groups = new Map(); // 分组名 → { name, map: 维度→值 }
    text.split('\n').forEach((line) => {
      let parts = line.trim().split(/[\s,]+/).filter(Boolean);
      if (parts.length < 2) return;
      let group, cat, val;
      if (parts.length >= 3) {
        group = parts[0];
        cat = parts[1];
        val = parts[2];
      } else {
        group = '__default__';
        cat = parts[0];
        val = parts[1];
      }
      if (!catIndex.has(cat)) {
        catIndex.set(cat, categories.length);
        categories.push(cat);
      }
      if (!groups.has(group)) {
        groups.set(group, { name: group === '__default__' ? '数据' : group, data: {} });
      }
      let v = parseFloat(val);
      groups.get(group).data[cat] = isNaN(v) ? 0 : v;
    });
    if (!categories.length) return null;
    let series = [...groups.values()].map((g) => ({
      name: g.name,
      data: categories.map((c) => (g.data[c] !== undefined ? g.data[c] : null)),
    }));
    return { categories, series };
  };

  /**
   * chartData → 表格文本（列对齐便于阅读）
   * 单系列：维度 值；多系列：分组 维度 值
   */
  _chartDataToTable = (data) => {
    let categories = data.categories || [];
    let series = data.series || [];
    if (!series.length) return '';
    let rows = [];
    series.forEach((s) => {
      categories.forEach((c, i) => {
        let v = s.data[i];
        rows.push(s.name === '数据' && series.length === 1 ? [c, v] : [s.name, c, v]);
      });
    });
    if (!rows.length) return '';
    let widths = rows[0].map((_, j) => Math.max(...rows.map((r) => String(r[j]).length)));
    return rows.map((r) => r.map((cell, j) => String(cell).padEnd(widths[j])).join('  ')).join('\n');
  };

  renderContent() {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <div ref={'chart'} style={{ width: '100%', height: '100%' }} />
        {
          // portal 到 body：脱离组件层叠上下文（组件 z-index 受 properties.zIndex 限制，弹窗会被高层级组件遮挡）
          createPortal(
            <textarea
              onBlur={this.setEditorBlur}
              onChange={this._handlePoplistChange}
              data-event='ignore'
              data-drag='false'
              ref={'poplist'}
              className={'view-chart-poplist'}
              placeholder={'每行一条记录，空白/制表符分隔\n2 列 = 单系列（维度 值）：\n  语文 80\n  数学 90\n3 列 = 多系列（分组 维度 值）：\n  2024 语文 80\n  2025 数学 90'}
              spellCheck={false}
            />,
            document.body
          )
        }
      </div>
    );
  }
}
