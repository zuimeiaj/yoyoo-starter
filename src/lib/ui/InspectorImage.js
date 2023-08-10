/**
 *  created by yaojun on 2018/12/23
 *
 */

import React, { Fragment } from 'react';
import Select from './Select';
import './InspectorImage.scss';
import InspectorCard from './InspectorCard';
import Icon from '../Icon';
import Event from '../Base/Event';
import { component_active, component_properties_change } from '../util/actions';
import { IMAGE_MODE_FILL, IMAGE_MODE_SCALE, IMAGE_MODE_STRETCH } from './Image';
import { Dropable } from './NativeDragDrop';
import Image from './Image';
import { DEFAULT_IMG } from '../util/helper';

export default class InspectorImage extends React.PureComponent {
  state = {
    img: '',
    mode: IMAGE_MODE_STRETCH,
  };

  componentWillMount() {
    Event.listen(component_active, this.handleActive);
  }
  componentDidMount() {
    this.props.target && this.handleActive(this.props.target);
  }

  componentWillUnmount() {
    Event.destroy(component_active, this.handleActive);
  }

  handleActive = (target) => {
    this.target = target;
    let { fill, source } = target.properties.image;
    this.refs.scale.setValue(fill);
    this.setState({ img: source, mode: fill });
  };

  handleChange = (k, v) => {
    let value = Object.assign({}, this.target.properties.image);
    value[k] = v;
    Event.dispatch(component_properties_change, {
      target: this.target,
      key: 'image',
      value,
    });
    if (k === 'fill') {
      this.setState({ mode: v });
    }
  };

  handleImageDrop = (data) => {
    if (data.type === 'image' && data.data) {
      this.handleChange('source', data.data);
      this.setState({ img: data.data });
    }
  };

  render() {
    return (
      <InspectorCard
        title={
          <Fragment>
            <Icon type={'tupiancopy'} /> 图片
          </Fragment>
        }
        className={'inspector-image'}
      >
        <div className={'item'}>
          <div className={'control-label'}>填充</div>
          <div className={'control-items'}>
            <Select
              onChange={(v) => this.handleChange('fill', v)}
              ref={'scale'}
              options={[
                { label: '缩放', key: IMAGE_MODE_SCALE },
                {
                  label: '裁剪',
                  key: IMAGE_MODE_FILL,
                },
                { label: '拉伸', key: IMAGE_MODE_STRETCH },
              ]}
            />
          </div>
        </div>
        <div className={'item'}>
          <div className={'control-label'}>图片</div>
          <div className={'control-items'}>
            <Dropable onDrop={this.handleImageDrop}>
              <div className={'ins-image_drop-image'}>
                <Image style={{ pointerEvents: 'none' }} mode={this.state.mode} src={this.state.img || DEFAULT_IMG} />
              </div>
              <div className={'ins-image_drop-tips'}>从素材库中拖拽图片到此</div>
            </Dropable>
          </div>
        </div>
      </InspectorCard>
    );
  }
}
