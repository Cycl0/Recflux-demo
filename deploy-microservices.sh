#!/bin/bash

# Deploy Microservices to Kubernetes
echo "🚀 Deploying Microservices to Kubernetes..."

# Check if Kubernetes cluster is accessible
echo "🔍 Checking Kubernetes cluster connection..."
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Error: Kubernetes cluster is not accessible!"
    echo "Please ensure:"
    echo "1. Kubernetes cluster is running"
    echo "2. kubectl is configured correctly"
    echo "3. You have the right context selected"
    echo ""
    echo "To check your cluster status:"
    echo "kubectl cluster-info"
    echo ""
    echo "To check your current context:"
    echo "kubectl config current-context"
    exit 1
fi

echo "✅ Kubernetes cluster is accessible"

# Build and push Docker images
echo "📦 Building Docker images..."

# Build agentic-structured-service
cd agentic-structured-service
docker build -t agentic-structured-service:latest .
cd ..

# Build agentic-chat-service (if it exists)
if [ -d "agentic-chat-service" ]; then
    cd agentic-chat-service
    docker build -t agentic-chat-service:latest .
    cd ..
fi

# Build agentic-code-service (if it exists)
if [ -d "agentic-code-service" ]; then
    cd agentic-code-service
    docker build -t agentic-code-service:latest .
    cd ..
fi

# Build code-deploy-service
cd code-deploy-service
docker build -t code-deploy-service:latest .
cd ..

# Build kafka-producer-service
cd kafka-producer-service
docker build -t kafka-producer-service:latest .
cd ..

# Build accessibility-service
cd recflux-tools-accessibility-service
docker build -t recflux-tools-accessibility-service:latest .
cd ..

# Build Next.js app using the correct Dockerfile
echo "🏗️ Building Next.js app..."
docker build -f Dockerfile.nextjs -t nextjs-app:latest .

# Apply Kubernetes manifests
echo "🔧 Applying Kubernetes manifests..."

# Apply ConfigMap first
kubectl apply -f k8s/manifests/configmap.yaml

# Apply microservice deployments
kubectl apply -f k8s/manifests/agentic-structured-service.yaml
kubectl apply -f k8s/manifests/agentic-chat-service.yaml
kubectl apply -f k8s/manifests/agentic-code-service.yaml
kubectl apply -f k8s/manifests/code-deploy-service.yaml
kubectl apply -f k8s/manifests/kafka-producer-service.yaml
kubectl apply -f k8s/manifests/accessibility-service.yaml

# Apply Next.js app
kubectl apply -f k8s/manifests/nextjs-app.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/agentic-structured-service
kubectl wait --for=condition=available --timeout=300s deployment/agentic-chat-service
kubectl wait --for=condition=available --timeout=300s deployment/agentic-code-service
kubectl wait --for=condition=available --timeout=300s deployment/code-deploy-service
kubectl wait --for=condition=available --timeout=300s deployment/kafka-producer-service
kubectl wait --for=condition=available --timeout=300s deployment/recflux-tools-accessibility-service
kubectl wait --for=condition=available --timeout=300s deployment/nextjs-app

echo "✅ All microservices deployed successfully!"
echo "🌐 Frontend should be available at: http://app.4.156.13.98.nip.io"
echo "🔍 Check status with: kubectl get pods" 