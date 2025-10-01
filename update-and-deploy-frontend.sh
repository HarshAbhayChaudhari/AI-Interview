#!/bin/bash

# Update Frontend with Backend URL and Redeploy
# Excel Mock Interviewer - Conversational Agent v2.0

set -e

# Get backend URL from argument or prompt
if [ -z "$1" ]; then
    echo "❌ Backend URL not provided!"
    echo ""
    echo "Usage:"
    echo "  ./update-and-deploy-frontend.sh <backend-url>"
    echo ""
    echo "Example:"
    echo "  ./update-and-deploy-frontend.sh https://excel-interviewer-api-xxxxx.us-central1.run.app"
    echo ""
    exit 1
fi

BACKEND_URL=$1

echo "🔄 Updating Frontend Configuration..."
echo ""
echo "Backend URL: $BACKEND_URL"
echo ""

# Update frontend config
cd frontend

# Update config.env
echo "📝 Updating config.env..."
cat > config.env << EOF
# Backend API URL
REACT_APP_API_URL=$BACKEND_URL

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyABAv3Pv87BGaS0mjn6KKUAMQ0BrTR5O1E
REACT_APP_FIREBASE_AUTH_DOMAIN=ai-interview-a68d2.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=ai-interview-a68d2
REACT_APP_FIREBASE_STORAGE_BUCKET=ai-interview-a68d2.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=446216158419
REACT_APP_FIREBASE_APP_ID=1:446216158419:web:e4e1675434f48b00a56826
REACT_APP_FIREBASE_MEASUREMENT_ID=G-6SWV9DKE1D
EOF

echo "✅ Configuration updated"
echo ""

# Rebuild the app
echo "🔨 Building frontend..."
REACT_APP_API_URL=$BACKEND_URL npm run build

echo ""
echo "✅ Frontend built successfully"
echo ""

# Deploy to Firebase
cd ..
echo "🚀 Deploying to Firebase Hosting..."
npx firebase-tools deploy --only hosting

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 FRONTEND UPDATED AND DEPLOYED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend URL: https://ai-interview-a68d2.web.app"
echo "🔗 Backend URL: $BACKEND_URL"
echo ""
echo "🧪 Test your deployment:"
echo "   1. Visit https://ai-interview-a68d2.web.app"
echo "   2. Select 'Conversational' mode"
echo "   3. Enter your name and start interview"
echo "   4. Try both text and voice modes!"
echo ""
echo "✅ Deployment complete!"
echo ""

