#!/bin/bash
source ~/google-cloud-sdk/path.zsh.inc

# Require OPENAI_API_KEY to be supplied from the environment (no hardcoded secrets)
if [ -z "$OPENAI_API_KEY" ]; then
  echo "ERROR: OPENAI_API_KEY is not set in the environment."
  echo "Export OPENAI_API_KEY before running this script."
  exit 1
fi

gcloud run deploy excel-interviewer-api \
  --image gcr.io/ai-interview-a68d2/excel-interviewer-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 3 \
  --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY,GCP_PROJECT_ID=ai-interview-a68d2,GOOGLE_APPLICATION_CREDENTIALS=./ai-interview-a68d2-firebase-adminsdk-fbsvc-eeb9bc2e79.json
