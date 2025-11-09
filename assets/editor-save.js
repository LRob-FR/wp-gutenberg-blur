/**
 * Save-time HTML generation with inline styles
 */
(function (wp) {
  const { hasSupport, clamp, hexToRgb } = window.LRobBlur;

  wp.hooks.addFilter(
    'blocks.getSaveContent.extraProps',
    'lrob/blur/save/props',
    function (extraProps, blockType, attributes) {
      if (!hasSupport(blockType.name)) return extraProps;
      if (!attributes || !attributes.lrobBlurEnabled) return extraProps;

      const effectType = attributes.lrobEffectType || 'blur';
      const blur = clamp(attributes.lrobBlurAmount, 0, 25);
      const saturation = clamp(attributes.lrobSaturationPct, 0, 200);
      const opacityPct = clamp(attributes.lrobOpacityPct, 0, 100);
      const opacity = opacityPct / 100;
      const [r, g, b] = hexToRgb(attributes.lrobBgColor || '#000000');
      const rgba = `rgba(${r},${g},${b},${opacity})`;

      extraProps = extraProps || {};
      extraProps.className = ((extraProps.className || '') + ' lrob-blur' + (effectType === 'glass' ? ' lrob-glass' : '')).trim();

      const incoming = extraProps.style || {};
      const newStyles = {
        '--lrob-blur': `${blur}px`,
        '--lrob-saturation': `${saturation}%`,
        '--lrob-bg-color': rgba,
        'backgroundColor': rgba,
      };

      if (effectType === 'glass') {
        const borderColor = attributes.lrobGlassBorderColor || '#ffffff';
        const [br, bg, bb] = hexToRgb(borderColor);
        const borderOpacity = clamp(attributes.lrobGlassBorderOpacity !== undefined ? attributes.lrobGlassBorderOpacity : 50, 0, 100) / 100;

        const shadowIntensity = clamp(attributes.lrobGlassShadowIntensity !== undefined ? attributes.lrobGlassShadowIntensity : 70, 0, 100) / 100;

        const lightX = clamp(attributes.lrobGlassLightSourceX !== undefined ? attributes.lrobGlassLightSourceX : 20, 0, 100);
        const lightY = clamp(attributes.lrobGlassLightSourceY !== undefined ? attributes.lrobGlassLightSourceY : 20, 0, 100);
        const offsetX = Math.round((50 - lightX) * 0.4);
        const offsetY = Math.round((50 - lightY) * 0.4);

        const lightDirX = (lightX - 50) / 50;
        const lightDirY = (lightY - 50) / 50;

        const topIntensity = Math.max(0, -lightDirY);
        const rightIntensity = Math.max(0, lightDirX);
        const bottomIntensity = Math.max(0, lightDirY);
        const leftIntensity = Math.max(0, -lightDirX);

        const borderShadows = [
          `inset 0 1px 0 0 rgba(${br},${bg},${bb},${borderOpacity * (0.3 + topIntensity * 0.7)})`,
          `inset -1px 0 0 0 rgba(${br},${bg},${bb},${borderOpacity * (0.3 + rightIntensity * 0.7)})`,
          `inset 0 -1px 0 0 rgba(${br},${bg},${bb},${borderOpacity * (0.3 + bottomIntensity * 0.7)})`,
          `inset 1px 0 0 0 rgba(${br},${bg},${bb},${borderOpacity * (0.3 + leftIntensity * 0.7)})`
        ].join(', ');

        let boxShadow = `${offsetX}px ${offsetY}px 32px 0 rgba(${r},${g},${b},${shadowIntensity}), ${borderShadows}`;

        if (attributes.lrobGlassInnerGlow) {
          const glowIntensity = clamp(attributes.lrobGlassInnerGlowIntensity !== undefined ? attributes.lrobGlassInnerGlowIntensity : 30, 0, 100) / 100;
          const glowSize = attributes.lrobGlassInnerGlowSize !== undefined ? Math.max(0, attributes.lrobGlassInnerGlowSize) : 20;
          const glowSpread = attributes.lrobGlassInnerGlowSpread !== undefined ? attributes.lrobGlassInnerGlowSpread : 0;

          const glowOffsetX = Math.round((50 - lightX) * 0.2);
          const glowOffsetY = Math.round((50 - lightY) * 0.2);

          boxShadow += `, inset ${glowOffsetX}px ${glowOffsetY}px ${glowSize}px ${glowSpread}px rgba(255,255,255,${glowIntensity})`;
        }

        newStyles['boxShadow'] = boxShadow;
      }

      extraProps.style = Object.assign({}, incoming, newStyles);

      return extraProps;
    }
  );
})(window.wp);
