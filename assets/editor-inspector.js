/**
 * Inspector controls for blur effect settings
 */
(function (wp) {
  const { __ } = wp.i18n;
  const { hasSupport, clamp } = window.LRobBlur;
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
            node._lrobSquare = node;
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
            const rect = square.getBoundingClientRect();

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
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && el(SelectControl, {
          label: __('Effect Type', 'lrob-gutenberg-blur'),
          value: effectType,
          options: [
            { label: __('Blur', 'lrob-gutenberg-blur'), value: 'blur' },
            { label: __('Glass', 'lrob-gutenberg-blur'), value: 'glass' }
          ],
          onChange: (v) => setAttributes({ lrobEffectType: v }),
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && el(PanelColorSettings, {
          title: __('Background Color', 'lrob-gutenberg-blur'),
          colorSettings: [
            {
              value: lrobBgColor || '#000000',
              onChange: (v) => setAttributes({ lrobBgColor: v || '#000000' }),
              label: __('Color', 'lrob-gutenberg-blur'),
            },
          ],
        }),
        !!lrobBlurEnabled && el(RangeControl, {
          label: __('Background Opacity (%)', 'lrob-gutenberg-blur'),
          value: lrobOpacityPct !== undefined ? lrobOpacityPct : 10,
          onChange: (v) => setAttributes({ lrobOpacityPct: v }),
          min: 0,
          max: 100,
          step: 1,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && el(RangeControl, {
          label: __('Blur Amount (px)', 'lrob-gutenberg-blur'),
          value: lrobBlurAmount !== undefined ? lrobBlurAmount : 10,
          onChange: (v) => setAttributes({ lrobBlurAmount: v }),
          min: 0,
          max: 25,
          step: 1,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && el(RangeControl, {
          label: __('Saturation (%)', 'lrob-gutenberg-blur'),
          value: lrobSaturationPct !== undefined ? lrobSaturationPct : 100,
          onChange: (v) => setAttributes({ lrobSaturationPct: v }),
          min: 0,
          max: 200,
          step: 1,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && isGlass && el(PanelColorSettings, {
          title: __('Glass Border Color', 'lrob-gutenberg-blur'),
          colorSettings: [
            {
              value: lrobGlassBorderColor || '#ffffff',
              onChange: (v) => setAttributes({ lrobGlassBorderColor: v || '#ffffff' }),
              label: __('Border Color', 'lrob-gutenberg-blur'),
            },
          ],
        }),
        !!lrobBlurEnabled && isGlass && el(RangeControl, {
          label: __('Glass Border Opacity (%)', 'lrob-gutenberg-blur'),
          value: lrobGlassBorderOpacity !== undefined ? lrobGlassBorderOpacity : 50,
          onChange: (v) => setAttributes({ lrobGlassBorderOpacity: v }),
          min: 0,
          max: 100,
          step: 1,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && isGlass && el(RangeControl, {
          label: __('Glass Shadow Intensity (%)', 'lrob-gutenberg-blur'),
          value: lrobGlassShadowIntensity !== undefined ? lrobGlassShadowIntensity : 70,
          onChange: (v) => setAttributes({ lrobGlassShadowIntensity: v }),
          min: 0,
          max: 100,
          step: 1,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && isGlass && el(ToggleControl, {
          label: __('Enable Inner Glow', 'lrob-gutenberg-blur'),
          checked: lrobGlassInnerGlow !== undefined ? !!lrobGlassInnerGlow : true,
          onChange: (v) => setAttributes({ lrobGlassInnerGlow: !!v }),
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && isGlass && !!lrobGlassInnerGlow && el(RangeControl, {
          label: __('Inner Glow Intensity (%)', 'lrob-gutenberg-blur'),
          value: lrobGlassInnerGlowIntensity !== undefined ? lrobGlassInnerGlowIntensity : 30,
          onChange: (v) => setAttributes({ lrobGlassInnerGlowIntensity: v }),
          min: 0,
          max: 100,
          step: 1,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && isGlass && !!lrobGlassInnerGlow && el(RangeControl, {
          label: __('Inner Glow Size (px)', 'lrob-gutenberg-blur'),
          value: lrobGlassInnerGlowSize !== undefined ? lrobGlassInnerGlowSize : 20,
          onChange: (v) => setAttributes({ lrobGlassInnerGlowSize: v }),
          min: 0,
          max: 100,
          step: 1,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
        }),
        !!lrobBlurEnabled && isGlass && !!lrobGlassInnerGlow && el(RangeControl, {
          label: __('Inner Glow Spread (px)', 'lrob-gutenberg-blur'),
          value: lrobGlassInnerGlowSpread !== undefined ? lrobGlassInnerGlowSpread : 0,
          onChange: (v) => setAttributes({ lrobGlassInnerGlowSpread: v }),
          min: -50,
          max: 50,
          step: 1,
          help: __('Negative spreads inward', 'lrob-gutenberg-blur'),
          allowReset: true,
          resetFallbackValue: 0,
          __next40pxDefaultSize: true,
          __nextHasNoMarginBottom: true,
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
})(window.wp);
