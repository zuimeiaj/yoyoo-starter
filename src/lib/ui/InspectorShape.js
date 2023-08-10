/**
 *  created by yaojun on 2018/12/14
 *
 */

import React, { Fragment } from 'react';
import NumberInput from './NumberInput';
import ColorInput from './ColorInput';
import Select from './Select';
import './InspectorShape.scss';
import Button, { ButtonGroup } from './Button';
import Icon from '../Icon';
import InspectorCard from './InspectorCard';
import Event from '../Base/Event';
import { component_active, component_properties_change } from '../util/actions';

export default class InspectorShape extends React.PureComponent {
  componentWillMount() {
    Event.listen(component_active, this.onActive);
  }

  componentDidMount() {
    this.props.target && this.onActive(this.props.target);
  }

  onActive = (target) => {
    this.target = target;
    let properties = target.properties;
    //  选区，默认选择第一个
    if (target.properties.isTemporaryGroup) {
      properties = target.getItems();
    }
    let { border, corner, shadow, background } = properties.shapes;
    let {
      borderWidth,
      borderColor,
      borderType,
      bg,
      shadowType,
      shadowColor,
      circleType,
      borderRadius,
      borderTopLeft,
      borderTopRight,
      borderBottomLeft,
      borderBottomRight,
      shadowBlur,
      shadowSpread,
      shadowOffsetX,
      shadowOffsetY,
    } = this.refs;

    // Border
    borderWidth.setValue(border.width);
    borderColor.setValue(border.color);
    borderType.setValue(border.style);
    // Shadow
    bg.setValue(background);
    shadowBlur.setValue(shadow.blur);
    shadowSpread.setValue(shadow.spread);
    shadowOffsetX.setValue(shadow.offsetX);
    shadowOffsetY.setValue(shadow.offsetY);
    shadowType.setValue(shadow.type);
    shadowColor.setValue(shadow.color);
    // Corner
    if (corner.topLeft == corner.topRight && corner.topLeft == corner.bottomLeft && corner.topLeft == corner.bottomRight) {
      borderRadius.setValue(corner.topLeft);
      borderTopLeft.setValue(corner.topLeft);
      borderTopRight.setValue(corner.topLeft);
      borderBottomLeft.setValue(corner.topLeft);
      borderBottomRight.setValue(corner.topLeft);
    } else {
      borderTopLeft.setValue(corner.topLeft);
      borderTopRight.setValue(corner.topRight);
      borderBottomLeft.setValue(corner.bottomLeft);
      borderBottomRight.setValue(corner.bottomRight);
    }
    let status = corner.topLeft.toString().endsWith('%');

    borderTopLeft.disabled(status);
    borderTopRight.disabled(status);
    borderBottomLeft.disabled(status);
    borderBottomRight.disabled(status);
    borderRadius.disabled(status);
    circleType.setValue(status ? 'circle' : 'square');
  };

  updateProps = (namespace, key, value, shape) => {
    let shapes = Object.assign({}, shape);
    if (typeof value === 'undefined') {
      shapes[namespace] = key;
    } else {
      shapes[namespace] = Object.assign({}, shapes[namespace]);
      shapes[namespace][key] = value;
    }

    return shapes;
  };

  onChange = (namespace, key, value) => {
    if (!this.target) return;
    let shapes = null;
    if (this.target.properties.isTemporaryGroup) {
      shapes = {};
      this.target.getItems().forEach((item) => {
        let result = this.updateProps(namespace, key, value, item.shapes);
        shapes[item.id] = result;
      });
    } else {
      shapes = this.updateProps(namespace, key, value, this.target.properties.shapes);
    }
    Event.dispatch(component_properties_change, {
      target: this.target,
      key: 'shapes',
      value: shapes,
    });
  };

