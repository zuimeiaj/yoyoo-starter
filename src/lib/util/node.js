/**
 *
 * @param {Array} group
 * @param {Array} selection - 当前选中的组件
 */
export const isGroup = (group, selection) => {
  let selectionMap = selectionToMap(selection);
  let gids = [];
  for (let i = 0; i < group.length; i += 1) {
    let node = group[i];
    let exist = selectionMap[node.id];
    if (exist) {
      gids.push(node.gid || Math.random());
    }
  }
  // 拥有不同的gid
  if (new Set(gids).size != 1) return false;

  for (let i = 0; i < group.length; i += 1) {
    let node = group[i];
    // 找到所有gid 的node，如果node不在selectionMap 中,则还有其他的节点
    if (node.gid == gids[0] && !selectionMap[node.id]) return false;
  }

  return true;
};

export const isTheSameParent = () => {};

/**
 *
 * @param {Array} selection - 当前选中的组件
 * @return {Map} - {key:id,value:id}
 */
export const selectionToMap = (selection) => {
  let result = {};
  for (let i = 0; i < selection.length; i += 1) {
    result[selection[i]] = selection[i];
  }
  return result;
};
