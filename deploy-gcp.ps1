# Automated Google Cloud PowerShell Deployment Script for Project ID: project-outwitted

$ErrorActionPreference = "Stop"

$PROJECT_ID = "project-outwitted"
$REGION = "us-central1"
$API_SERVICE_NAME = "outwitters-api"
$WEB_SERVICE_NAME = "outwitters-web"

Write-Host "=== Deploying Outwitters Online to Google Cloud ===" -ForegroundColor Green
Write-Host "Project ID: $PROJECT_ID"
Write-Host "Region: $REGION"

# Set active project
gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
Write-Host "Enabling Google Cloud APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Step 1: Build & Deploy Backend API Container
Write-Host "Building Backend API Container Image..." -ForegroundColor Yellow
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$API_SERVICE_NAME" -f server/Dockerfile .

Write-Host "Deploying Backend API to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $API_SERVICE_NAME `
  --image "gcr.io/$PROJECT_ID/$API_SERVICE_NAME" `
  --region $REGION `
  --allow-unauthenticated `
  --port 3001 `
  --set-env-vars HOST=0.0.0.0,PORT=3001

# Retrieve backend service URL
$API_URL = (gcloud run services describe $API_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)').Trim()
Write-Host "Backend API deployed at: $API_URL" -ForegroundColor Green

# Step 2: Build & Deploy Frontend Client Container
Write-Host "Building Frontend Client Container Image..." -ForegroundColor Yellow
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$WEB_SERVICE_NAME" -f client/Dockerfile .

Write-Host "Deploying Frontend Client to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $WEB_SERVICE_NAME `
  --image "gcr.io/$PROJECT_ID/$WEB_SERVICE_NAME" `
  --region $REGION `
  --allow-unauthenticated `
  --port 80

$WEB_URL = (gcloud run services describe $WEB_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)').Trim()

Write-Host "==================================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "Game Web App URL: $WEB_URL" -ForegroundColor Cyan
Write-Host "Backend API URL:  $API_URL" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
