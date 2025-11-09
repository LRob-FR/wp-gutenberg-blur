/**
 * Register custom attributes on supported blocks
 */
(function (wp) {
  const { hasSupport } = window.LRobBlur;

  wp.hooks.addFilter(
    'blocks.registerBlockType',
    'lrob/blur/attributes',
    function (settings, name) {
      if (!hasSupport(name)) return settings;
      settings.attributes = Object.assign({}, settings.attributes, {
        lrobBlurEnabled: { type: 'boolean', default: false },
        lrobEffectType: { type: 'string', default: 'blur' },
        lrobBgColor: { type: 'string', default: '#000000' },
        lrobOpacityPct: { type: 'number', default: 10 },
        lrobBlurAmount: { type: 'number', default: 10 },
        lrobSaturationPct: { type: 'number', default: 100 },
        lrobGlassBorderColor: { type: 'string', default: '#ffffff' },
        lrobGlassBorderOpacity: { type: 'number', default: 50 },
        lrobGlassShadowIntensity: { type: 'number', default: 70 },
        lrobGlassInnerGlow: { type: 'boolean', default: true },
        lrobGlassInnerGlowIntensity: { type: 'number', default: 30 },
        lrobGlassInnerGlowSize: { type: 'number', default: 20 },
        lrobGlassInnerGlowSpread: { type: 'number', default: 0 },
        lrobGlassLightSourceX: { type: 'number', default: 20 },
        lrobGlassLightSourceY: { type: 'number', default: 20 },
      });
      return settings;
    }
  );
})(window.wp);
