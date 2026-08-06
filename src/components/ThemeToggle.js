/**
 *  created by yaojun on 2026/8/6
 *
 *  主题切换（右上角）：浅色 / 深色 / 跟随系统，默认跟随系统。
 *  - 写入 <html data-theme="light|dark">，样式全部走 CSS 变量（见 styles/theme.scss）
 *  - localStorage 'yoyoo-theme' 持久化用户选择；index.js 启动时已按此初始化（防闪烁）
 *  - 跟随系统模式：监听 matchMedia('(prefers-color-scheme: dark)') 变化实时切换
 */
import React from 'react';
import { Dropdown, Menu } from 'antd';

const THEME_KEY = 'yoyoo-theme';

const applyTheme = (mode) => {
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', mode === 'system' ? (systemDark ? 'dark' : 'light') : mode);
};

export default class ThemeToggle extends React.Component {
  state = { mode: localStorage.getItem(THEME_KEY) || 'system' };

  componentWillMount() {
    this._mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (this._mql && this._mql.addListener) this._mql.addListener(this.handleSystemChange);
  }

  componentWillUnmount() {
    if (this._mql && this._mql.removeListener) this._mql.removeListener(this.handleSystemChange);
  }

  // 跟随系统模式下系统主题变化 → 实时切换
  handleSystemChange = () => {
    if (this.state.mode === 'system') applyTheme('system');
  };

  handleMenuClick = ({ key }) => {
    this.setState({ mode: key });
    localStorage.setItem(THEME_KEY, key);
    applyTheme(key);
  };

  render() {
    const { mode } = this.state;
    const labelMap = { system: '跟随系统', light: '浅色', dark: '深色' };
    const iconMap = { system: '🌓', light: '☀️', dark: '🌙' };
    const menu = (
      <Menu onClick={this.handleMenuClick} selectedKeys={[mode]}>
        <Menu.Item key={'system'}>跟随系统</Menu.Item>
        <Menu.Item key={'light'}>浅色主题</Menu.Item>
        <Menu.Item key={'dark'}>深色主题</Menu.Item>
      </Menu>
    );
    return (
      <Dropdown overlay={menu} trigger={['click']} placement={'bottomRight'}>
        {/* 与其他头部操作项一致：图标在上、文字在下（header_action-item 自带 column 布局） */}
        <span
          className={'header_action-item'}
          style={{ cursor: 'pointer', color: 'var(--yoo-text-secondary)' }}
          title={`主题：${labelMap[mode]}`}
        >
          <span style={{ fontSize: 18, lineHeight: 1.4 }}>{iconMap[mode]}</span>
          <span>主题</span>
        </span>
      </Dropdown>
    );
  }
}
