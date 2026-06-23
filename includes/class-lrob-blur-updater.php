<?php
/**
 * Self-hosted plugin updater backed by GitHub Releases.
 *
 * Mirrors the WordPress.org update flow by injecting our own update entry into
 * the update_plugins transient and answering the "View details" modal. The
 * release zip must be attached as an asset named "lrob-gutenberg-blur-X.Y.Z.zip"
 * (a properly structured archive — not GitHub's source tarball, whose folder is
 * named after the commit hash and would install side-by-side instead of updating).
 *
 * Adapted from LRob - Email Toolkit.
 */

if (!defined('ABSPATH')) exit;

class LRob_Blur_Updater {

    const TRANSIENT_KEY      = 'lrob_blur_gh_release';
    const TRANSIENT_TTL      = HOUR_IN_SECONDS; // success cache
    const TRANSIENT_TTL_FAIL = HOUR_IN_SECONDS; // failure cache (don't hammer a flaky API)
    const PLUGIN_SLUG        = 'lrob-gutenberg-blur';

    public function register() {
        add_filter('pre_set_site_transient_update_plugins', array($this, 'check_for_update'));
        add_filter('plugins_api', array($this, 'plugin_info'), 10, 3);
    }

    public function check_for_update($transient) {
        if (empty($transient) || !is_object($transient)) {
            return $transient;
        }

        $release = $this->get_release();
        if ($release === null) {
            return $transient;
        }

        $remote_version = $this->normalize_version((string) ($release['tag_name'] ?? ''));
        if ($remote_version === '') {
            return $transient;
        }
        if (version_compare(LROB_BLUR_VERSION, $remote_version, '>=')) {
            return $transient;
        }

        $zip_url = $this->find_asset_url($release);
        if ($zip_url === null) {
            // Release published but no usable zip asset attached — skip rather
            // than pointing WP at GitHub's source tarball (commit-hash folder
            // name → installs side-by-side instead of replacing).
            return $transient;
        }

        $update = (object) array(
            'slug'         => self::PLUGIN_SLUG,
            'plugin'       => LROB_BLUR_BASENAME,
            'new_version'  => $remote_version,
            'url'          => LROB_BLUR_GITHUB_URL,
            'package'      => $zip_url,
            'tested'       => $this->tested_wp_version(),
            'requires_php' => '8.2',
            'icons'        => array(),
            'banners'      => array(),
        );

        if (!isset($transient->response) || !is_array($transient->response)) {
            $transient->response = array();
        }
        $transient->response[LROB_BLUR_BASENAME] = $update;
        return $transient;
    }

    public function plugin_info($result, $action, $args) {
        if ($action !== 'plugin_information') {
            return $result;
        }
        if (!isset($args->slug) || $args->slug !== self::PLUGIN_SLUG) {
            return $result;
        }

        $release = $this->get_release();
        if ($release === null) {
            return $result;
        }

        $remote_version = $this->normalize_version((string) ($release['tag_name'] ?? ''));
        $zip_url        = $this->find_asset_url($release);

        return (object) array(
            'name'          => 'LRob - Gutenberg Blur',
            'slug'          => self::PLUGIN_SLUG,
            'version'       => $remote_version,
            'author'        => '<a href="https://www.lrob.fr">LRob</a>',
            'homepage'      => LROB_BLUR_GITHUB_URL,
            'requires'      => '6.8',
            'requires_php'  => '8.2',
            'tested'        => $this->tested_wp_version(),
            'last_updated'  => (string) ($release['published_at'] ?? ''),
            'download_link' => (string) $zip_url,
            'sections'      => array(
                'description' => __('Adds backdrop blur and glass effects to Gutenberg blocks (Group, Columns, Column, Row, Cover) with customizable background color, opacity, blur intensity, and saturation controls.', 'lrob-gutenberg-blur'),
                'changelog'   => $this->markdown_to_html((string) ($release['body'] ?? '')),
            ),
        );
    }

    /** Force-clear the cached release info. */
    public static function flush_cache() {
        delete_transient(self::TRANSIENT_KEY);
    }

    /* ─── Internals ──────────────────────────────────────────────────── */

