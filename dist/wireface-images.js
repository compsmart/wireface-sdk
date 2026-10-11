/*! Wireface | Required Notice: Copyright 2026 Compsmart (https://wireface.dev) | Free for personal and commercial use under the Wireface SDK Licence; https://wireface.dev/license/ */
// One script tag. The adjacent SDK module and model assets load on demand.
// Use data-auto="false" for manual startup through WirefaceImages.animateImages().
(() => {
  const script = document.currentScript;
  const moduleURL = new URL('images.js', script.src).href;
  const module = import(moduleURL);
  const options = {};
  for (const key of ['selector', 'mood', 'assets']) if (script.dataset[key]) options[key] = script.dataset[key];
  for (const key of ['intensity', 'speed', 'fps', 'minSize', 'maxActive', 'maxFacesPerImage', 'moodSeed', 'scrollIdleDelay'])
    if (script.dataset[key] !== undefined) options[key] = Number(script.dataset[key]);
  for (const key of ['eyeTracking', 'eyeMovement', 'hoverExpressions', 'showMesh', 'observe', 'respectReducedMotion', 'hideOnScroll'])
    if (script.dataset[key] !== undefined) options[key] = script.dataset[key] !== 'false';
  const loaded = document.readyState === 'loading'
    ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true })) : Promise.resolve();
  const api = {
    controller: null,
    async animateImages(config = {}) { await loaded; return (await module).animateImages(config); },
    ready: Promise.all([module, loaded]).then(([sdk]) => {
      if (script.dataset.auto === 'false') return null;
      return api.controller = sdk.animateImages({
        onError: ({ image, error }) => console.warn('Wireface image skipped:', image, error), ...options,
      });
    }),
  };
  // Report script/model configuration errors without creating an unhandled rejection.
  api.ready.catch(error => console.error('Wireface Images:', error));
  window.WirefaceImages = api;
})();
