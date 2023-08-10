const CANCHE_KEY = 'self_assets';
const globalSelfAssets = JSON.parse(localStorage.getItem(CANCHE_KEY) || '[]');

export const getSelfAssets = () => {
  return globalSelfAssets;
};
export const setSelfAssets = (list) => {
  localStorage.setItem(CANCHE_KEY, JSON.stringify(list));
};
