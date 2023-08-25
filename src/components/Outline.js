/**
 *  created by yaojun on 2018/11/6
 *
 */
<<<<<<< HEAD
import React from 'react';
import './Outline.scss';
import OutlineMenu from './OutlineMenu';
import OutlineIcons from './OutlineIcons';
import OutlinePrefabs from './OutlinePrefabs';
import OutlinePages from './OutlinePages';
import OutlineCoverage from './OutlineCoverage';
import ClosablePanel from '@/components/Panel/ClosablePanel';
import MaterialPanel from '@/components/Panel/MaterialPanel';
import OutlineComopnents from '@/components/OutlineComponents';
import event from '@/lib/Base/Event';
import { context_outline_menu_change } from '@/lib/util/actions';
=======
import React from 'react'
import './Outline.scss'
import OutlineMenu from './OutlineMenu'
import OutlineIcons from './OutlineIcons'
import OutlinePrefabs from './OutlinePrefabs'
import OutlineAssets from './OutlineAssets'
import OutlinePages from './OutlinePages'
import OutlineCoverage from './OutlineCoverage'
import ClosablePanel from '@/components/Panel/ClosablePanel'
import MaterialPanel from '@/components/Panel/MaterialPanel'
import OutlineComopnents from '@/components/OutlineComponents'
import event from '@/lib/Base/Event'
import { context_outline_menu_change } from '@/lib/util/actions'
>>>>>>> ae9d685 (x)

const OutlineMaps = {
  icons: OutlineIcons,
  prefabs: OutlinePrefabs,
  pages: OutlinePages,
  coverage: OutlineCoverage,
  components: OutlineComopnents,
<<<<<<< HEAD
};
=======
  assets: OutlineAssets,
}
>>>>>>> ae9d685 (x)
const OutlinePanel = {
  prefabs: MaterialPanel,
};
export default class Outline extends React.Component {
  state = {
    selected: 'pages',
  };
  handleMenuChange = (view) => {
    event.dispatch(context_outline_menu_change, view);
    this.setState({ selected: view });
  };
  handleScroll = (e) => {
    let ele = e.target;
    let distance = ele.scrollHeight - ele.getBoundingClientRect().height - ele.scrollTop;
    if (distance < 5) {
      if (this.refs.content.onScrollBottom) {
        this.refs.content.onScrollBottom();
      }
    }
  };

  render() {
    const Current = OutlineMaps[this.state.selected];
    const Panel = OutlinePanel[this.state.selected];
    return (
      <div className={'root-layout-side'}>
        <OutlineMenu selected={this.state.selected} onChange={this.handleMenuChange} />
        <div onScroll={this.handleScroll} className={'root-layout-side-content'}>
          <Current ref={'content'} />
        </div>
        <ClosablePanel title={'素材'}>{Panel && <Panel />}</ClosablePanel>
      </div>
    );
  }
}
