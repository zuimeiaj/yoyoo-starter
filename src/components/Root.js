/**
 *  created by yaojun on 2018/11/6
 *
 */
import React from 'react'
import './Root.scss'
import Header from './Header'
import Outline from './Outline'
import Editor from './Editor'
import { context_hide_color_picker, context_hide_menu, editor_cache_used } from '../lib/util/actions'
import Event from '../lib/Base/Event'
import { fetchUserInfo } from '../api/user'
import { getPageListFromStorage, saveToRemoteFromStorage } from '../lib/util/page'
import { message, Modal } from 'antd'
import { getQuery } from '../lib/util/helper'
import { context_mode_change } from '@/lib/util/actions'
import InspectorProps from './Inspector'

export default class Component extends React.Component {
  onClick = () => {
    Event.dispatch(context_hide_menu)
    Event.dispatch(context_hide_color_picker)
  }

  componentWillMount() {
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('online', this.handleOnline)
    window.NetworkConnected = true
  }

  handleOnline = () => {}
  handleOffline = () => {}

  componentWillReceiveProps(props) {}

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }

  render() {
    return (
      <div onClick={this.onClick} className={'root-layout'}>
        <Header />
        <div className={'root-layout-content'}>
          <Outline />
          <Editor />
          <InspectorProps />
        </div>
      </div>
    )
  }
}

class Footer extends React.Component {
  state = {
    length: 0,
  }

  componentWillMount() {
    Event.listen(editor_cache_used, this.handleUserCacheUsed)
    fetchUserInfo().then((res) => {
      this.setState({ length: res.data.size })
    })
  }

  componentWillUnmount() {
    Event.destroy(editor_cache_used, this.handleUserCacheUsed)
  }

  handleUserCacheUsed = (length) => {
    this.setState({ length })
  }

  render() {
    return <div className={'root-layout-footer'}>已使用：{(this.state.length / 1024 / 1024).toFixed(4)} MB</div>
  }
}
