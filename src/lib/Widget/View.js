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
import ViewLine from './ViewLine';
import ViewTriangle from './ViewTriangle';
import ViewPolygon from './ViewPolygon';
import ViewCurve from './ViewCurve';
import ViewCircle from './ViewCircle';
import { BlockView, MasterView } from '@/lib/Widget/ViewGroup';
import CommentView from '@/lib/Widget/Comment';

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
  radio: ViewIcon,
  checkbox: ViewIcon,
  switch: ViewIcon,
  select: ViewSelect,
  line: ViewLine,
  triangle: ViewTriangle,
  bubble: ViewPolygon,
  curve: ViewCurve,
  circle: ViewCircle,
  master: MasterView,
  comment: CommentView,
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
