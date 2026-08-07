/**
 *  created by yaojun on 2018/12/1
 *
 */
import React from 'react';
import Container from './ViewContainer';
import Group from './ViewGroup';
import Text from './ViewText';
import PropTypes from 'prop-types';
import Image from './ViewImage';
import ViewIcon from './ViewIcon';
import ViewInput, { ViewTextArea } from './ViewInput';
import ViewSelect from './ViewSelect';
import ViewRadio from './ViewRadio';
import ViewCheckbox from './ViewCheckbox';
import ViewLine from './ViewLine';
import ViewTriangle from './ViewTriangle';
import ViewDiamond from './ViewDiamond';
import ViewParallelogram from './ViewParallelogram';
import ViewHexagon from './ViewHexagon';
import ViewPolygon from './ViewPolygon';
import ViewCircle from './ViewCircle';
import ViewPath from './ViewPath';
import ViewFlowShape from './ViewFlowShape';
import ViewChart from './ViewChart';
import { BlockView, MasterView } from '@/lib/Widget/ViewGroup';
import CommentView from '@/lib/Widget/Comment';
import ViewTable from './ViewTable';
import ViewTag from './ViewTag';
import ViewRate from './ViewRate';
import ViewProgress from './ViewProgress';
import ViewStatistic from './ViewStatistic';
import ViewBadge from './ViewBadge';
import ViewAvatar from './ViewAvatar';
import ViewAlert from './ViewAlert';
import ViewSteps from './ViewSteps';

const maps = {
  text: Text,
  rect: Container,
  group: Group,
  block: BlockView,
  image: Image,
  icon: ViewIcon,
  input: ViewInput,
  textarea: ViewTextArea,
  button: Text,
  radio: ViewRadio,
  checkbox: ViewCheckbox,
  switch: ViewIcon,
  select: ViewSelect,
  line: ViewLine,
  triangle: ViewTriangle,
  diamond: ViewDiamond,
  parallelogram: ViewParallelogram,
  hexagon: ViewHexagon,
  bubble: ViewPolygon,
  circle: ViewCircle,
  path: ViewPath,
  // 流程图新增形状（ViewFlowShape 按 flowShape 渲染）
  capsule: ViewFlowShape,
  ellipse: ViewFlowShape,
  predefined: ViewFlowShape,
  document: ViewFlowShape,
  cylinder: ViewFlowShape,
  trapezoid: ViewFlowShape,
  delay: ViewFlowShape,
  annotation: ViewFlowShape,
  master: MasterView,
  comment: CommentView,
  table: ViewTable,
  chart: ViewChart,
  bar: ViewChart,
  line: ViewChart,
  area: ViewChart,
  pie: ViewChart,
  radar: ViewChart,
  // 数据展示组件（antd 封装）
  tag: ViewTag,
  rate: ViewRate,
  progress: ViewProgress,
  statistic: ViewStatistic,
  badge: ViewBadge,
  avatar: ViewAvatar,
  alert: ViewAlert,
  steps: ViewSteps,
};
export default class View extends React.PureComponent {
  static propTypes = {
    properties: PropTypes.object.isRequired,
    type: PropTypes.string.isRequired,
  };

  render() {
    let Control = maps[this.props.type];
    return <Control parent={this.props.parent} properties={this.props.properties} />;
  }
}
