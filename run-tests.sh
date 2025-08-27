#!/bin/bash

# Quick test runner script for the leasing assistant

echo "🧪 Running Leasing Assistant Tests"
echo "================================="

# Navigate to API directory and run tests
cd api

echo "📦 Installing dependencies..."
npm install --silent

echo "🔍 Running unit tests..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed"
    exit 1
fi

echo ""
echo "🚀 Tests completed successfully!"
echo "You can now start the application:"
echo ""
echo "Backend:  cd api && npm run dev"
echo "Frontend: cd web/leasing-chat && npm run dev"
