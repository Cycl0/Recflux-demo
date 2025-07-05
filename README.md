# Recflux Demo

Recflux Demo is a microservices-based application that includes various services for AI-powered code generation, chat, and deployment.

## Project Structure

- **agentic-structured-service**: Service for structured AI interactions
- **code-deploy-service**: Service for deploying generated code
- **kafka-producer-service**: Service for producing Kafka messages
- **recflux-tools-accessibility-service**: Service for accessibility tools
- **app**: Next.js frontend application

## Local Development

To run the application locally:

```bash
docker-compose up -d
```

This will start all the services defined in the `docker-compose.yml` file.

## Kubernetes Deployment

This project is set up for deployment to Azure Kubernetes Service (AKS) using GitHub Actions for CI/CD.

### Prerequisites

See [azure-setup.md](azure-setup.md) for detailed instructions on setting up the required Azure resources.

### Deployment Architecture

The application is deployed to AKS with the following components:

- **Kubernetes Manifests**: Located in the `k8s/manifests` directory
- **CI/CD Pipeline**: GitHub Actions workflow in `.github/workflows/deploy-to-aks.yml`
- **Ingress**: Azure Application Gateway for routing external traffic

### Kubernetes Resources

- **Deployments**: For each microservice and the frontend application
- **Services**: For internal communication between services
- **Ingress**: For external access to the application
- **ConfigMap**: For environment-specific configuration

### CI/CD Pipeline

The GitHub Actions workflow handles:

1. Building Docker images for each service
2. Pushing images to Azure Container Registry
3. Deploying to AKS using Kustomize

### Monitoring and Troubleshooting

To view the status of your deployment:

```bash
# Get kubectl credentials
az aks get-credentials --resource-group recflux-demo-rg --name recflux-aks

# Check pod status
kubectl get pods

# View service details
kubectl get services

# Check ingress configuration
kubectl get ingress
```

## Environment Variables

The following environment variables are used in the deployment:

- `KAFKA_BROKERS`: Kafka broker addresses
- `CORS_ORIGIN`: CORS configuration
- `NEXT_PUBLIC_API_URL`: URL for the API services

## License

This project is proprietary and confidential.
