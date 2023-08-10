/**
 *  created by yaojun on 2019/1/16
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import './EditViewList.scss';
import Icon from '../Icon';

export default class EditViewList extends React.Component {
  static propTypes = {
    onEdit: PropTypes.func,
    onDestroy: PropTypes.func,
    showEdit: PropTypes.bool,
  };
  static defaultProps = {
    onEdit: () => {},
    onDestroy: () => {},
    showEdit: true,
  };

  state = {
    list: [],
    selected: -1,
  };

  setValue(list, index = -1) {
    this.setState({ list, selected: index });
  }

  add(item) {
    item.id = Math.random()
      .toString()
      .slice(2);
    this.setValue(this.state.list.concat([item]), -1);
  }

  destroy(index) {
    let list = this.state.list.slice();
    list.splice(index, 1);
    this.setValue(list, -1);
    this.props.onDestroy(list);
  }

  handleEdit = (item, index) => {
    this.props.onEdit(item, index);
    this.setState({ selected: index });
  };

  render() {
    return (
      <ul>
        {this.state.list.map((item, index) => {
          return (
            <li className={'edit-view-item ' + (index == this.state.selected ? 'selected' : '')} key={item.id}>
              <span className={'edit-view-name'}>{item.alias}</span>

              {this.props.showEdit && <Icon onClick={() => this.handleEdit(item, index)} type={'edit'} />}
              <Icon onClick={() => this.destroy(index)} type={'shenqingzuofei'} />
            </li>
          );
        })}
      </ul>
    );
  }
}
