import React from 'react';
import './Search.scss';
import Icon from '../Icon';
import Types from 'prop-types';

export default class Search extends React.Component {
  static propTypes = {
    onSearch: Types.func,
    placeholder: Types.string,
    style: Types.object,
    className: Types.string,
  };

  handleKeyUp = (e) => {
    if (e.keyCode == 13) {
      this.props.onSearch(e.target.value.trim());
    }
  };

  render() {
    return (
      <span className={'aj-ui-search'}>
        <Icon type={'search'} />
        <input onKeyUp={this.handleKeyUp} placeholder={this.props.placeholder} data-event='ignore' />
      </span>
    );
  }
}
