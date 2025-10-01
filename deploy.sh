#!/bin/bash

# Excel Interviewer Deployment Script for GCP
# This script deploys both backend and frontend to GCP

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"ai-interview-a68d2"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="excel-interviewer-api"
FRONTEND_BUCKET=${FRONTEND_BUCKET:-"excel-interviewer-frontend"}

echo "🚀 Starting deployment to GCP..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first."
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

# Build and deploy backend to Cloud Run
echo "📦 Building and deploying backend to Cloud Run..."

cd backend

# Build the container
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 3 \
    --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Backend deployed successfully!"
echo "Backend URL: $SERVICE_URL"

cd ..

# Build and deploy frontend to Firebase Hosting
echo "📦 Building and deploying frontend..."

cd frontend

# Install dependencies
npm install

# Create .env file with production API URL
echo "Creating .env file with production backend URL..."
cat > .env << EOF
REACT_APP_FIREBASE_API_KEY=AIzaSyABAv3Pv87BGaS0mjn6KKUAMQ0BrTR5O1E
REACT_APP_FIREBASE_AUTH_DOMAIN=ai-interview-a68d2.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=ai-interview-a68d2
REACT_APP_FIREBASE_STORAGE_BUCKET=ai-interview-a68d2.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=446216158419
REACT_APP_FIREBASE_APP_ID=1:446216158419:web:e4e1675434f48b00a56826
REACT_APP_FIREBASE_MEASUREMENT_ID=G-6SWV9DKE1D
REACT_APP_API_URL=https://excel-interviewer-api-446216158419.us-central1.run.app
EOF

# Build the React app
npm run build

# Deploy to Firebase Hosting (if Firebase is set up)
if command -v firebase &> /dev/null; then
    echo "🔥 Deploying to Firebase Hosting..."
    firebase deploy --only hosting
    echo "✅ Frontend deployed to Firebase Hosting!"
else
    echo "⚠️  Firebase CLI not found. Please install it to deploy the frontend."
    echo "   You can also manually upload the 'build' folder to any static hosting service."
fi

cd ..

echo "🎉 Deployment completed!"
echo ""
echo "📋 Summary:"
echo "Backend URL: $SERVICE_URL"
echo "Frontend: Check Firebase Hosting or upload build folder manually"
echo ""
echo "🔧 Next steps:"
echo "1. Update frontend to use the backend URL: $SERVICE_URL"
echo "2. Test the deployed application"
echo "3. Set up monitoring and logging"