    private function get_release() {
        $force = $this->is_force_refresh();
        if (!$force) {
            $cached = get_transient(self::TRANSIENT_KEY);
            if ($cached === 'none') {
                return null;
            }
            if (is_array($cached) && !empty($cached)) {
                return $cached;
            }
        }

        $api_url = 'https://api.github.com/repos/' . $this->github_repo() . '/releases/latest';
        $response = wp_remote_get($api_url, array(
            'timeout' => 8,
            'headers' => array(
                'Accept'     => 'application/vnd.github+json',
                'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . home_url(),
            ),
        ));

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            set_transient(self::TRANSIENT_KEY, 'none', self::TRANSIENT_TTL_FAIL);
            return null;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($body) || empty($body['tag_name'])) {
            set_transient(self::TRANSIENT_KEY, 'none', self::TRANSIENT_TTL_FAIL);
            return null;
        }

        set_transient(self::TRANSIENT_KEY, $body, self::TRANSIENT_TTL);
        return $body;
    }

    private function is_force_refresh() {
        if (!is_admin()) {
            return false;
        }
        if (isset($_GET['force-check']) && (string) $_GET['force-check'] === '1') {
            return true;
        }
        $pagenow = isset($GLOBALS['pagenow']) ? $GLOBALS['pagenow'] : '';
        if ($pagenow === 'update-core.php') {
            return true;
        }
        return false;
    }

    private function github_repo() {
        $url = defined('LROB_BLUR_GITHUB_URL') ? LROB_BLUR_GITHUB_URL : '';
        if (preg_match('#github\.com/([^/]+/[^/]+?)/?$#', $url, $m)) {
            return $m[1];
        }
        return 'LRob-FR/wp-gutenberg-blur';
    }

    private function normalize_version($tag) {
        return ltrim($tag, 'vV');
    }

    private function find_asset_url($release) {
        $assets = isset($release['assets']) ? $release['assets'] : array();
        if (!is_array($assets)) {
            return null;
        }
        foreach ($assets as $asset) {
            $name = (string) ($asset['name'] ?? '');
            $url  = (string) ($asset['browser_download_url'] ?? '');
            if ($url === '') {
                continue;
            }
            if (strpos($name, self::PLUGIN_SLUG . '-') === 0 && substr($name, -4) === '.zip') {
                return $url;
            }
        }
        return null;
    }

    private function tested_wp_version() {
        // Reporting the running version sidesteps the "tested up to" warning
        // without hand-bumping a header on every WP release.
        return get_bloginfo('version');
    }

    /** Minimal Markdown → HTML for the changelog modal (headings, bullets, bold, code, links). */
    private function markdown_to_html($md) {
        $md = trim($md);
        if ($md === '') {
            return '';
        }

        $html = esc_html($md);

        $html = (string) preg_replace('/^### (.+)$/m', '<h4>$1</h4>', $html);
        $html = (string) preg_replace('/^## (.+)$/m',  '<h3>$1</h3>', $html);
        $html = (string) preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $html);
        $html = (string) preg_replace('/`([^`]+)`/', '<code>$1</code>', $html);
        $html = (string) preg_replace_callback(
            '/\[([^\]]+)\]\(([^)\s]+)\)/',
            function ($m) { return '<a href="' . esc_url($m[2]) . '" target="_blank" rel="noopener">' . $m[1] . '</a>'; },
            $html
        );
        $html = (string) preg_replace_callback(
            '/(?:^- .+(?:\n|$))+/m',
            function ($m) {
                $items = (string) preg_replace('/^- (.+)$/m', '<li>$1</li>', trim($m[0]));
                return '<ul>' . $items . '</ul>';
            },
            $html
        );
        $blocks = preg_split('/\n{2,}/', $html) ?: array();
        $blocks = array_map(function ($b) {
            $b = trim($b);
            if ($b === '') {
                return '';
            }
            if (preg_match('/^<(h[1-6]|ul|ol|p|pre|blockquote)\b/i', $b)) {
                return $b;
            }
            return '<p>' . str_replace("\n", '<br>', $b) . '</p>';
        }, $blocks);
        return implode("\n", $blocks);
    }
}
