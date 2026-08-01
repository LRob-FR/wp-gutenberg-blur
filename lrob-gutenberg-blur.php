<?php
/**
 * Plugin Name: LRob - Gutenberg Blur
 * Plugin URI: https://git.lrob.net/WP/gutenberg-blur/
 * Description: Adds backdrop blur effects to Gutenberg blocks (Group, Columns, Column, Row, Cover) with customizable background color, opacity, blur intensity, and saturation controls.
 * Version: 1.0.3
 * Author: LRob
 * Author URI: https://www.lrob.fr/
 * Update URI: https://git.lrob.net/WP/gutenberg-blur
 * Text Domain: lrob-gutenberg-blur
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 6.8
 * Requires PHP: 8.2
 */

if (!defined('ABSPATH')) exit;

define('LROB_BLUR_VERSION', '1.0.3');
define('LROB_BLUR_PATH', plugin_dir_path(__FILE__));
define('LROB_BLUR_URL', plugin_dir_url(__FILE__));
define('LROB_BLUR_BASENAME', plugin_basename(__FILE__));
define('LROB_BLUR_REPO_URL', 'https://git.lrob.net/WP/gutenberg-blur');
define('LROB_BLUR_ISSUES_URL', LROB_BLUR_REPO_URL . '/issues');

require_once LROB_BLUR_PATH . 'includes/class-lrob-blur-updater.php';

class LRob_Gutenberg_Blur {
    private static $instance = null;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private static $inline_css_printed = false;

    private function __construct() {
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        add_action('enqueue_block_assets', array($this, 'enqueue_canvas_style'));
        add_action('enqueue_block_editor_assets', array($this, 'enqueue_editor_assets'));
        add_filter('render_block', array($this, 'render_block_filter'), 10, 2);

        // Self-hosted updater. Registered in every context — wp-cron can
        // fire the update check from a frontend request when DISABLE_WP_CRON is set.
        (new LRob_Blur_Updater())->register();
    }

