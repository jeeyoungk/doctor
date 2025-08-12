#!/bin/bash

# Template script to replace GitHub variables in package.json
# Usage: ./template.sh GITHUB_OWNER GITHUB_REPO

set -e

# Check for required arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 GITHUB_OWNER GITHUB_REPO"
    echo "Example: $0 myuser myrepo"
    exit 1
fi

GITHUB_OWNER="$1"
GITHUB_REPO="$2"

# Validate inputs
if [[ ! "$GITHUB_OWNER" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: GITHUB_OWNER must contain only alphanumeric characters, hyphens, and underscores"
    exit 1
fi

if [[ ! "$GITHUB_REPO" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    echo "Error: GITHUB_REPO must contain only alphanumeric characters, dots, hyphens, and underscores"
    exit 1
fi

echo "Configuring template with:"
echo "  GitHub Owner: $GITHUB_OWNER"
echo "  GitHub Repo: $GITHUB_REPO"

# Create backup of package.json
cp package.json package.json.backup

# Perform replacements in package.json
sed -i.tmp \
    -e "s/\$GITHUB_OWNER/$GITHUB_OWNER/g" \
    -e "s/\$GITHUB_REPO/$GITHUB_REPO/g" \
    package.json

# Remove temporary file created by sed
rm -f package.json.tmp

echo "✅ Template configuration complete!"
echo "📦 Package name: @$GITHUB_OWNER/$GITHUB_REPO"
echo "🔗 Repository: https://github.com/$GITHUB_OWNER/$GITHUB_REPO"

# Verify the changes
echo ""
echo "📋 Updated package.json fields:"
grep -E "(\"name\"|\"homepage\"|\"bugs\"|\"repository\")" package.json

echo ""
echo "🎉 You can now run 'bun install' to get started!"
echo "💡 Backup saved as package.json.backup"