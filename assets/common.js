/**
 * Common utilities shared across editor scripts
 */
(function (window) {
  window.LRobBlur = window.LRobBlur || {};

  window.LRobBlur.allowedBlocks = ['core/group', 'core/columns', 'core/column', 'core/row', 'core/cover'];

  window.LRobBlur.hasSupport = function (name) {
    return window.LRobBlur.allowedBlocks.indexOf(name) !== -1;
  };

  window.LRobBlur.clamp = function (v, min, max) {
    return Math.max(min, Math.min(max, Number(v || 0)));
  };

  window.LRobBlur.hexToRgb = function (hex) {
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
})(window);
