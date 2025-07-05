# 🚀 Microservices Setup Guide

This guide will help you set up your frontend to communicate with the microservices correctly.

## 📋 Prerequisites

- Docker installed and running
- Kubernetes cluster running (for production deployment)
- kubectl configured (for production deployment)
- Environment variables set up

## 🔧 Configuration Changes Made

### 1. **Updated ConfigMap** (`k8s/manifests/configmap.yaml`)
- Added all microservice URLs
- Configured internal Kubernetes service names

### 2. **Updated Next.js Deployment** (`k8s/manifests/nextjs-app.yaml`)
- Added environment variables from ConfigMap
- Configured proper service names
- Set resource limits

### 3. **Created API Routes** 
- `app/api/agentic-chat/route.ts` - Forwards to chat microservice
- `app/api/agentic-code/route.ts` - Forwards to code microservice
- `app/api/agentic-structured/route.ts` - Already exists, forwards to structured microservice

### 4. **Created Microservice Manifests**
- `k8s/manifests/agentic-chat-service.yaml`
- `k8s/manifests/agentic-code-service.yaml`
- `k8s/manifests/code-deploy-service.yaml`
- `k8s/manifests/kafka-producer-service.yaml`
- `k8s/manifests/accessibility-service.yaml`

## 🚀 Deployment Options

### **Option 1: Local Development (Recommended for testing)**

#### **Using PowerShell (Windows)**
```powershell
# Run the PowerShell script
.\deploy-local.ps1
```

#### **Using Bash (Linux/Mac)**
```bash
# Make the script executable
chmod +x deploy-local.sh

# Run the deployment
./deploy-local.sh
```

#### **Using Docker Compose directly**
```bash
# Simple version (just frontend)
docker-compose -f docker-compose.simple.yml up --build

# Full version (all microservices)
docker-compose -f docker-compose.dev.yml up --build
```

### **Option 2: Kubernetes Production Deployment**

#### **Using the Deployment Script**
```bash
# Make the script executable
chmod +x deploy-microservices.sh

# Run the deployment
./deploy-microservices.sh
```

#### **Manual Deployment**
```bash
# 1. Apply ConfigMap first
kubectl apply -f k8s/manifests/configmap.yaml

# 2. Build Docker images
docker build -f Dockerfile.nextjs -t nextjs-app:latest .
docker build -t agentic-structured-service:latest ./agentic-structured-service
docker build -t agentic-chat-service:latest ./agentic-chat-service
docker build -t agentic-code-service:latest ./agentic-code-service
docker build -t code-deploy-service:latest ./code-deploy-service
docker build -t kafka-producer-service:latest ./kafka-producer-service
docker build -t recflux-tools-accessibility-service:latest ./recflux-tools-accessibility-service

# 3. Apply microservice deployments
kubectl apply -f k8s/manifests/agentic-structured-service.yaml
kubectl apply -f k8s/manifests/agentic-chat-service.yaml
kubectl apply -f k8s/manifests/agentic-code-service.yaml
kubectl apply -f k8s/manifests/code-deploy-service.yaml
kubectl apply -f k8s/manifests/kafka-producer-service.yaml
kubectl apply -f k8s/manifests/accessibility-service.yaml

# 4. Apply Next.js app
kubectl apply -f k8s/manifests/nextjs-app.yaml
```

## 🔍 Verification

### **Local Development**
```bash
# Check if services are running
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Access frontend
# http://localhost:3000
```

### **Kubernetes Production**
```bash
# Check Pod Status
kubectl get pods

# Check Services
kubectl get services

# Check Logs
kubectl logs deployment/nextjs-app
kubectl logs deployment/agentic-structured-service
kubectl logs deployment/agentic-chat-service
kubectl logs deployment/agentic-code-service

# Access frontend
# http://app.4.156.13.98.nip.io
```

## 🔧 Environment Variables

### **Local Development**
Create a `.env` file in the root directory:
```bash
# Required for microservices
OPENROUTER_API_KEY=your_openrouter_api_key
VERCEL_TOKEN=your_vercel_token
KAFKA_BROKERS=your_kafka_brokers

# Optional for additional features
THUMBNAIL_API_KEY=your_thumbnail_api_key
OPENAI_API_KEY=your_openai_api_key
```

### **Kubernetes Production**
Make sure these environment variables are set in your Kubernetes secrets:
```bash
# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=OPENROUTER_API_KEY=your_openrouter_api_key \
  --from-literal=VERCEL_TOKEN=your_vercel_token \
  --from-literal=KAFKA_BROKERS=your_kafka_brokers
```

## 🐛 Troubleshooting

### **Common Issues**

1. **Docker not running**
   ```bash
   # Start Docker Desktop or Docker daemon
   # On Windows: Start Docker Desktop
   # On Linux: sudo systemctl start docker
   ```

2. **Kubernetes cluster not accessible**
   ```bash
   # Check cluster status
   kubectl cluster-info
   
   # Check current context
   kubectl config current-context
   
   # If using minikube
   minikube start
   ```

3. **Microservice not responding**
   - Check if the microservice container is running: `docker ps`
   - Check logs: `docker logs <container-name>`
   - Verify service is accessible: `curl http://localhost:3001/health`

4. **Frontend can't connect to microservices**
   - Check if services are running: `docker-compose ps`
   - Verify environment variables are set correctly
   - Check network connectivity between containers

### **Debug Commands**

```bash
# Docker debugging
docker ps -a
docker logs <container-name>
docker exec -it <container-name> /bin/bash

# Kubernetes debugging
kubectl describe pod <pod-name>
kubectl get endpoints
kubectl get configmap app-config -o yaml

# Network debugging
curl http://localhost:3001/health
telnet localhost 3001
```

## 📊 Architecture Overview

```
Frontend (Next.js) - Port 3000
    ↓
API Routes (BFF - Backend for Frontend)
    ↓
Microservices:
├── agentic-structured-service (Port 3001)
├── agentic-chat-service (Port 3002)
├── agentic-code-service (Port 3003)
├── code-deploy-service (Port 3004)
├── kafka-producer-service (Port 3005)
└── recflux-tools-accessibility-service (Port 3006)
```

## 🔄 Next Steps

1. **Start with Local Development**: Use `deploy-local.ps1` or `deploy-local.sh`
2. **Test Frontend**: Access http://localhost:3000
3. **Monitor Logs**: Use `docker-compose logs -f`
4. **Scale Services**: Adjust replica counts based on load
5. **Add Health Checks**: Implement health check endpoints
6. **Security**: Add authentication between services
7. **Caching**: Implement caching strategies

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review logs for error messages
3. Verify all environment variables are set correctly
4. Ensure all services are running and healthy
5. Try the local development option first before Kubernetes deployment 