  onShapeTypeChange = (key) => {
    let status = false;
    if (key === 'circle') {
      status = true;

      this.onChange('corner', {
        topLeft: '50%',
        topRight: '50%',
        bottomLeft: '50%',
        bottomRight: '50%',
      });
    } else {
      this.onChange('corner', {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
      });
    }
    this.refs.borderTopLeft.disabled(status);
    this.refs.borderTopRight.disabled(status);
    this.refs.borderBottomLeft.disabled(status);
    this.refs.borderBottomRight.disabled(status);
    this.refs.borderRadius.disabled(status);
  };

  componentWillUnmount() {
    Event.destroy(component_active, this.onActive);
  }

  handleColorPreview = (key, value) => {
    console.log('preview');
    this.target.setColor(key, value);
  };

  render() {
    return (
      <InspectorCard
        title={
          <Fragment>
            <Icon type={'miaobian'} />
            外观
          </Fragment>
        }
        className={'inspector-control-shape'}
      >
        <div className={'item'}>
          <span className={'control-label'}>背景</span>
          <div className={'control-items'}>
            <ColorInput onChange={(v) => this.onChange('background', v)} onPreview={(v) => this.handleColorPreview('background', v)} ref={'bg'} />
          </div>
        </div>
        <div className={'item'}>
          <span className={'control-label'}>阴影</span>
        </div>
        <div className={'item'}>
          <span style={{ visibility: 'hidden' }} className={'control-label'}>
            模糊
          </span>
        </div>
        <div className={'item'}>
          <span className={'control-label'}>圆角</span>
        </div>
        <div className={'item'}>
          <span style={{ visibility: 'hidden' }} className={'control-label'}>
            圆角
          </span>
        </div>
      </InspectorCard>
    );
  }
}

export class InspectorLine extends React.Component {
  componentWillMount() {
    Event.listen(component_active, this.onActive);
  }

  onActive = (target) => {
    this.target = target;
    this.refs.bg.setValue(target.properties.lineColor);
  };

  handleColor = (value) => {
    Event.dispatch(component_properties_change, {
      target: this.target,
      key: 'lineColor',
      value,
    });
  };

  handleColorPreview = (v) => {
    this.target.setColor('lineColor', v);
  };

  componentWillUnmount() {
    this.target = null;
    Event.destroy(component_active, this.onActive);
  }

  render() {
    return (
      <InspectorCard title={'外观'}>
        <div className={'inspector_line-color'}>
          <span className={'control-label'}>背景</span>
          <div className={'control-items'}>
            <ColorInput onChange={this.handleColor} onPreview={this.handleColorPreview} ref={'bg'} />
          </div>
        </div>
      </InspectorCard>
    );
  }
}

class BorderAndBg extends React.Component {
  showBg = true;

  getKey() {
    return null;
  }

  getObject() {
    return {};
  }

  componentWillMount() {
    Event.listen(component_active, this.onActive);
  }

  onActive = (target) => {
    this.target = target;
    let { fill, stroke } = this.getObject();
    this.refs.bg.setValue(fill);
    this.refs.stroke.setValue(stroke);
  };

  handleColor = (key, value) => {
    Event.dispatch(component_properties_change, {
      target: this.target,
      key: this.getKey(),
      value: Object.assign({}, this.getObject(), { [key]: value }),
    });
  };

  handleColorPreview = (key, value) => {
    this.target.setColor(key, value);
  };

  componentWillUnmount() {
    this.target = null;
    Event.destroy(component_active, this.onActive);
  }

  render() {
    return (
      <InspectorCard title={'外观'}>
        <div className={'inspector_line-color'}>
          <span className={'control-label'}>边框</span>
          <div className={'control-items'}>
            <ColorInput onChange={(v) => this.handleColor('stroke', v)} onPreview={(v) => this.handleColorPreview('stroke', v)} ref={'stroke'} />
          </div>
        </div>
        <div style={{ display: this.showBg ? 'flex' : 'none' }} className={'inspector_line-color'}>
          <span className={'control-label'}>背景</span>
          <div className={'control-items'}>
            <ColorInput onChange={(v) => this.handleColor('fill', v)} onPreview={(v) => this.handleColorPreview('fill', v)} ref={'bg'} />
          </div>
        </div>
      </InspectorCard>
    );
  }
}
