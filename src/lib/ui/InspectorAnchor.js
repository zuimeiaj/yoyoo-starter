/**
 *  created by yaojun on 2018/12/23
 *
 */

import React, { Fragment } from 'react';
import NumberInput from './NumberInput';
import Icon from '../Icon';
import InspectorCard from './InspectorCard';
import Checkbox from './Checkbox';
import './InspectorAnchor.scss';
import Event from '../Base/Event';
import { component_active, component_drag, component_drag_before, component_properties_change } from '../util/actions';

export default class InspectorAnchor extends React.PureComponent {
  componentWillMount() {
    Event.listen(component_active, this.handleActive);
    Event.listen(component_drag);
  }
  componentDidMount() {
    this.props.target && this.handleActive(this.props.target);
  }

  handleActive = (target) => {
    this.target = target;
    let anchor = target.properties.anchor;
    const { enabled, top, left, bottom, right } = this.refs;
    enabled.setValue(anchor.enabled);
    top.setValue(anchor.top);
    bottom.setValue(anchor.bottom);
    right.setValue(anchor.right);
    left.setValue(anchor.left);
  };

  updateProps = (key, value, anchor) => {
    let pos = Object.assign({}, anchor);
    pos[key] = value;
    return pos;
  };

  onChange = (key, value) => {
    if (!this.target) return;

    let anchor = {};
    if (this.target.properties.isTemporaryGroup) {
      this.target.getItems().forEach((item) => {
        anchor[item.id] = this.updateProps(key, value, item.anchor);
      });
    } else {
      anchor = this.updateProps(key, value, this.target.properties.anchor);
    }

    Event.dispatch(component_properties_change, {
      key: 'anchor',
      value: anchor,
      target: this.target,
    });
  };

  componentWillUnmount() {
    Event.destroy(component_active, this.handleActive);
  }

  render() {
    return (
      <InspectorCard
        title={
          <Fragment>
            <Icon type={'QuXiaoGuDing'} /> 固定
          </Fragment>
        }
        className={'inspector-anchor'}
      >
        <Checkbox className={'anchor-enabled'} ref={'enabled'} onChange={(v) => this.onChange('enabled', v)} label={'启用固定'} />
        <div className={'item'}>
          <NumberInput ref={'top'} onChange={(v) => this.onChange('top', v)} label={<Icon type={'wenzidingbuduiqi'} />} />
          <NumberInput ref={'bottom'} onChange={(v) => this.onChange('bottom', v)} label={<Icon type={'wenzidibuduiqi'} />} />
        </div>
        <div className={'item'}>
          <NumberInput ref={'left'} onChange={(v) => this.onChange('left', v)} label={<Icon type={'ralign-left'} />} />
          <NumberInput ref={'right'} onChange={(v) => this.onChange('right', v)} label={<Icon type={'ralign-right'} />} />
        </div>
      </InspectorCard>
    );
  }
}
