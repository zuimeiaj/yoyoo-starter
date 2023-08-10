/**
 *  created by yaojun on 2018/12/13
 *
 */

import React, { Fragment } from 'react';
import NumberInput from './NumberInput';
import './Transform.scss';
import InspectorCard from './InspectorCard';
import Icon from '../Icon';
import Event from '../Base/Event';
import { component_active, component_drag, component_properties_change } from '../util/actions';

export default class Transform extends React.PureComponent {
  componentWillMount() {
    Event.listen(component_active, this.handleActive);
    Event.listen(component_drag, this.onTransform);
  }
  handleActive = (target, options) => {
    this.onTransform(target, options);
    if (target.properties.settings.disableH) {
      this.refs.h.disabled(true);
    } else {
      this.refs.h.disabled(false);
    }
  };

  componentDidMount() {
    this.props.target && this.onTransform(this.props.target);
  }

  onTransform = (target, options = {}) => {
    if (options.from === 'TransformInspector') return;
    let { x, y, width, height, rotation } = target.properties.transform;
    this.refs.x.setValue(x);
    this.refs.y.setValue(y);
    this.refs.w.setValue(width);
    this.refs.h.setValue(height);
    this.refs.r.setValue(rotation);
  };

  componentWillUnmount() {
    Event.destroy(component_active, this.onTransform);
    Event.destroy(component_drag, this.onTransform);
  }

  updateProps = (key, value, transform) => {
    let t = Object.assign({}, transform);
    t[key] = value;
    return t;
  };

  /**
   * emit transform change
   * @param key
   * @param value
   */
  onChange = (key, value) => {
    if (!this.props.target) return;
    let transform = {};
    if (this.props.target.properties.isTemporaryGroup) {
      let t = Object.assign({}, this.props.target.properties.transform);
      t[key] = value;
      this.props.target.getItems().forEach((item) => {
        let x = t.x + item._xPercent * t.width;
        let y = t.y + item._yPercent * t.height;
        let w = item._wPercent * t.width;
        let h = item._hPercent * t.height;
        transform[item.id] = { x, y, width: w, height: h, rotation: item.rotation };
      });
    } else {
      transform = this.updateProps(key, value, this.props.target.properties.transform);
    }
    Event.dispatch(component_properties_change, {
      target: this.props.target,
      key: 'transform',
      value: transform,
      from: 'TransformInspector',
    });
  };

  render() {
    return (
      <InspectorCard
        title={
          <Fragment>
            <Icon type={'ziyoubianhuan'} /> 位置
          </Fragment>
        }
        className={'inspector-transform'}
      >
        <div className={'item'}>
          <NumberInput onChange={(v) => this.onChange('x', v)} ref={'x'} label={'X'} />
          <NumberInput onChange={(v) => this.onChange('y', v)} ref={'y'} label={'Y'} />
          <NumberInput onChange={(v) => this.onChange('width', v)} ref={'w'} label={'W'} />
          <NumberInput onChange={(v) => this.onChange('height', v)} ref={'h'} label={'H'} />
          <NumberInput onChange={(v) => this.onChange('rotation', v)} ref={'r'} label={'∠'} />
          <div style={{ width: '45%' }}></div>
        </div>
      </InspectorCard>
    );
  }
}
