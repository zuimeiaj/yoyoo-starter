/**
 *  created by yaojun on 2018/12/1
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import './ContextMenu.scss';
import Event from '../Base/Event';
import { context_copy, context_paste, controllers_ready } from '../util/actions';

export default Config = {
  view: [
    {
      name: '复制',
      action: context_copy,
    },
    {
      name: '粘贴',
      action: context_paste,
    },
    {
      name: '',
    },
  ],
};
