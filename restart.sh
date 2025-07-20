#!/bin/bash

echo "🔄 Restarting Design Diary..."

# First, run cleanup
echo "🧹 Running cleanup script..."
/bin/bash cleanup.sh

# Wait a moment for cleanup to complete
sleep 3

echo "🚀 Starting servers..."

# Start backend server in background
echo "📡 Starting backend server..."
(cd server && npm start) &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend server from main directory
echo "🌐 Starting frontend server..."
npm start &
FRONTEND_PID=$!

echo "✅ Design Diary is starting up!"
echo "📡 Backend PID: $BACKEND_PID"
echo "🌐 Frontend PID: $FRONTEND_PID"
echo ""
echo "🌍 Frontend will be available at: http://localhost:3000"
echo "📡 Backend will be available at: http://localhost:3001"
echo ""
echo "💡 To stop the servers, use: ./cleanup.sh"
echo "🔄 To restart again, use: ./restart.sh"

# Keep script running to show process info
wait
