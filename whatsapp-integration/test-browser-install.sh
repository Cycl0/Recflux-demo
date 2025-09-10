#!/bin/bash

# Test script to verify browser installation approach
# This simulates what happens in the Docker container

echo "=== Browser Installation Test ==="

# Check if crawl4ai is available
if command -v /opt/crawl4ai-venv/bin/crwl &> /dev/null; then
    echo "✓ Crawl4AI CLI is available"
    /opt/crawl4ai-venv/bin/crwl --version || echo "⚠ Could not get version"
else
    echo "✗ Crawl4AI CLI not found at /opt/crawl4ai-venv/bin/crwl"
fi

# Check if playwright is available
if command -v /opt/crawl4ai-venv/bin/playwright &> /dev/null; then
    echo "✓ Playwright is available"
    /opt/crawl4ai-venv/bin/playwright --version || echo "⚠ Could not get version"
else
    echo "✗ Playwright not found at /opt/crawl4ai-venv/bin/playwright"
fi

# Check browser directories
BROWSER_DIRS=(
    "/home/appuser/.cache/ms-playwright"
    "/root/.cache/ms-playwright"
    "/tmp/.cache/ms-playwright"
)

for dir in "${BROWSER_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✓ Browser cache found at: $dir"
        find "$dir" -name "*chrome*" -type f 2>/dev/null | head -3 | while read file; do
            echo "  - $file"
        done
    else
        echo "✗ No browser cache at: $dir"
    fi
done

# Test a simple crawl command
echo ""
echo "=== Testing Crawl Command ==="
if command -v /opt/crawl4ai-venv/bin/crwl &> /dev/null; then
    echo "Attempting to crawl a simple page..."
    timeout 10 /opt/crawl4ai-venv/bin/crwl crawl https://httpbin.org/html -o markdown 2>&1 | head -10
else
    echo "Skipping crawl test - crwl not available"
fi

echo ""
echo "=== Test Complete ==="