# LRob - Gutenberg Blur

A lightweight WordPress plugin that adds backdrop blur effects to Gutenberg blocks.

## Features

- **Backdrop Blur Effects**: Apply blur effects to Group, Columns, Column, Row, and Cover blocks
- **Glass Effect Mode**: Advanced glassmorphism with realistic lighting (industry-first for WordPress)
  - Dynamic light source positioning
  - Directional border illumination responding to light angle
  - Physically-accurate shadow placement (inverse of light source)
  - Inner glow refraction effect with customizable size and spread
  - Full control over border color, opacity, and shadow intensity
- **Customizable Controls**:
  - Background color picker
  - Opacity control (0-100%)
  - Blur intensity (0-25px)
  - Saturation adjustment (0-200%)
- **Live Preview**: See changes instantly in the block editor
- **Frontend Parity**: Editor appearance matches frontend exactly
- **Multilingual Ready**: Full i18n support (English + French included)

## Prerequisite

- **WordPress Version**: 6.8+
- **PHP Version**: 8.2+
- **Gutenberg**: Block editor enabled

## Installation

1. Download the latest release ZIP
2. Upload to WordPress via Plugins → Add New → Upload Plugin
3. Activate the plugin
4. Edit any page and select a supported block to see the "Blur Effect" panel

## Usage

1. Create or edit a page in the block editor
2. Add a supported block (Group, Columns, Column, Row, or Cover)
3. In the block sidebar, find the **"Blur Effect"** panel
4. Toggle **"Enable Blur Effect"**
5. Choose effect type:
   - **Blur**: Standard backdrop blur effect
   - **Glass**: Advanced glassmorphism with lighting
6. Customize basic settings:
   - **Background Color**: Choose your color
   - **Background Opacity**: Adjust transparency (0-100%)
   - **Blur Intensity**: Set blur strength (0-25px)
   - **Saturation**: Control color saturation (0-200%)
7. For Glass Effect, additional controls:
   - **Border Color & Opacity**: Customize edge illumination
   - **Light Source Position**: Control X/Y coordinates for realistic lighting
   - **Shadow Intensity**: Adjust shadow strength
   - **Inner Glow**: Toggle refraction effect with size and spread controls

## Development

### Building a Release

Requirements:
- PHP CLI
- WP-CLI
- gettext (msgfmt)
- zip

```bash
# Install dependencies (Fedora/RHEL)
sudo dnf install php-cli php-mbstring wp-cli gettext zip

# Build release
cd lrob-gutenberg-blur/
./release.sh
```

The script will:
1. Generate translation template (.pot)
2. Compile translations (.po → .mo)
3. Create a clean ZIP in `../releases/`

### Translation

The plugin is translation-ready with English as the default language.

**Included translations:**
- French (fr_FR)
- Spanish (es_ES)
- Italian (it_IT)
- German (de_DE)
- Portuguese (pt_PT)
- Dutch (nl_NL)
- Polish (pl_PL)

**Adding a new language:**

```bash
# Create translation file
cp languages/lrob-gutenberg-blur-fr_FR.po languages/lrob-gutenberg-blur-es_ES.po

# Edit and translate
nano languages/lrob-gutenberg-blur-es_ES.po

# Build release (automatically compiles all .po files)
./release.sh
```

## Technical Details

- **Text Domain**: `lrob-gutenberg-blur`
- **Supported Blocks**: core/group, core/columns, core/column, core/row, core/cover
- **CSS Variables**: `--lrob-blur`, `--lrob-saturation`, `--lrob-bg-color`
- **Browser Compatibility**: Modern browsers with backdrop-filter support

## Support

For support, please [open an issue](https://github.com/LRob-FR/wp-gutenberg-blur/issues) or [contact LRob directly](https://www.lrob.fr/contact/)

## Credits

**Developed by [LRob, Hébergeur web spécialiste WordPress](https://www.lrob.fr/)**

## License

LRob - Gutenberg Blur
Copyright (c) 2025 LRob

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, see <https://www.gnu.org/licenses/>.

For more details, see [https://www.gnu.org/licenses/gpl-2.0.html](https://www.gnu.org/licenses/gpl-2.0.html).

## Changelog

### 1.0.0
- Initial release
- Backdrop blur effects for Gutenberg blocks
- **Glass effect mode with advanced glassmorphism** (WordPress industry-first)
  - Dynamic light source positioning with real-time shadow calculation
  - Directional border illumination responding to light angle
  - Inner glow refraction effect
  - Customizable border color, opacity, and shadow intensity
- Customizable background color, opacity, blur, and saturation
- Translations: English, French, Spanish, Italian, German, Portuguese, Dutch, Polish
- Live preview in block editor
- Frontend/editor parity

### 1.0.1
#### Optimization
- Frontend now loads only CSS (no JavaScript) - conditional loading only on pages with blur blocks
- Added transient caching to avoid expensive block parsing on every page load
#### Code Organization
- Split monolithic JavaScript into modular files for better maintainability
- Separated editor-only code from frontend code
#### Deprecation & Translation Fixes
- Fixed WordPress 6.7+ deprecation warnings for form components
- Fixed JavaScript translations not loading (now generates proper JSON files)
- Updated build script to include JS translations in release

### 1.0.2
#### Fixes
- Blur and glass effects now display when a block is placed in a theme template — site header, footer, or page templates — and not only inside page/post content. Previously such blocks could show the glass frame but no blur; the stylesheet is now delivered reliably wherever a blur block is rendered.
#### New
- Automatic updates: the plugin now updates itself directly from the WordPress dashboard. New versions appear under Plugins and Dashboard → Updates, like any other plugin.

### 1.0.3
#### Fixes
- Editor preview: the blur now shows inside the block editor in Glass mode. The stylesheet is loaded into the editor canvas (iframe), so the editor preview matches the frontend instead of showing only the glass frame without blur.
