import React from 'react';

export default class Countdown extends React.Component {
  state = {
    count: 60,
  };
  pending = false;
  handleClick = () => {
    if (this.state.count != 60 || this.pending) return;
    this.pending = true;
    this.props
      .onClick()
      .then(this.startTimer)
      .finally(() => {
        this.pending = false;
      });
  };
  startTimer = () => {
    this.timer = setInterval(this.countdown, 1000);
    this.countdown();
  };
  countdown = () => {
    if (this.state.count == 0) {
      clearInterval(this.timer);
      this.setState({ count: 60 });
      return;
    }
    this.setState({ count: this.state.count - 1 });
  };

  render() {
    return (
      <span className={this.props.className} onClick={this.handleClick}>
        {this.state.count == 60 ? '发送' : this.state.count + 's'}
      </span>
    );
  }
}