    public function load_textdomain() {
        load_plugin_textdomain('lrob-gutenberg-blur', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    /**
     * Load the stylesheet inside the block editor, including the iframed canvas.
     *
     * enqueue_block_editor_assets only reaches the editor's OUTER document, not
     * the canvas iframe where blocks actually render — so backdrop-filter (which
     * lives in style.css) was missing there: a glass block showed its inline
     * frame/shadow but no blur. enqueue_block_assets does reach the canvas.
     * Admin-gated so the frontend keeps getting the on-demand inline CSS from
     * render_block_filter() instead of loading this file on every page.
     */
    public function enqueue_canvas_style() {
        if (!is_admin()) {
            return;
        }
        wp_enqueue_style(
            'lrob-blur-style',
            LROB_BLUR_URL . 'assets/style.css',
            array(),
            LROB_BLUR_VERSION
        );
    }

    public function enqueue_editor_assets() {
        wp_enqueue_script(
            'lrob-blur-common',
            LROB_BLUR_URL . 'assets/common.js',
            array(),
            LROB_BLUR_VERSION,
            true
        );

        wp_enqueue_script(
            'lrob-blur-attributes',
            LROB_BLUR_URL . 'assets/editor-attributes.js',
            array('wp-blocks', 'wp-hooks', 'lrob-blur-common'),
            LROB_BLUR_VERSION,
            true
        );

        wp_enqueue_script(
            'lrob-blur-inspector',
            LROB_BLUR_URL . 'assets/editor-inspector.js',
            array('wp-element', 'wp-components', 'wp-compose', 'wp-block-editor', 'wp-i18n', 'lrob-blur-common', 'lrob-blur-attributes'),
            LROB_BLUR_VERSION,
            true
        );

        wp_enqueue_script(
            'lrob-blur-preview',
            LROB_BLUR_URL . 'assets/editor-preview.js',
            array('wp-element', 'wp-compose', 'lrob-blur-common', 'lrob-blur-attributes'),
            LROB_BLUR_VERSION,
            true
        );

        wp_enqueue_script(
            'lrob-blur-save',
            LROB_BLUR_URL . 'assets/editor-save.js',
            array('wp-hooks', 'lrob-blur-common', 'lrob-blur-attributes'),
            LROB_BLUR_VERSION,
            true
        );

        wp_set_script_translations('lrob-blur-inspector', 'lrob-gutenberg-blur', LROB_BLUR_PATH . 'languages');
    }

    /**
     * Base stylesheet, printed inline the first time a blur block is rendered.
     *
     * The frontend CSS can't be enqueued conditionally up front: a blur block may
     * live in an FSE template or template part (header/footer/template), which is
     * not part of $post->post_content and renders after wp_head(). Since render_block
     * fires for every blur block wherever it lives, we emit the (sub-1KB) stylesheet
     * inline once, on demand — no extra HTTP request, works everywhere.
     */
    private function maybe_inline_css() {
        if (self::$inline_css_printed) {
            return '';
        }
        self::$inline_css_printed = true;

        $css = @file_get_contents(LROB_BLUR_PATH . 'assets/style.css');
        if ($css === false || $css === '') {
            return '';
        }

        return '<style id="lrob-blur-inline-css">' . $css . '</style>';
    }

    public function render_block_filter($block_content, $block) {
        if (empty($block['blockName']) || empty($block['attrs'])) {
            return $block_content;
        }

        $supported_blocks = array('core/group', 'core/columns', 'core/column', 'core/row', 'core/cover');
        if (!in_array($block['blockName'], $supported_blocks, true)) {
            return $block_content;
        }

        $attrs = $block['attrs'];
        if (empty($attrs['lrobBlurEnabled'])) {
            return $block_content;
        }

        $effect_type = isset($attrs['lrobEffectType']) ? sanitize_text_field($attrs['lrobEffectType']) : 'blur';

        $blur = max(0, min(25, intval($attrs['lrobBlurAmount'] ?? 10)));
        $saturation = max(0, min(200, intval($attrs['lrobSaturationPct'] ?? 100)));
        $opacity_pct = max(0, min(100, intval($attrs['lrobOpacityPct'] ?? 10)));
        $opacity = $opacity_pct / 100;

        $bg_color = isset($attrs['lrobBgColor']) ? sanitize_hex_color(trim($attrs['lrobBgColor'])) : '#000000';
        if (!$bg_color) {
            $bg_color = '#000000';
        }

        $rgb = $this->hex_to_rgb($bg_color);
        $rgba = sprintf('rgba(%d,%d,%d,%s)', $rgb[0], $rgb[1], $rgb[2],
            rtrim(rtrim(number_format($opacity, 3, '.', ''), '0'), '.'));

        $class = 'lrob-blur';
        if ($effect_type === 'glass') {
            $class .= ' lrob-glass';
        }

        $style = sprintf(
            '--lrob-blur:%dpx;--lrob-saturation:%d%%;--lrob-bg-color:%s;background-color:%s;',
            $blur,
            $saturation,
            esc_attr($rgba),
            esc_attr($rgba)
        );

        if ($effect_type === 'glass') {
            $border_color = isset($attrs['lrobGlassBorderColor']) ? sanitize_hex_color(trim($attrs['lrobGlassBorderColor'])) : '#ffffff';
            if (!$border_color) $border_color = '#ffffff';
            $border_rgb = $this->hex_to_rgb($border_color);
            $border_opacity_pct = isset($attrs['lrobGlassBorderOpacity']) ? max(0, min(100, intval($attrs['lrobGlassBorderOpacity']))) : 50;
            $border_opacity = $border_opacity_pct / 100;

            $shadow_intensity_pct = isset($attrs['lrobGlassShadowIntensity']) ? max(0, min(100, intval($attrs['lrobGlassShadowIntensity']))) : 70;
            $shadow_intensity = $shadow_intensity_pct / 100;

            $light_x = isset($attrs['lrobGlassLightSourceX']) ? max(0, min(100, intval($attrs['lrobGlassLightSourceX']))) : 20;
            $light_y = isset($attrs['lrobGlassLightSourceY']) ? max(0, min(100, intval($attrs['lrobGlassLightSourceY']))) : 20;
            $offset_x = round((50 - $light_x) * 0.4);
            $offset_y = round((50 - $light_y) * 0.4);

            $light_dir_x = ($light_x - 50) / 50;
            $light_dir_y = ($light_y - 50) / 50;

            $top_intensity = max(0, -$light_dir_y);
            $right_intensity = max(0, $light_dir_x);
            $bottom_intensity = max(0, $light_dir_y);
            $left_intensity = max(0, -$light_dir_x);

            $border_shadows = array(
                sprintf('inset 0 1px 0 0 rgba(%d,%d,%d,%s)',
                    $border_rgb[0], $border_rgb[1], $border_rgb[2],
                    rtrim(rtrim(number_format($border_opacity * (0.3 + $top_intensity * 0.7), 3, '.', ''), '0'), '.')),
                sprintf('inset -1px 0 0 0 rgba(%d,%d,%d,%s)',
                    $border_rgb[0], $border_rgb[1], $border_rgb[2],
                    rtrim(rtrim(number_format($border_opacity * (0.3 + $right_intensity * 0.7), 3, '.', ''), '0'), '.')),
                sprintf('inset 0 -1px 0 0 rgba(%d,%d,%d,%s)',
                    $border_rgb[0], $border_rgb[1], $border_rgb[2],
                    rtrim(rtrim(number_format($border_opacity * (0.3 + $bottom_intensity * 0.7), 3, '.', ''), '0'), '.')),
                sprintf('inset 1px 0 0 0 rgba(%d,%d,%d,%s)',
                    $border_rgb[0], $border_rgb[1], $border_rgb[2],
                    rtrim(rtrim(number_format($border_opacity * (0.3 + $left_intensity * 0.7), 3, '.', ''), '0'), '.'))
            );

            $box_shadow = sprintf(
                '%dpx %dpx 32px 0 rgba(%d,%d,%d,%s), %s',
                $offset_x, $offset_y,
                $rgb[0], $rgb[1], $rgb[2],
                rtrim(rtrim(number_format($shadow_intensity, 3, '.', ''), '0'), '.'),
                implode(', ', $border_shadows)
            );

            if (!empty($attrs['lrobGlassInnerGlow'])) {
                $glow_intensity_pct = isset($attrs['lrobGlassInnerGlowIntensity']) ? max(0, min(100, intval($attrs['lrobGlassInnerGlowIntensity']))) : 30;
                $glow_intensity = $glow_intensity_pct / 100;
                $glow_size = isset($attrs['lrobGlassInnerGlowSize']) ? max(0, intval($attrs['lrobGlassInnerGlowSize'])) : 20;
                $glow_spread = isset($attrs['lrobGlassInnerGlowSpread']) ? intval($attrs['lrobGlassInnerGlowSpread']) : 0;

                $glow_offset_x = round((50 - $light_x) * 0.2);
                $glow_offset_y = round((50 - $light_y) * 0.2);

                $box_shadow .= sprintf(
                    ', inset %dpx %dpx %dpx %dpx rgba(255,255,255,%s)',
                    $glow_offset_x, $glow_offset_y, $glow_size, $glow_spread,
                    rtrim(rtrim(number_format($glow_intensity, 3, '.', ''), '0'), '.')
                );
            }

            $style .= sprintf('box-shadow:%s;', esc_attr($box_shadow));
        }

        if (preg_match('/^<([a-z0-9-]+)\s/i', $block_content)) {
            if (strpos($block_content, 'class="') !== false) {
                $block_content = preg_replace('/class="([^"]*)"/', 'class="$1 ' . esc_attr($class) . '"', $block_content, 1);
            } else {
                $block_content = preg_replace('/^<([a-z0-9-]+)/i', '<$1 class="' . esc_attr($class) . '"', $block_content, 1);
            }

            if (strpos($block_content, 'style="') !== false) {
                $block_content = preg_replace('/style="([^"]*)"/', 'style="$1 ' . esc_attr($style) . '"', $block_content, 1);
            } else {
                $block_content = preg_replace('/^<([a-z0-9-]+)/i', '<$1 style="' . esc_attr($style) . '"', $block_content, 1);
            }
        }

        return $this->maybe_inline_css() . $block_content;
    }

    private function hex_to_rgb($hex) {
        $rgb = array(0, 0, 0);

        if (preg_match('/^#([0-9a-f]{3})$/i', $hex, $m)) {
            $h = $m[1];
            $rgb = array(
                hexdec(str_repeat($h[0], 2)),
                hexdec(str_repeat($h[1], 2)),
                hexdec(str_repeat($h[2], 2))
            );
        } elseif (preg_match('/^#([0-9a-f]{6})$/i', $hex, $m)) {
            $h = $m[1];
            $rgb = array(
                hexdec(substr($h, 0, 2)),
                hexdec(substr($h, 2, 2)),
                hexdec(substr($h, 4, 2))
            );
        }

        return $rgb;
    }
}

LRob_Gutenberg_Blur::instance();
