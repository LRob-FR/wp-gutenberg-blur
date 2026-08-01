<?php
/**
 * Self-hosted plugin updater backed by the Forgejo Releases API.
 *
 * Mirrors the WordPress.org update flow by injecting our own update entry into
 * the update_plugins transient and answering the "View details" modal. The
 * release zip must be attached as an asset named "lrob-gutenberg-blur-X.Y.Z.zip"
 * (a properly structured archive — not the auto-generated source tarball, whose
 * folder is named after the commit hash and would install side-by-side instead
 * of updating).
 *
 * The API base is derived from LROB_BLUR_REPO_URL, so moving the repo to
 * another host/owner only means editing that one constant.
 *
 * Adapted from LRob - Email Toolkit.
 */

if (!defined('ABSPATH')) exit;

class LRob_Blur_Updater {

    // Back-off when the server is unreachable, so admin pages don't each pay a
    // connection timeout.
    const TRANSIENT_KEY      = 'lrob_blur_release_fail';
    const TRANSIENT_TTL_FAIL = 5 * MINUTE_IN_SECONDS;
    const PLUGIN_SLUG        = 'lrob-gutenberg-blur';

    /** Per-request memo — the filters below can both fire in a single request. */
    private static $release_memo = false;

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
            // than pointing WP at the source tarball (commit-hash folder name →
            // installs side-by-side instead of replacing).
            return $transient;
        }

        $update = (object) array(
            'slug'         => self::PLUGIN_SLUG,
            'plugin'       => LROB_BLUR_BASENAME,
            'new_version'  => $remote_version,
            'url'          => LROB_BLUR_REPO_URL,
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
            'homepage'      => LROB_BLUR_REPO_URL,
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

    /** Clear the "server unreachable" back-off so the next check retries immediately. */
    public static function flush_cache() {
        delete_transient(self::TRANSIENT_KEY);
        self::$release_memo = false;
    }

    /* ─── Internals ──────────────────────────────────────────────────── */

    private function get_release() {
        if (self::$release_memo !== false) {
            return self::$release_memo;
        }
        if (get_transient(self::TRANSIENT_KEY) === 'down') {
            return null;
        }

        $api_url = $this->api_url();
        if ($api_url === '') {
            return null;
        }

        $response = wp_remote_get($api_url, array(
            'timeout' => 5,
            'headers' => array(
                'Accept'     => 'application/json',
                'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . home_url(),
            ),
        ));

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            set_transient(self::TRANSIENT_KEY, 'down', self::TRANSIENT_TTL_FAIL);
            return self::$release_memo = null;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($body) || empty($body['tag_name'])) {
            set_transient(self::TRANSIENT_KEY, 'down', self::TRANSIENT_TTL_FAIL);
            return self::$release_memo = null;
        }

        return self::$release_memo = $body;
    }

    /** https://git.lrob.net/WP/gutenberg-blur → https://git.lrob.net/api/v1/repos/WP/gutenberg-blur/releases/latest */
    private function api_url() {
        $url = defined('LROB_BLUR_REPO_URL') ? LROB_BLUR_REPO_URL : '';
        if (!preg_match('#^(https?://[^/]+)/([^/]+/[^/]+?)/?$#', $url, $m)) {
            return '';
        }
        return $m[1] . '/api/v1/repos/' . $m[2] . '/releases/latest';
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
