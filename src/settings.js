const DEFAULTS = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-3.1-pro-preview',
  baseUrl: '',
};

export function loadSettings() {
  return {
    provider: GM_getValue('provider', DEFAULTS.provider),
    apiKey: GM_getValue('apiKey', DEFAULTS.apiKey),
    model: GM_getValue('model', DEFAULTS.model),
    baseUrl: GM_getValue('baseUrl', DEFAULTS.baseUrl),
  };
}

export function saveSettings({ provider, apiKey, model, baseUrl }) {
  if (provider !== undefined) GM_setValue('provider', provider);
  if (apiKey !== undefined) GM_setValue('apiKey', apiKey);
  if (model !== undefined) GM_setValue('model', model);
  if (baseUrl !== undefined) GM_setValue('baseUrl', baseUrl);
}
