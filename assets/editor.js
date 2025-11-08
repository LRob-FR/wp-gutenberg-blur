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
        lrobBgColor: { type: 'string', default: '#000000' },
        lrobOpacityPct: { type: 'number', default: 10 },
        lrobBlurAmount: { type: 'number', default: 10 },
        lrobSaturationPct: { type: 'number', default: 100 },
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
  const { PanelBody, ToggleControl, RangeControl } = wp.components;
  const { InspectorControls, PanelColorSettings } = wp.blockEditor || wp.editor;

  const BlurPanel = (props) => {
    const { attributes, setAttributes } = props;
    const {
      lrobBlurEnabled, lrobBgColor, lrobOpacityPct, lrobBlurAmount, lrobSaturationPct
    } = attributes;

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
        })
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
      const className = [props.className, 'lrob-blur'].filter(Boolean).join(' ');
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

      const blur = clamp(attributes.lrobBlurAmount, 0, 25);
      const saturation = clamp(attributes.lrobSaturationPct, 0, 200);
      const opacityPct = clamp(attributes.lrobOpacityPct, 0, 100);
      const opacity = opacityPct / 100;
      const [r, g, b] = hexToRgb(attributes.lrobBgColor || '#000000');
      const rgba = `rgba(${r},${g},${b},${opacity})`;

      extraProps = extraProps || {};
      extraProps.className = ((extraProps.className || '') + ' lrob-blur').trim();

      const incoming = extraProps.style || {};
      extraProps.style = Object.assign({}, incoming, {
        '--lrob-blur': `${blur}px`,
        '--lrob-saturation': `${saturation}%`,
        '--lrob-bg-color': rgba,
        'backgroundColor': rgba,
      });

      return extraProps;
    }
  );
})(window.wp);
