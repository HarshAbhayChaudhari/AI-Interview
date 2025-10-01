#!/bin/bash

# Quick Frontend Deployment Script
# This script deploys the already-built frontend to Firebase Hosting

set -e

echo "🚀 Deploying Frontend to Firebase Hosting..."
echo ""
echo "Backend URL: https://excel-interviewer-api-446216158419.us-central1.run.app"
echo ""

# Check if user is logged in to Firebase
if ! npx firebase-tools projects:list &>/dev/null; then
    echo "❌ Not logged in to Firebase"
    echo ""
    echo "Please run: npx firebase-tools login"
    echo ""
    exit 1
fi

echo "✅ Firebase authentication verified"
echo ""

# Deploy to Firebase Hosting
echo "📦 Deploying to Firebase Hosting..."
npx firebase-tools deploy --only hosting

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Your app is live at: https://ai-interview-a68d2.web.app/"
echo ""
echo "🧪 Test it:"
echo "1. Visit https://ai-interview-a68d2.web.app/"
echo "2. Enter your name"
echo "3. Click 'Start Interview'"
echo "4. The app should now connect to your backend successfully!"
echo ""

