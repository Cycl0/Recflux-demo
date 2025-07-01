#!/bin/bash

# Recflux Microservices - View Logs Script
# This script shows logs from all microservices in the Vagrant VM

echo "📋 Showing Recflux Microservices logs..."

# Check if VM is running
if ! vagrant status | grep -q "running"; then
    echo "❌ VM is not running. Start the VM first with: vagrant up"
    exit 1
fi

# SSH into VM and show logs
echo "📦 Connecting to VM and showing logs..."
echo "   Press Ctrl+C to exit logs view"
echo ""

vagrant ssh -c "cd /home/vagrant/recflux-demo && ./logs.sh"

echo ""
echo "📋 Other useful commands:"
echo "   - Start services: ./start-services.sh"
echo "   - Stop services: ./stop-services.sh"
echo "   - SSH into VM: vagrant ssh" 