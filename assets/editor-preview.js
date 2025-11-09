/**
 * Live preview styles in editor
 */
(function (wp) {
  const { hasSupport, clamp, hexToRgb } = window.LRobBlur;
  const el = wp.element.createElement;

  const withWrapperStyles = wp.compose.createHigherOrderComponent((BlockListBlock) => {
    return (props) => {
      if (!hasSupport(props.name)) return el(BlockListBlock, props);

      const a = props.attributes || {};
      if (!a.lrobBlurEnabled) return el(BlockListBlock, props);

      const effectType = a.lrobEffectType || 'blur';
      const blur = clamp(a.lrobBlurAmount, 0, 25);
      const saturation = clamp(a.lrobSaturationPct, 0, 200);
      const opacityPct = clamp(a.lrobOpacityPct, 0, 100);
      const opacity = opacityPct / 100;
      const [r, g, b] = hexToRgb(a.lrobBgColor || '#000000');
      const rgba = `rgba(${r},${g},${b},${opacity})`;

      const styleVars = {
        '--lrob-blur': `${blur}px`,
        '--lrob-saturation': `${saturation}%`,
        '--lrob-bg-color': rgba,
        'backgroundColor': rgba,
      };

      if (effectType === 'glass') {
        const borderColor = a.lrobGlassBorderColor || '#ffffff';
        const [br, bg, bb] = hexToRgb(borderColor);
        const borderOpacity = clamp(a.lrobGlassBorderOpacity !== undefined ? a.lrobGlassBorderOpacity : 50, 0, 100) / 100;

        const shadowIntensity = clamp(a.lrobGlassShadowIntensity !== undefined ? a.lrobGlassShadowIntensity : 70, 0, 100) / 100;

        const lightX = clamp(a.lrobGlassLightSourceX !== undefined ? a.lrobGlassLightSourceX : 20, 0, 100);
        const lightY = clamp(a.lrobGlassLightSourceY !== undefined ? a.lrobGlassLightSourceY : 20, 0, 100);
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

        if (a.lrobGlassInnerGlow) {
          const glowIntensity = clamp(a.lrobGlassInnerGlowIntensity !== undefined ? a.lrobGlassInnerGlowIntensity : 30, 0, 100) / 100;
          const glowSize = a.lrobGlassInnerGlowSize !== undefined ? Math.max(0, a.lrobGlassInnerGlowSize) : 20;
          const glowSpread = a.lrobGlassInnerGlowSpread !== undefined ? a.lrobGlassInnerGlowSpread : 0;

          const glowOffsetX = Math.round((50 - lightX) * 0.2);
          const glowOffsetY = Math.round((50 - lightY) * 0.2);

          boxShadow += `, inset ${glowOffsetX}px ${glowOffsetY}px ${glowSize}px ${glowSpread}px rgba(255,255,255,${glowIntensity})`;
        }

        styleVars['boxShadow'] = boxShadow;
      }

      const className = [props.className, 'lrob-blur', effectType === 'glass' ? 'lrob-glass' : ''].filter(Boolean).join(' ');
      const wrapperProps = Object.assign(
        {},
        props.wrapperProps || {},
        { style: Object.assign({}, (props.wrapperProps && props.wrapperProps.style) || {}, styleVars) }
      );

      return el(BlockListBlock, Object.assign({}, props, { className, wrapperProps }));
    };
  }, 'withWrapperStyles');

  wp.hooks.addFilter('editor.BlockListBlock', 'lrob/blur/wrapper', withWrapperStyles);
})(window.wp);
