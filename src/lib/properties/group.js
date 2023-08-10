import ViewProperties from './base';

export default class GroupProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'group';
    this.alias = '分组';
  }
}

export class BlockProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'block';
    this.alias = 'Block';
  }
}

export class MasterProperties extends ViewProperties {
  constructor() {
    super();
    this.type = 'master';
    this.alias = 'Master';
    this.masterId = '';
  }
}
