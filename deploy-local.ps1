# Local Development Deployment Script for Windows
Write-Host "🚀 Starting Local Development Environment..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# Build all Docker images
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

# Build Next.js app
Write-Host "🏗️ Building Next.js app..." -ForegroundColor Cyan
docker build -f Dockerfile.nextjs -t nextjs-app:latest .

# Create Docker Compose file for local development
Write-Host "📝 Creating Docker Compose configuration..." -ForegroundColor Blue
$dockerComposeContent = @"
version: '3.8'

services:
  # Frontend
  nextjs-app:
    image: nextjs-app:latest
    ports:
      - "3000:3000"
    environment:
      - AGENTIC_STRUCTURED_URL=http://agentic-structured-service:3001/api/agentic
      - CODE_DEPLOY_URL=http://code-deploy-service:3003/deploy
      - KAFKA_PRODUCER_URL=http://kafka-producer-service:3004
      - ACCESSIBILITY_SERVICE_URL=http://recflux-tools-accessibility-service:3002
    depends_on:
      - agentic-structured-service
      - code-deploy-service
      - kafka-producer-service
      - recflux-tools-accessibility-service

  # Microservices
  agentic-structured-service:
    image: agentic-structured-service:latest
    ports:
      - "3001:3001"
    environment:
      - OPENROUTER_API_KEY=${env:OPENROUTER_API_KEY}

  code-deploy-service:
    image: code-deploy-service:latest
    ports:
      - "3003:3003"
    environment:
      - VERCEL_TOKEN=${env:VERCEL_TOKEN}

  kafka-producer-service:
    image: kafka-producer-service:latest
    ports:
      - "3004:3004"
    environment:
      - KAFKA_BROKERS=${env:KAFKA_BROKERS}

  recflux-tools-accessibility-service:
    image: recflux-tools-accessibility-service:latest
    ports:
      - "3002:3002"
"@

$dockerComposeContent | Out-File -FilePath "docker-compose.local.yml" -Encoding UTF8

# Start services with Docker Compose
Write-Host "🚀 Starting services with Docker Compose..." -ForegroundColor Blue
docker-compose -f docker-compose.local.yml up --build -d

Write-Host "✅ Local development environment started!" -ForegroundColor Green
Write-Host "🌐 Frontend should be available at: http://localhost:3000" -ForegroundColor Yellow
Write-Host "🔍 Check status with: docker-compose -f docker-compose.local.yml ps" -ForegroundColor Cyan
Write-Host "📋 View logs with: docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Microservice endpoints:" -ForegroundColor Cyan
Write-Host "  - Agentic Structured: http://localhost:3001" -ForegroundColor White
Write-Host "  - Code Deploy: http://localhost:3003" -ForegroundColor White
Write-Host "  - Kafka Producer: http://localhost:3004" -ForegroundColor White
Write-Host "  - Accessibility: http://localhost:3002" -ForegroundColor White 