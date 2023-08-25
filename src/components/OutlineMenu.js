/**
 *  created by yaojun on 2019/1/16
 *
 */
import React from 'react';
import IconText from '../lib/ui/IconText';
import PropTypes from 'prop-types';
import Event from '../lib/Base/Event';
import { context_mode_change } from '@/lib/util/actions';

export const menus = () => [
  {
    icon: 'pages',
    text: '页面',
    type: 'pages',
  },
  {
    icon: 'yaodian',
    text: '图层',
    type: 'coverage',
  },
  {
    icon: 'zujiankuLOGO',
    text: '组件',
    type: 'components',
  },
  {
    icon: 'tubiao',
    text: '图标',
    type: 'icons',
  },
<<<<<<< HEAD
];
=======
  {
    icon: 'tupiantujpg',
    text: '素材',
    type: 'assets',
  },
]
>>>>>>> ae9d685 (x)
export default class OutlineMenu extends React.Component {
  static propTypes = {
    onChange: PropTypes.func,
    selected: PropTypes.string,
  };
  state = {
    menus: menus(),
  };

  componentWillMount() {
    Event.listen(context_mode_change, this.handleModeChange);
  }

  componentWillUnmount() {
    Event.destroy(context_mode_change, this.handleModeChange);
  }

  handleModeChange = (type) => {
    let data;
    if (type == 'MASTER') {
      data = menus();
      data.splice(0, 1);
      data.splice(3, 1);
    } else {
      data = menus();
    }
    this.setState({ menus: data });
    this.props.onChange(type == 'MASTER' ? 'coverage' : 'pages');
  };

  render() {
    return (
      <ul className='root-layout-side-menu'>
        {this.state.menus.map((item) => {
          return (
            <li onClick={() => this.props.onChange(item.type)} key={item.icon}>
              <IconText className={item.type === this.props.selected ? 'selected' : ''} icon={item.icon}>
                {item.text}
              </IconText>
            </li>
          );
        })}
      </ul>
    );
  }
}
