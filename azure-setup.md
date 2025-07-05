# Azure Setup Guide for Recflux Demo

This guide provides step-by-step instructions to set up the required Azure resources for deploying the Recflux Demo application to Azure Kubernetes Service (AKS).

## Prerequisites

- Azure CLI installed and configured
- GitHub account with access to the repository
- Kubernetes knowledge (basic)
- **Note**: This guide is optimized for Azure for Students subscriptions with quota limitations

## Step 1: Create Azure Resource Group

```bash
az group create --name recflux-demo-rg --location eastus
```

## Step 2: Register Required Providers

```bash
# Register Container Registry provider
az provider register --namespace Microsoft.ContainerRegistry

# Register Container Service provider  
az provider register --namespace Microsoft.ContainerService

# Check registration status
az provider show -n Microsoft.ContainerRegistry --query registrationState
az provider show -n Microsoft.ContainerService --query registrationState
```

## Step 3: Create Azure Container Registry (ACR)

```bash
az acr create --resource-group recflux-demo-rg --name recfluxdemoacr --sku Standard
```

## Step 4: Create Virtual Network and Subnets

```bash
# Create a virtual network for the Application Gateway
az network vnet create
  --resource-group recflux-demo-rg
  --name recflux-vnet
  --address-prefix 10.0.0.0/8
  --subnet-name appgw-subnet
  --subnet-prefix 10.1.0.0/16

# Create a subnet for AKS
az network vnet subnet create
  --resource-group recflux-demo-rg
  --vnet-name recflux-vnet
  --name aks-subnet
  --address-prefix 10.2.0.0/16
```

## Step 5: Create AKS Cluster with Application Gateway Ingress Controller

**Note**: Due to quota limitations in student subscriptions, we use 2 nodes with smaller VM size.

```bash
az aks create
  --resource-group recflux-demo-rg
  --name recflux-aks
  --node-count 2
  --enable-managed-identity
  --network-plugin azure
  --vnet-subnet-id $(az network vnet subnet show --resource-group recflux-demo-rg --vnet-name recflux-vnet --name aks-subnet --query id -o tsv)
  --enable-addons ingress-appgw
  --appgw-subnet-id $(az network vnet subnet show --resource-group recflux-demo-rg --vnet-name recflux-vnet --name appgw-subnet --query id -o tsv)
  --generate-ssh-keys
  --node-vm-size Standard_D2s_v3
```

**Alternative configurations if you encounter quota issues:**
- Use `--node-count 1` for single node setup
- Use `--node-vm-size Standard_B1ms` for smaller VMs (1 vCPU each)
- Request quota increase from Azure portal if needed

## Step 6: Attach ACR to AKS

```bash
az aks update
  --resource-group recflux-demo-rg
  --name recflux-aks
  --attach-acr recfluxdemoacr
```

## Step 7: Get ACR Credentials

```bash
# Enable admin user for ACR
az acr update -n recfluxdemoacr --admin-enabled true

# Get ACR credentials
az acr credential show --name recfluxdemoacr --query "{username:username, password:passwords[0].value}" -o table
```

## Step 8: Get kubectl Credentials

```bash
az aks get-credentials --resource-group recflux-demo-rg --name recflux-aks
```

## Step 9: Configure GitHub Secrets

**For Student Accounts (Simplified Authentication):**

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AZURE_USERNAME` | `your-email@domain.com` | Your Azure login email |
| `AZURE_PASSWORD` | `your-password` | Your Azure password (use App Password if 2FA enabled) |
| `AZURE_CONTAINER_REGISTRY` | `recfluxdemoacr` | Your ACR name |
| `AZURE_RESOURCE_GROUP` | `recflux-demo-rg` | Your resource group name |
| `AKS_CLUSTER_NAME` | `recflux-aks` | Your AKS cluster name |
| `ACR_USERNAME` | (from Step 7) | ACR username |
| `ACR_PASSWORD` | (from Step 7) | ACR password |
| `APP_HOSTNAME` | `app.example.nip.io` | Application hostname (placeholder) |
| `API_HOSTNAME` | `api.example.nip.io` | API hostname (placeholder) |

**Note**: If you have 2FA enabled on your Microsoft account, create an App Password at https://account.microsoft.com/security → Advanced security options → App passwords.

## Step 10: Configure DNS (Optional for Development)

1. Get the public IP address of your Application Gateway:

```bash
az network public-ip show
  --resource-group MC_recflux-demo-rg_recflux-aks_eastus
  --name applicationgateway-appgwpip
  --query ipAddress -o tsv
```

2. Create DNS A records for your hostnames (APP_HOSTNAME and API_HOSTNAME) pointing to this IP address.

## Step 11: Deploy the Application

Push to the main branch or manually trigger the GitHub Actions workflow to deploy the application to AKS.

## Troubleshooting

### Quota Issues
If you encounter quota errors:
```bash
# Check your current quota
az vm list-usage --location eastus --output table

# Request quota increase via Azure Portal
# Go to: https://portal.azure.com → Subscriptions → Your Subscription → Usage + quotas
```

### Check pod status:
```bash
kubectl get pods
```

### View pod logs:
```bash
kubectl logs <pod-name>
```

### Check ingress status:
```bash
kubectl get ingress
```

### Check Application Gateway health:
```bash
az network application-gateway show-health
  --resource-group MC_recflux-demo-rg_recflux-aks_eastus
  --name applicationgateway-appgw
  --output table
```

### Delete and recreate cluster (if needed):
```bash
# Delete existing cluster
az aks delete --resource-group recflux-demo-rg --name recflux-aks --yes --no-wait

# Wait for deletion to complete, then recreate
az aks show --resource-group recflux-demo-rg --name recflux-aks --query provisioningState
```

## Notes for Student Accounts

- Student subscriptions have limited quotas (typically 6 cores total)
- Use smaller VM sizes and fewer nodes for development
- Consider requesting quota increases for production deployments
- Service principal creation may be restricted; use personal credentials instead 