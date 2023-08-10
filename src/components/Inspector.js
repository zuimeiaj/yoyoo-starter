/**
 *  created by yaojun on 2018/11/6
 *
 */
import React, { Component } from 'react';
import './Inspector.scss';
import Event from '../lib/Base/Event';
import { component_active, component_empty, component_inactive, component_properties_change } from '../lib/util/actions';
import {
  InspectorAlign,
  InspectorAnimation,
  InspectorBorder,
  InspectorCorner,
  InspectorFill,
  InspectorFont,
  InspectorFontContent,
  InspectorFontDecorator,
  InspectorFontStyle,
  InspectorInteraction,
  InspectorShadow,
  InspectorSpacing,
  InspectorTransform,
} from '../lib/ui/InspectorControls';
import { getFirstResponder } from '../lib/global/instance';
import Types from 'prop-types';
import deepEqual from 'fast-deep-equal';
import { Popover } from 'antd';
import Icon from '../lib/Icon';
import { mergeProps } from '../lib/util/helper';
import Collapse from '@/lib/ui/Collapse';

const getDefaultValues = () => {
  return {
    fontStyle: [],
    bg: 'rgba(255,255,255,1)',
    border: {
      width: 1,
      color: 'rgba(255,255,255,1)',
      style: 'solid',
    },
    align: {
      x: 'flex-start',
      y: 'flex-start',
    },
    icon: {
      data: '',
      content: '',
    },
    shadow: {
      offsetX: 0,
      offsetY: 0,
      spread: 0,
      blur: 0,
      color: 'rgba(255,255,255,1)',
    },
    spacing: {
      width: 0,
      height: 1,
    },
    corner: {
      topLeft: 0,
      topRight: 0,
      bottomLeft: 0,
      bottomRight: 0,
    },
    decorator: '',
    font: {
      color: 'rgba(255,255,255,0.8)',
      size: 14,
    },
  };
};
let DefaultValues = getDefaultValues();

class DynamicWrapper extends Component {
  static propTypes = {
    field: Types.string.isRequired,
    value: Types.any,
    onChange: Types.func,
  };

  shouldComponentUpdate(props) {
    return !deepEqual(props.value, this.props.value);
  }

  render() {
    let { value, field, onChange } = this.props;
    const DynamicControl = InspectorControls[field];
    return <DynamicControl onChange={onChange} field={field} value={value} key={field} />;
  }
}

class InspectorProps extends Component {
  state = {
    keys: [],
    visibles: {
      interactions: false,
      icon: false,
    },
  };
  target = null;

  componentWillMount() {
    Event.listen(component_active, this.onActive);
    Event.listen(component_inactive, this.handleInacive);
    Event.listen(component_empty, this.handleEmpty);
  }

  componentWillUnmount() {
    Event.destroy(component_active, this.onActive);
    Event.destroy(component_inactive, this.handleInacive);
    Event.destroy(component_empty, this.handleEmpty);
  }

  handleEmpty = () => {
    this.target = null;
    this.setState({ keys: [] });
  };
  handleInacive = () => {
    DefaultValues = getDefaultValues();
  };
  onActive = (target) => {
    this.target = target;
    let keys = Object.keys(target.properties);
    if (target.properties.isTemporaryGroup) {
      keys = Object.keys(Object.assign({}, ...target.getItems()));
      Object.assign(target.properties, DefaultValues);
    }
    keys = keys.filter((item) => InspectorControls[item]);
    let orderKeys = [];
    keys.forEach((item) => {
      orderKeys[Order[item]] = item;
    });
    orderKeys = orderKeys.filter((item) => !!item);
    this.setState({ keys: orderKeys });
  };
  handleChange = (key, value) => {
    let view = getFirstResponder();
    let values = value;
    if (view.properties.isTemporaryGroup) {
      values = {};
      view.getItems().forEach((item) => {
        if (key == 'transform') {
          let trans = Object.assign({}, view.properties.transform, value);
          let t = {
            x: trans.x + item._xPercent * trans.width,
            y: trans.y + item._yPercent * trans.height,
            width: item._wPercent * trans.width,
            height: item._hPercent * trans.height,
            rotation: item.transform.rotation,
          };
          values[item.id] = t;
        } else {
          values[item.id] = value;
        }
      });
    }
    Event.dispatch(component_properties_change, {
      key,
      target: view,
      value: values,
    });
    if (view.properties.isTemporaryGroup && key == 'transform') {
      DefaultValues[key] = Object.assign({}, view.properties.transform, value);
    } else {
      DefaultValues[key] = mergeProps(DefaultValues[key] || {}, value);
    }
    this.onActive(view);
  };
  handleCloseLayer = (key) => {
    this.toggleOverlay(key, false);
  };
  handleMouseEnter = (key) => {
    let visibles = this.state.visibles;
    visibles[key] = true;
    visibles[key == 'icon' ? 'interactions' : 'icon'] = false;
    this.setState({ visibles });
  };
  toggleOverlay = (key, value) => {
    let visibles = this.state.visibles;
    visibles[key] = value;
    this.setState({ visibles });
  };
  onOverlayToggleVisible = (key, value) => {
    const { interactions, icon } = this.state.visibles;
    if (value && (interactions || icon)) {
      this.setState({ visibles: { interactions: false, icon: false } });
    }
  };

