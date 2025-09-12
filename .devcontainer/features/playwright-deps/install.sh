#!/bin/bash
set -e

echo "Installing Playwright Dependencies..."
npx playwright install-deps
echo "Playwright Dependencies installed."
