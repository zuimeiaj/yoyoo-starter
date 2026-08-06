import React from 'react';
import { render } from 'react-dom';
import Root from './components/Root';
import 'antd/dist/antd.min.css';
import './styles/base.scss';
import './styles/theme.scss';

// 主题初始化（避免首屏闪烁）：本地存储 > 跟随系统
const savedTheme = localStorage.getItem('yoyoo-theme');
const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-theme', savedTheme || (systemDark ? 'dark' : 'light'));

render(<Root />, document.getElementById('root'));
