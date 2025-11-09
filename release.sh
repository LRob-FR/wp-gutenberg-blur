#!/bin/bash

# LRob Gutenberg Blur - Release Builder
# Generates translation files and creates a distributable zip archive

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script paths - detect automatically
SCRIPT_DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGIN_DIR_NAME="$(basename "$SCRIPT_DIR")"

# Configuration
PLUGIN_SLUG="lrob-gutenberg-blur"
PLUGIN_FILE="${SCRIPT_DIR}/${PLUGIN_SLUG}.php"
LANGUAGES_DIR="${SCRIPT_DIR}/languages"
RELEASES_DIR="${PARENT_DIR}/releases"

# Print colored messages
print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."

    local missing_deps=0

    # Check PHP
    if ! command_exists php; then
        print_error "PHP is not installed"
        echo "  Install with: sudo dnf install php-cli"
        missing_deps=1
    else
        print_success "PHP $(php -r 'echo PHP_VERSION;') found"
    fi

    # Check WP-CLI
    if ! command_exists wp; then
        print_error "WP-CLI is not installed"
        echo "  Install with: sudo dnf install wp-cli"
        echo "  Or manually: curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar"
        missing_deps=1
    else
        print_success "WP-CLI $(wp --version | grep -oP '\d+\.\d+\.\d+') found"
    fi

    # Check msgfmt (gettext)
    if ! command_exists msgfmt; then
        print_error "msgfmt (gettext) is not installed"
        echo "  Install with: sudo dnf install gettext"
        missing_deps=1
    else
        print_success "msgfmt $(msgfmt --version | head -1 | grep -oP '\d+\.\d+\.\d+') found"
    fi

    # Check zip
    if ! command_exists zip; then
        print_error "zip is not installed"
        echo "  Install with: sudo dnf install zip"
        missing_deps=1
    else
        print_success "zip found"
    fi

    if [ $missing_deps -eq 1 ]; then
        print_error "Missing dependencies. Please install them and try again."
        exit 1
    fi

    echo ""
}

# Extract version from plugin file
get_current_version() {
    if [ ! -f "$PLUGIN_FILE" ]; then
        print_error "Plugin file not found: $PLUGIN_FILE"
        exit 1
    fi
    grep -oP "Version:\s*\K[\d.]+" "$PLUGIN_FILE"
}

# Generate POT template
generate_pot() {
    print_status "Generating translation template (.pot)..."

    mkdir -p "$LANGUAGES_DIR"

    wp i18n make-pot "$SCRIPT_DIR" "$LANGUAGES_DIR/${PLUGIN_SLUG}.pot" \
        --domain="$PLUGIN_SLUG" \
        --package-name="LRob - Gutenberg Blur"

    if [ $? -eq 0 ]; then
        print_success "POT file generated: ${LANGUAGES_DIR}/${PLUGIN_SLUG}.pot"
    else
        print_error "Failed to generate POT file"
        exit 1
    fi
}

# Generate JSON translations for JavaScript
generate_json_translations() {
    print_status "Generating JSON translations for JavaScript..."

    local generated=0

    shopt -s nullglob
    local po_files=("$LANGUAGES_DIR"/*.po)
    shopt -u nullglob

    if [ ${#po_files[@]} -eq 0 ]; then
        print_warning "No .po files found to convert to JSON"
        return 0
    fi

    for po_file in "${po_files[@]}"; do
        if wp i18n make-json "$LANGUAGES_DIR" --no-purge 2>/dev/null; then
            print_success "Generated JSON for: $(basename "$po_file")"
            generated=$((generated + 1))
        else
            print_error "Failed to generate JSON for: $(basename "$po_file")"
        fi
    done

    if [ $generated -gt 0 ]; then
        print_success "Generated JSON for $generated translation file(s)"
    fi
}

# Compile translations
compile_translations() {
    print_status "Compiling translations (.po → .mo)..."

    local compiled=0

    # Check if any .po files exist
    shopt -s nullglob
    local po_files=("$LANGUAGES_DIR"/*.po)
    shopt -u nullglob

    if [ ${#po_files[@]} -eq 0 ]; then
        print_warning "No .po files found to compile"
        return 0
    fi

    for po_file in "${po_files[@]}"; do
        mo_file="${po_file%.po}.mo"

        if msgfmt -o "$mo_file" "$po_file" 2>/dev/null; then
            print_success "Compiled: $(basename "$mo_file")"
            compiled=$((compiled + 1))
        else
            print_error "Failed to compile: $(basename "$po_file")"
        fi
    done

    if [ $compiled -gt 0 ]; then
        print_success "Compiled $compiled translation file(s)"
    fi
}

# Create release archive
create_archive() {
    local version=$1
    local archive_name="${PLUGIN_SLUG}-${version}.zip"
    local archive_path="${RELEASES_DIR}/${archive_name}"

    print_status "Creating release archive..."

    # Create releases directory
    mkdir -p "$RELEASES_DIR"

    # Remove old archive if exists
    [ -f "$archive_path" ] && rm "$archive_path"

    # Create temporary file list
    local temp_list=$(mktemp)

    # Find all files to include, excluding unwanted ones
    (cd "$PARENT_DIR" && find "$PLUGIN_DIR_NAME" -type f \
        ! -path "*/.git/*" \
        ! -path "*/node_modules/*" \
        ! -name "*.sh" \
        ! -name "*.po" \
        ! -name "*.pot" \
        > "$temp_list")

    # Create zip using the file list
    (cd "$PARENT_DIR" && zip -q -r "$archive_path" -@ < "$temp_list")
    local zip_result=$?

    rm "$temp_list"

    if [ $zip_result -eq 0 ]; then
        local size=$(du -h "$archive_path" | cut -f1)
        print_success "Archive created: ${RELEASES_DIR}/${archive_name} ($size)"
    else
        print_error "Failed to create archive"
        exit 1
    fi
}

# Main script
main() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║  LRob Gutenberg Blur - Release Builder ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    print_status "Script directory: $SCRIPT_DIR"
    print_status "Releases directory: $RELEASES_DIR"
    echo ""

    # Check dependencies first
    check_dependencies

    # Get current version
    VERSION=$(get_current_version)
    print_status "Current version: $VERSION"
    echo ""

    # Build process
    generate_pot
    compile_translations
    generate_json_translations
    create_archive "$VERSION"

    echo ""
    print_success "Release $VERSION completed successfully! 🎉"
    echo ""
    echo "Next steps:"
    echo "  1. Test the plugin: unzip ${RELEASES_DIR}/${PLUGIN_SLUG}-${VERSION}.zip"
    echo "  2. Upload to WordPress"
    echo ""
}

# Run main function
main "$@"
