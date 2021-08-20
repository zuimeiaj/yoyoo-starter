import React from 'react'
import PropTypes from 'prop-types'
import './iconfont.css'

export default class PresetIcons extends React.PureComponent {
  static propTypes = {
    type: PropTypes.string,
    saveRef: PropTypes.func,
  }

  componentDidMount() {
    let saveRef = this.props.saveRef
    saveRef && saveRef(this.refs.g)
  }

  render() {
    const { type } = this.props
    return <i ref={'g'} className={`preseticons ${type}`} />
  }
}

export class PresetIcon extends React.Component {
  static propTypes = {
    type: PropTypes.string,
    onClick: PropTypes.func,
  }

  static defaultProps = {
    onClick: () => {},
  }

  state = {
    type: '',
  }

  componentWillMount() {
    if (this.props.type) {
      this.setState({ type: this.props.type })
    }
  }

  setValue(type) {
    this.setState({ type })
  }

  render() {
    const { type } = this.state
    return <i onClick={this.props.onClick} className={`preseticons ${type}`} />
  }
}
