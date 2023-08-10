const agent = navigator.userAgent.toLowerCase();

export const isMac = () => agent.indexOf('mac os') > -1;
