#!/bin/sh
# setup.sh — Install and verify ast-grep
# POSIX-compatible (ZSH-safe)

set -e

# Check if ast-grep is already installed
if command -v ast-grep >/dev/null 2>&1; then
    echo "ast-grep already installed: $(ast-grep --version)"
else
    echo "ast-grep not found. Installing via cargo..."

    if ! command -v cargo >/dev/null 2>&1; then
        echo "ERROR: cargo is not installed. Cannot install ast-grep."
        exit 1
    fi

    cargo install ast-grep --locked 2>&1
    echo "ast-grep installed successfully."
fi

# Verify installation
if ! command -v ast-grep >/dev/null 2>&1; then
    echo "ERROR: ast-grep not found in PATH after installation."
    exit 1
fi

# Verify it can parse Python
RESULT=$(echo 'class Foo: pass' | ast-grep run --pattern 'class $NAME' --lang python --stdin 2>&1)
if [ $? -ne 0 ]; then
    echo "ERROR: ast-grep Python parsing failed."
    exit 1
fi

echo "ast-grep setup complete: $(ast-grep --version)"
echo "Python parsing: OK"
exit 0
