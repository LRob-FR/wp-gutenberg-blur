<?php
/**
 * Plugin Name: LRob - Gutenberg Blur
 * Plugin URI: https://www.lrob.fr/
 * Description: Adds backdrop blur effects to Gutenberg blocks (Group, Columns, Column, Row, Cover) with customizable background color, opacity, blur intensity, and saturation controls.
 * Version: 1.0.0
 * Author: LRob
 * Author URI: https://www.lrob.fr/
 * Text Domain: lrob-gutenberg-blur
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 6.8
 * Requires PHP: 8.2
 */

if (!defined('ABSPATH')) exit;

define('LROB_BLUR_VERSION', '1.0.0');
define('LROB_BLUR_PATH', plugin_dir_path(__FILE__));
define('LROB_BLUR_URL', plugin_dir_url(__FILE__));

class LRob_Gutenberg_Blur {
    private static $instance = null;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        add_action('enqueue_block_assets', array($this, 'enqueue_styles'));
        add_action('enqueue_block_editor_assets', array($this, 'enqueue_editor_assets'));
        add_filter('render_block', array($this, 'render_block_filter'), 10, 2);
    }

    public function load_textdomain() {
        load_plugin_textdomain('lrob-gutenberg-blur', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    public function enqueue_styles() {
        wp_enqueue_style(
            'lrob-blur-style',
            LROB_BLUR_URL . 'assets/style.css',
            array(),
            LROB_BLUR_VERSION
        );
    }

    public function enqueue_editor_assets() {
        wp_enqueue_script(
            'lrob-blur-editor',
            LROB_BLUR_URL . 'assets/editor.js',
            array('wp-blocks', 'wp-hooks', 'wp-element', 'wp-components', 'wp-compose', 'wp-data', 'wp-block-editor', 'wp-i18n'),
            LROB_BLUR_VERSION,
            true
        );

        wp_set_script_translations('lrob-blur-editor', 'lrob-gutenberg-blur', LROB_BLUR_PATH . 'languages');
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

        // Sanitize and clamp values
        $blur = max(0, min(25, intval($attrs['lrobBlurAmount'] ?? 10)));
        $saturation = max(0, min(200, intval($attrs['lrobSaturationPct'] ?? 100)));
        $opacity_pct = max(0, min(100, intval($attrs['lrobOpacityPct'] ?? 10)));
        $opacity = $opacity_pct / 100;

        $bg_color = isset($attrs['lrobBgColor']) ? sanitize_hex_color(trim($attrs['lrobBgColor'])) : '#000000';
        if (!$bg_color) {
            $bg_color = '#000000';
        }

        // Convert hex to rgba
        $rgb = $this->hex_to_rgb($bg_color);
        $rgba = sprintf('rgba(%d,%d,%d,%s)', $rgb[0], $rgb[1], $rgb[2],
            rtrim(rtrim(number_format($opacity, 3, '.', ''), '0'), '.'));

        $class = 'lrob-blur';

        // Build inline style
        $style = sprintf(
            '--lrob-blur:%dpx;--lrob-saturation:%d%%;--lrob-bg-color:%s;background-color:%s;',
            $blur,
            $saturation,
            esc_attr($rgba),
            esc_attr($rgba)
        );

        // Inject class and style
        if (preg_match('/^<([a-z0-9-]+)\s/i', $block_content)) {
            // Add class
            if (strpos($block_content, 'class="') !== false) {
                $block_content = preg_replace('/class="([^"]*)"/', 'class="$1 ' . esc_attr($class) . '"', $block_content, 1);
            } else {
                $block_content = preg_replace('/^<([a-z0-9-]+)/i', '<$1 class="' . esc_attr($class) . '"', $block_content, 1);
            }

            // Add style
            if (strpos($block_content, 'style="') !== false) {
                $block_content = preg_replace('/style="([^"]*)"/', 'style="$1 ' . esc_attr($style) . '"', $block_content, 1);
            } else {
                $block_content = preg_replace('/^<([a-z0-9-]+)/i', '<$1 style="' . esc_attr($style) . '"', $block_content, 1);
            }
        }

        return $block_content;
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
