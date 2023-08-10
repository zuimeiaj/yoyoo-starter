/**
 *  created by yaojun on 2019/1/26
 *
 */
import React from 'react';
import Poplist, { Menu, MenuItem } from '../lib/ui/Poplist';
import Icon from '../lib/Icon';
import { getFirstResponder } from '../lib/global/instance';
import Event from '../lib/Base/Event';
import { component_active, component_inactive, coverage_back, coverage_backward, coverage_forward, coverage_front } from '../lib/util/actions';
import { getFormatShortcutsWithAction, KeyboardActionNameMap } from '../lib/service/KeyboradHandler';
import IconText from '@/lib/ui/IconText';

const CoverageActions = [
  {
    action: coverage_forward,
    label: (
      <span>
        <Icon type={'icon-test2'} />
        上移一层
      </span>
    ),
    extra: getFormatShortcutsWithAction(KeyboardActionNameMap.COVERAGE_FORWARD),
  },
  {
    action: coverage_backward,
    label: (
      <span>
        <Icon type={'icon-test3'} />
        下移一层
      </span>
    ),
    extra: getFormatShortcutsWithAction(KeyboardActionNameMap.COVERAGE_BACKWARD),
  },
  {
    action: coverage_front,
    label: (
      <span>
        <Icon type={'icon-test1'} />
        置为顶层
      </span>
    ),
    extra: getFormatShortcutsWithAction(KeyboardActionNameMap.COVERAGE_FRONT),
  },
  {
    action: coverage_back,
    label: (
      <span>
        <Icon type={'icon-test4'} />
        置为底层
      </span>
    ),
    extra: getFormatShortcutsWithAction(KeyboardActionNameMap.COVERAGE_BACK),
  },
];

class ActionWrapper extends React.Component {
  state = {
    disabled: true,
  };

  componentWillMount() {
    Event.listen(component_active, this.handleActive);
    Event.listen(component_inactive, this.handleInactive);
  }

  componentWillUnmount() {
    Event.destroy(component_active, this.handleActive);
    Event.destroy(component_inactive, this.handleInactive);
  }

  handleActive = () => {
    this.setState({ disabled: false });
    this.handleChange(false);
  };
  handleInactive = () => {
    this.setState({ disabled: true });
    this.handleChange(true);
  };
  handleChange = (disabled) => {
    this.props.onChange(disabled);
  };

  render() {
    return (
      <IconText className={`header_action-item_sub ${this.state.disabled ? 'disabled' : ''}`} icon={'moban'}>
        图层
      </IconText>
    );
  }
}

export default class HeaderCoverage extends React.Component {
  handleClick = (action) => {
    if (this.disabled === false) Event.dispatch(action);
  };

  render() {
    return (
      <span className={'header_action-item'}>
        <Poplist
          overlay={
            <Menu onClick={this.handleClick} style={{ width: 200 }}>
              {() =>
                CoverageActions.map((item) => {
                  const disabled = getFirstResponder();
                  return <MenuItem disabled={!disabled} key={item.action} action={item.action} label={item.label} extra={item.extra} />;
                })
              }
            </Menu>
          }
        >
          <ActionWrapper onChange={(disabled) => (this.disabled = disabled)} />
        </Poplist>
      </span>
    );
  }
}
