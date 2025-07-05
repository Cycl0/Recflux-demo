# Deploy Microservices to Kubernetes
Write-Host "🚀 Deploying Microservices to Kubernetes..." -ForegroundColor Green

# Check if Kubernetes cluster is accessible
Write-Host "🔍 Checking Kubernetes cluster connection..." -ForegroundColor Blue
try {
    kubectl cluster-info | Out-Null
    Write-Host "✅ Kubernetes cluster is accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Kubernetes cluster is not accessible!" -ForegroundColor Red
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "1. Kubernetes cluster is running" -ForegroundColor Yellow
    Write-Host "2. kubectl is configured correctly" -ForegroundColor Yellow
    Write-Host "3. You have the right context selected" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To check your cluster status:" -ForegroundColor Cyan
    Write-Host "kubectl cluster-info" -ForegroundColor White
    Write-Host ""
    Write-Host "To check your current context:" -ForegroundColor Cyan
    Write-Host "kubectl config current-context" -ForegroundColor White
    exit 1
}

# Build and push Docker images
Write-Host "📦 Building Docker images..." -ForegroundColor Blue

# Build agentic-structured-service
Write-Host "🏗️ Building agentic-structured-service..." -ForegroundColor Cyan
Set-Location agentic-structured-service
docker build -t agentic-structured-service:latest .
Set-Location ..

# Build code-deploy-service
Write-Host "🏗️ Building code-deploy-service..." -ForegroundColor Cyan
Set-Location code-deploy-service
docker build -t code-deploy-service:latest .
Set-Location ..

# Build kafka-producer-service
Write-Host "🏗️ Building kafka-producer-service..." -ForegroundColor Cyan
Set-Location kafka-producer-service
docker build -t kafka-producer-service:latest .
Set-Location ..

# Build accessibility-service
Write-Host "🏗️ Building accessibility-service..." -ForegroundColor Cyan
Set-Location recflux-tools-accessibility-service
docker build -t recflux-tools-accessibility-service:latest .
Set-Location ..

# Build Next.js app using the correct Dockerfile
Write-Host "🏗️ Building Next.js app..." -ForegroundColor Cyan
docker build -f Dockerfile.nextjs -t nextjs-app:latest .

# Apply Kubernetes manifests
Write-Host "🔧 Applying Kubernetes manifests..." -ForegroundColor Blue

# Apply ConfigMap first
kubectl apply -f k8s/manifests/configmap.yaml

# Apply microservice deployments
kubectl apply -f k8s/manifests/agentic-structured-service.yaml
kubectl apply -f k8s/manifests/code-deploy-service.yaml
kubectl apply -f k8s/manifests/kafka-producer-service.yaml
kubectl apply -f k8s/manifests/accessibility-service.yaml

# Apply Next.js app
kubectl apply -f k8s/manifests/nextjs-app.yaml

# Wait for deployments to be ready
Write-Host "⏳ Waiting for deployments to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=available --timeout=300s deployment/agentic-structured-service
kubectl wait --for=condition=available --timeout=300s deployment/code-deploy-service
kubectl wait --for=condition=available --timeout=300s deployment/kafka-producer-service
kubectl wait --for=condition=available --timeout=300s deployment/recflux-tools-accessibility-service
kubectl wait --for=condition=available --timeout=300s deployment/nextjs-app

Write-Host "✅ All microservices deployed successfully!" -ForegroundColor Green
Write-Host "🌐 Frontend should be available at: http://app.4.156.13.98.nip.io" -ForegroundColor Yellow
Write-Host "🔍 Check status with: kubectl get pods" -ForegroundColor Cyan 