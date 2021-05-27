/**
 *  created by yaojun on 2019/6/4
 *
 */
import React from 'react'
import Event from '../../lib/Base/Event'
import { context_mode_change, context_save } from '@/lib/util/actions'
import { getQuery } from '@/lib/util/helper'
import { setCurrentPage } from '@/lib/global/instance'

class BackToProject extends React.Component {
  state = {
    show: !!getQuery().m,
  }

  componentWillMount() {
    Event.listen(context_mode_change, this.handleShow)
  }

  componentWillUnmount() {
    Event.destroy(context_mode_change, this.handleShow)
  }

  handleShow = (type) => {
    this.setState({ show: type == 'MASTER' })
  }
  handleBack = () => {
    setCurrentPage(null)
    Event.dispatch(context_save)
    this.props.history.replace('/app?p=' + getQuery().p)
  }

  render() {
    if (!this.state.show) return null
    return (
      <div className={'back-backspace'} onClick={this.handleBack}>
        返回工作区
      </div>
    )
  }
}

export default BackToProject