  render() {
    if (this.state.keys.length == 0) return null;
    return (
      <div className={'root-layout-inspector'}>
        {this.state.keys.map((key) => {
          let item = LABELS[key];
          let isControlled = item[2] == 'controlled';
          let props = {};
          if (isControlled) {
            props.visible = this.state.visibles[key];
            props.onMouseEnter = () => this.handleMouseEnter(key);
          }
          props.onVisibleChange = (v) => this.onOverlayToggleVisible(key, v);
          return (
            <Popover
              overlayClassName={'ins-props-overlay'}
              {...props}
              title={
                <div>
                  {item[0]} {item[2] == 'controlled' && <Icon type={'guanbi'} onClick={() => this.handleCloseLayer(key)} />}
                </div>
              }
              key={key}
              trigger={Trigger[key] || 'hover'}
              placement={'bottom'}
              overlayStyle={{ maxWidth: 260 }}
              content={<DynamicWrapper onChange={this.handleChange} field={key} value={this.target.properties[key]} />}
            >
              <span className={'ins-props-item'}>
                <Icon type={item[1]} />
              </span>
            </Popover>
          );
        })}
      </div>
    );
  }
}

export default class RightLayout extends InspectorProps {
  render() {
    return (
      <div className={'root-layout-inspector_panel'}>
        {this.state.keys.map((key) => {
          return (
            <Collapse title={LABELS[key][0]}>
              <DynamicWrapper onChange={this.handleChange} field={key} value={this.target.properties[key]} />
            </Collapse>
          );
        })}
      </div>
    );
  }
}
const LABELS = {
  transform: ['位置', 'ziyoubianhuan'],
  shadow: ['阴影', '-'],
  border: ['边框', 'wubiankaung'],
  bg: ['填充', 'beijingyanse'],
  corner: ['圆角', 'iconfontdaojiaofangxing2'],
  icon: ['图标', 'favorite', 'controlled'],
  align: ['对齐', 'juzhongduiqi'],
  spacing: ['间距', 'xinggao1'],
  fontStyle: ['样式', 'xieti'],
  decorator: ['装饰', 'xiahuaxian'],
  font: ['字体', 'wenben1'],
  animations: ['动画', 'donghua'],
  interactions: ['交互', 'shoushidianji', 'controlled'],
};
const Trigger = {
  interactions: 'click',
  icon: 'click',
};
const InspectorControls = {
  transform: InspectorTransform,
  shadow: InspectorShadow,
  border: InspectorBorder,
  bg: InspectorFill,
  corner: InspectorCorner,
  icon: InspectorFontContent,
  align: InspectorAlign,
  spacing: InspectorSpacing,
  fontStyle: InspectorFontStyle,
  decorator: InspectorFontDecorator,
  font: InspectorFont,
  animations: InspectorAnimation,
  interactions: InspectorInteraction,
};
const Order = {
  transform: 1,
  border: 2,
  shadow: 3,
  corner: 4,
  bg: 5,
  font: 6,
  align: 7,
  fontStyle: 8,
  decorator: 9,
  spacing: 10,
  icon: 11,
  animations: 12,
  interactions: 13,
};
