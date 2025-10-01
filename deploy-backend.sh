#!/bin/bash

# Backend Deployment Script for GCP Cloud Run
# Excel Mock Interviewer - Conversational Agent v2.0

set -e

echo "🚀 Deploying Backend to GCP Cloud Run..."
echo ""

# Configuration
PROJECT_ID="ai-interview-a68d2"
REGION="us-central1"
SERVICE_NAME="excel-interviewer-api"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found!"
    echo ""
    echo "Please install Google Cloud SDK:"
    echo "  brew install --cask google-cloud-sdk"
    echo "  OR"
    echo "  curl https://sdk.cloud.google.com | bash"
    echo ""
    exit 1
fi

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY not set!"
    echo ""
    echo "Please set your OpenAI API key:"
    echo "  export OPENAI_API_KEY='sk-proj-your-key-here'"
    echo ""
    exit 1
fi

echo "✅ gcloud CLI found"
echo "✅ OpenAI API key set"
echo ""

# Set the project
echo "📋 Setting GCP project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Navigate to backend directory
cd "$(dirname "$0")/backend"
echo "📂 Current directory: $(pwd)"
echo ""

# Build the container
echo "🔨 Building Docker container..."
echo "   This may take 3-5 minutes..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

echo ""
echo "✅ Container built successfully!"
echo ""

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY,GCP_PROJECT_ID=$PROJECT_ID,GOOGLE_APPLICATION_CREDENTIALS=/app/ai-interview-a68d2-firebase-adminsdk-fbsvc-eeb9bc2e79.json

echo ""
echo "✅ Backend deployed successfully!"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Backend URL: $SERVICE_URL"
echo ""
echo "🧪 Test the backend:"
echo "   curl $SERVICE_URL/health"
echo ""
echo "🔍 View logs:"
echo "   gcloud run services logs tail $SERVICE_NAME --region=$REGION"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Update frontend with new backend URL"
echo ""
echo "1. Edit frontend/config.env:"
echo "   REACT_APP_API_URL=$SERVICE_URL"
echo ""
echo "2. Rebuild and redeploy frontend:"
echo "   cd ../frontend"
echo "   npm run build"
echo "   cd .."
echo "   npx firebase-tools deploy --only hosting"
echo ""
echo "OR run the automated script:"
echo "   ./update-and-deploy-frontend.sh $SERVICE_URL"
echo ""

cd ..

