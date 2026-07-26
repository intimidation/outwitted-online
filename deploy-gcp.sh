#!/usr/bin/env bash
# Automated Google Cloud Deployment Script for Project ID: project-outwitted

set -e

PROJECT_ID="project-outwitted"
REGION="us-central1"
API_SERVICE_NAME="outwitters-api"
WEB_SERVICE_NAME="outwitters-web"

echo "=== Deploying Outwitters Online to Google Cloud ==="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Set active project
gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
echo "Enabling Google Cloud APIs..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Step 1: Build & Deploy Backend API Container
echo "Building Backend API Container Image..."
gcloud builds submit --tag "gcr.io/${PROJECT_ID}/${API_SERVICE_NAME}" -f server/Dockerfile .

echo "Deploying Backend API to Cloud Run..."
gcloud run deploy $API_SERVICE_NAME \
  --image "gcr.io/${PROJECT_ID}/${API_SERVICE_NAME}" \
  --region $REGION \
  --allow-unauthenticated \
  --port 3001 \
  --set-env-vars HOST=0.0.0.0,PORT=3001

# Retrieve backend service URL
API_URL=$(gcloud run services describe $API_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "Backend API deployed at: $API_URL"

# Step 2: Build & Deploy Frontend Client Container
echo "Building Frontend Client Container Image..."
gcloud builds submit --tag "gcr.io/${PROJECT_ID}/${WEB_SERVICE_NAME}" --substitutions=_VITE_API_BASE_URL="${API_URL}/api" -f client/Dockerfile .

echo "Deploying Frontend Client to Cloud Run..."
gcloud run deploy $WEB_SERVICE_NAME \
  --image "gcr.io/${PROJECT_ID}/${WEB_SERVICE_NAME}" \
  --region $REGION \
  --allow-unauthenticated \
  --port 80

WEB_URL=$(gcloud run services describe $WEB_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "=================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Game Web App URL: $WEB_URL"
echo "Backend API URL:  $API_URL"
echo "=================================================="
