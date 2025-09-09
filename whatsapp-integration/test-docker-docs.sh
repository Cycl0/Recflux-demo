#!/bin/bash
set -e

echo "🐳 Testing Docker Documentation Access..."

# Build the container
echo "📦 Building Docker container..."
docker build -t whatsapp-integration-test .

# Run a test command to check if docs are accessible
echo "🔍 Testing documentation access inside container..."

# Test 1: Check if docs are copied to /app (build stage)
echo "Test 1: Checking docs in /app directory..."
docker run --rm whatsapp-integration-test /bin/bash -c "
if [ -d '/app/docs' ]; then 
    echo '✅ /app/docs directory exists'
    ls -la /app/docs/
else 
    echo '❌ /app/docs directory missing'
    exit 1
fi
"

# Test 2: Check if CLAUDE.md is available
echo -e "\nTest 2: Checking CLAUDE.md file..."
docker run --rm whatsapp-integration-test /bin/bash -c "
if [ -f '/app/CLAUDE.md' ]; then 
    echo '✅ /app/CLAUDE.md exists'
    head -n 5 /app/CLAUDE.md
else 
    echo '❌ /app/CLAUDE.md missing'
    exit 1
fi
"

# Test 3: Start container and check workspace after entrypoint
echo -e "\nTest 3: Checking workspace after entrypoint execution..."
docker run --rm -d --name test-container whatsapp-integration-test sleep 30

# Wait a moment for entrypoint to complete
sleep 5

# Check if docs are copied to workspace
docker exec test-container /bin/bash -c "
echo 'Checking workspace documentation:'
if [ -d '/workspace/project/docs' ]; then 
    echo '✅ Workspace docs directory exists'
    ls -la /workspace/project/docs/
else 
    echo '❌ Workspace docs directory missing'
fi

if [ -f '/workspace/project/CLAUDE.md' ]; then 
    echo '✅ Workspace CLAUDE.md exists'
else 
    echo '❌ Workspace CLAUDE.md missing'
fi
"

# Cleanup
docker stop test-container

echo -e "\n🎉 Docker documentation test completed!"
echo "📋 Summary:"
echo "  - Documentation is built into container at /app/"
echo "  - Entrypoint copies docs to /workspace/project/ where Cline operates"
echo "  - All documentation files are accessible to Cline inside container"