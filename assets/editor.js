(function (wp) {
  const { __ } = wp.i18n;
  const allowedBlocks = ['core/group', 'core/columns', 'core/column', 'core/row', 'core/cover'];
  const hasSupport = (name) => allowedBlocks.indexOf(name) !== -1;

  // Register custom attributes on supported blocks
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

  // Helpers
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v || 0)));
  const hexToRgb = (hex) => {
    if (typeof hex !== 'string') return [0, 0, 0];
    const h = hex.trim();
    let m = h.match(/^#([0-9a-f]{3})$/i);
    if (m) {
      const s = m[1];
      return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
    }
    m = h.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const s = m[1];
      return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    }
    return [0, 0, 0];
  };

  // Inspector controls
  const el = wp.element.createElement;
  const { Fragment } = wp.element;
  const { PanelBody, ToggleControl, RangeControl, SelectControl } = wp.components;
  const { InspectorControls, PanelColorSettings } = wp.blockEditor || wp.editor;

  const BlurPanel = (props) => {
    const { attributes, setAttributes } = props;
    const {
      lrobBlurEnabled, lrobEffectType, lrobBgColor, lrobOpacityPct, lrobBlurAmount, lrobSaturationPct,
      lrobGlassBorderColor, lrobGlassBorderOpacity, lrobGlassShadowIntensity,
      lrobGlassInnerGlow, lrobGlassInnerGlowIntensity, lrobGlassInnerGlowSize, lrobGlassInnerGlowSpread,
      lrobGlassLightSourceX, lrobGlassLightSourceY
    } = attributes;

    const effectType = lrobEffectType || 'blur';
    const isGlass = effectType === 'glass';

    // Light source picker component
    const LightSourcePicker = () => {
      const lightX = clamp(lrobGlassLightSourceX !== undefined ? lrobGlassLightSourceX : 20, 0, 100);
      const lightY = clamp(lrobGlassLightSourceY !== undefined ? lrobGlassLightSourceY : 20, 0, 100);

      return el('div', {
        style: { marginBottom: '16px' }
      },
        el('label', {
          style: {
            display: 'block',
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: '500',
            textTransform: 'uppercase',
            color: '#1e1e1e'
          }
        }, __('Light Source Position', 'lrob-gutenberg-blur')),
        el('div', {
          ref: (node) => {
            if (!node) return;
            node._lrobSquare = node; // Store reference on the node itself
          },
          style: {
            position: 'relative',
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '4px',
            cursor: 'crosshair',
            border: '1px solid #ddd',
            userSelect: 'none'
          },
          onMouseDown: (e) => {
            e.preventDefault();
            const square = e.currentTarget;
            const rect = square.getBoundingClientRect(); // Cache rect immediately

            if (!rect || rect.width === 0 || rect.height === 0) {
              console.log('Invalid rect on mousedown');
              return;
            }

            const updatePosition = (clientX, clientY) => {
              const rawX = ((clientX - rect.left) / rect.width) * 100;
              const rawY = ((clientY - rect.top) / rect.height) * 100;
              const x = Math.max(0, Math.min(100, rawX));
              const y = Math.max(0, Math.min(100, rawY));

              setAttributes({
                lrobGlassLightSourceX: Math.round(x),
                lrobGlassLightSourceY: Math.round(y)
              });
            };

            // Update immediately on mousedown
            updatePosition(e.clientX, e.clientY);

            const onMouseMove = (moveEvent) => {
              moveEvent.preventDefault();
              updatePosition(moveEvent.clientX, moveEvent.clientY);
            };

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }
        },
          el('div', {
            style: {
              position: 'absolute',
              left: `${lightX}%`,
              top: `${lightY}%`,
              width: '12px',
              height: '12px',
              background: '#fff',
              border: '2px solid #000',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 10px rgba(255,255,255,0.8)',
              pointerEvents: 'none'
            }
          })
        ),
        el('p', {
          style: {
            fontSize: '11px',
            color: '#757575',
            marginTop: '8px'
          }
        }, __('Click or drag to set light source position', 'lrob-gutenberg-blur'))
      );
    };

    return el(
      InspectorControls,
      {},
      el(
        PanelBody,
        { title: __('Blur Effect', 'lrob-gutenberg-blur'), initialOpen: true },
        el(ToggleControl, {
          label: __('Enable Blur Effect', 'lrob-gutenberg-blur'),
          checked: !!lrobBlurEnabled,
          onChange: (v) => setAttributes({ lrobBlurEnabled: !!v }),
        }),
        !!lrobBlurEnabled && el(SelectControl, {
          label: __('Effect Type', 'lrob-gutenberg-blur'),
          value: effectType,
          options: [
            { label: __('Blur', 'lrob-gutenberg-blur'), value: 'blur' },
            { label: __('Glass', 'lrob-gutenberg-blur'), value: 'glass' }
          ],
          onChange: (v) => setAttributes({ lrobEffectType: v }),
        }),
        !!lrobBlurEnabled && el(PanelColorSettings, {
          title: __('Background Color', 'lrob-gutenberg-blur'),
          initialOpen: true,
          colorSettings: [
            {
              label: __('Background', 'lrob-gutenberg-blur'),
              value: lrobBgColor || '#000000',
              onChange: (color) => setAttributes({ lrobBgColor: color || '#000000' }),
            }
          ],
        }),
        !!lrobBlurEnabled && el(RangeControl, {
          label: __('Background Opacity (%)', 'lrob-gutenberg-blur'),
          value: clamp(lrobOpacityPct, 0, 100),
          onChange: (v) => setAttributes({ lrobOpacityPct: clamp(v, 0, 100) }),
          min: 0, max: 100, step: 1,
          help: __('Controls the opacity of the background color.', 'lrob-gutenberg-blur'),
        }),
        !!lrobBlurEnabled && el(RangeControl, {
          label: __('Blur Intensity (px)', 'lrob-gutenberg-blur'),
          value: clamp(lrobBlurAmount, 0, 25),
          onChange: (v) => setAttributes({ lrobBlurAmount: clamp(v, 0, 25) }),
          min: 0, max: 25, step: 1,
          help: __('Backdrop blur strength in pixels.', 'lrob-gutenberg-blur'),
        }),
        !!lrobBlurEnabled && el(RangeControl, {
          label: __('Saturation (%)', 'lrob-gutenberg-blur'),
          value: clamp(lrobSaturationPct, 0, 200),
          onChange: (v) => setAttributes({ lrobSaturationPct: clamp(v, 0, 200) }),
          min: 0, max: 200, step: 1,
          help: __('Backdrop saturation level (100% = neutral).', 'lrob-gutenberg-blur'),
        }),
        // Glass-specific controls inline
        !!lrobBlurEnabled && isGlass && el('hr', { style: { margin: '20px 0', borderTop: '1px solid #ddd' } }),
        !!lrobBlurEnabled && isGlass && el('h3', { style: { fontSize: '13px', fontWeight: '600', marginBottom: '12px' } }, __('Glass Effect Settings', 'lrob-gutenberg-blur')),
        !!lrobBlurEnabled && isGlass && el(PanelColorSettings, {
          title: __('Border Color', 'lrob-gutenberg-blur'),
          initialOpen: true,
          colorSettings: [
            {
              label: __('Border', 'lrob-gutenberg-blur'),
              value: lrobGlassBorderColor || '#ffffff',
              onChange: (color) => setAttributes({ lrobGlassBorderColor: color || '#ffffff' }),
            }
          ],
        }),
        !!lrobBlurEnabled && isGlass && el(RangeControl, {
          label: __('Border Opacity (%)', 'lrob-gutenberg-blur'),
          value: clamp(lrobGlassBorderOpacity !== undefined ? lrobGlassBorderOpacity : 50, 0, 100),
          onChange: (v) => setAttributes({ lrobGlassBorderOpacity: clamp(v, 0, 100) }),
          min: 0, max: 100, step: 1,
        }),
        !!lrobBlurEnabled && isGlass && el(RangeControl, {
          label: __('Shadow Intensity (%)', 'lrob-gutenberg-blur'),
          value: clamp(lrobGlassShadowIntensity !== undefined ? lrobGlassShadowIntensity : 70, 0, 100),
          onChange: (v) => setAttributes({ lrobGlassShadowIntensity: clamp(v, 0, 100) }),
          min: 0, max: 100, step: 1,
          help: __('Shadow uses background color', 'lrob-gutenberg-blur'),
        }),
        !!lrobBlurEnabled && isGlass && el(ToggleControl, {
          label: __('Inner Glow (Refraction)', 'lrob-gutenberg-blur'),
          checked: !!lrobGlassInnerGlow,
          onChange: (v) => setAttributes({ lrobGlassInnerGlow: !!v }),
        }),
        !!lrobBlurEnabled && isGlass && !!lrobGlassInnerGlow && el(RangeControl, {
          label: __('Glow Intensity (%)', 'lrob-gutenberg-blur'),
          value: clamp(lrobGlassInnerGlowIntensity !== undefined ? lrobGlassInnerGlowIntensity : 30, 0, 100),
          onChange: (v) => setAttributes({ lrobGlassInnerGlowIntensity: clamp(v, 0, 100) }),
          min: 0, max: 100, step: 1,
        }),
        !!lrobBlurEnabled && isGlass && !!lrobGlassInnerGlow && el(RangeControl, {
          label: __('Glow Size (px)', 'lrob-gutenberg-blur'),
          value: lrobGlassInnerGlowSize !== undefined ? lrobGlassInnerGlowSize : 20,
          onChange: (v) => setAttributes({ lrobGlassInnerGlowSize: Math.max(0, Number(v) || 0) }),
          min: 0, max: 200, step: 1,
          allowReset: true,
          resetFallbackValue: 20,
        }),
        !!lrobBlurEnabled && isGlass && !!lrobGlassInnerGlow && el(RangeControl, {
          label: __('Glow Spread (px)', 'lrob-gutenberg-blur'),
          value: lrobGlassInnerGlowSpread !== undefined ? lrobGlassInnerGlowSpread : 0,
          onChange: (v) => setAttributes({ lrobGlassInnerGlowSpread: Number(v) || 0 }),
          min: -100, max: 100, step: 1,
          help: __('Negative spreads inward', 'lrob-gutenberg-blur'),
          allowReset: true,
          resetFallbackValue: 0,
        }),
        !!lrobBlurEnabled && isGlass && !!lrobGlassInnerGlow && el(LightSourcePicker)
      )
    );
  };

  const withInspector = wp.compose.createHigherOrderComponent((BlockEdit) => {
    return (props) => {
      if (!hasSupport(props.name)) return el(BlockEdit, props);
      return el(Fragment, {}, el(BlockEdit, props), el(BlurPanel, props));
    };
  }, 'withInspector');
  wp.hooks.addFilter('editor.BlockEdit', 'lrob/blur/inspector', withInspector);

  // Live preview (editor): apply class + inline styles on the block wrapper
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

      // Add glass-specific styles
      if (effectType === 'glass') {
        const borderColor = a.lrobGlassBorderColor || '#ffffff';
        const [br, bg, bb] = hexToRgb(borderColor);
        const borderOpacity = clamp(a.lrobGlassBorderOpacity !== undefined ? a.lrobGlassBorderOpacity : 50, 0, 100) / 100;

        // Shadow uses background color
        const shadowIntensity = clamp(a.lrobGlassShadowIntensity !== undefined ? a.lrobGlassShadowIntensity : 70, 0, 100) / 100;

        // Calculate shadow offset INVERSE of light source
        const lightX = clamp(a.lrobGlassLightSourceX !== undefined ? a.lrobGlassLightSourceX : 20, 0, 100);
        const lightY = clamp(a.lrobGlassLightSourceY !== undefined ? a.lrobGlassLightSourceY : 20, 0, 100);
        const offsetX = Math.round((50 - lightX) * 0.4);
        const offsetY = Math.round((50 - lightY) * 0.4);

        // Calculate directional border lighting (0 = dark, 1 = bright)
        // Normalize light position to -1 to 1 range
        const lightDirX = (lightX - 50) / 50; // -1 (left) to 1 (right)
        const lightDirY = (lightY - 50) / 50; // -1 (top) to 1 (bottom)

        // Calculate intensity for each side (facing light = brighter)
        const topIntensity = Math.max(0, -lightDirY); // bright when light from top
        const rightIntensity = Math.max(0, lightDirX); // bright when light from right
        const bottomIntensity = Math.max(0, lightDirY); // bright when light from bottom
        const leftIntensity = Math.max(0, -lightDirX); // bright when light from left

        // Create directional borders using inset shadows
        const borderShadows = [
          `inset 0 1px 0 0 rgba(${br},${bg},${bb},${borderOpacity * (0.3 + topIntensity * 0.7)})`, // top
          `inset -1px 0 0 0 rgba(${br},${bg},${bb},${borderOpacity * (0.3 + rightIntensity * 0.7)})`, // right
          `inset 0 -1px 0 0 rgba(${br},${bg},${bb},${borderOpacity * (0.3 + bottomIntensity * 0.7)})`, // bottom
          `inset 1px 0 0 0 rgba(${br},${bg},${bb},${borderOpacity * (0.3 + leftIntensity * 0.7)})` // left
        ].join(', ');

        let boxShadow = `${offsetX}px ${offsetY}px 32px 0 rgba(${r},${g},${b},${shadowIntensity}), ${borderShadows}`;

        // Inner glow for refraction effect
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

  // Save-time: persist class + styles in the block HTML
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

      // Add glass-specific styles
      if (effectType === 'glass') {
        const borderColor = attributes.lrobGlassBorderColor || '#ffffff';
        const [br, bg, bb] = hexToRgb(borderColor);
        const borderOpacity = clamp(attributes.lrobGlassBorderOpacity !== undefined ? attributes.lrobGlassBorderOpacity : 50, 0, 100) / 100;

        // Shadow uses background color
        const shadowIntensity = clamp(attributes.lrobGlassShadowIntensity !== undefined ? attributes.lrobGlassShadowIntensity : 70, 0, 100) / 100;

        // Calculate shadow offset INVERSE of light source
        const lightX = clamp(attributes.lrobGlassLightSourceX !== undefined ? attributes.lrobGlassLightSourceX : 20, 0, 100);
        const lightY = clamp(attributes.lrobGlassLightSourceY !== undefined ? attributes.lrobGlassLightSourceY : 20, 0, 100);
        const offsetX = Math.round((50 - lightX) * 0.4);
        const offsetY = Math.round((50 - lightY) * 0.4);

        // Calculate directional border lighting
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

        // Inner glow for refraction effect
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
