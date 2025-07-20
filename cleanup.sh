#!/bin/bash

echo "🔄 Cleaning up Design Diary processes..."

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local name=$2
    
    echo "🔍 Checking for processes on port $port ($name)..."
    
    # Find processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "🎯 Found processes on port $port: $pids"
        
        # Try graceful shutdown first
        echo "📤 Sending SIGTERM to processes..."
        echo "$pids" | xargs kill -TERM 2>/dev/null
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Check if processes are still running
        local remaining=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$remaining" ]; then
            echo "💀 Force killing remaining processes..."
            echo "$remaining" | xargs kill -9 2>/dev/null
        fi
        
        echo "✅ Cleaned up $name on port $port"
    else
        echo "✅ No processes found on port $port ($name)"
    fi
}

# Kill backend server (port 3001)
kill_port 3001 "Backend Server"

# Kill frontend server (port 3000)  
kill_port 3000 "Frontend Server"

# Also kill any node processes that might be related to Design Diary
echo "🔍 Checking for Design Diary node processes..."
pkill -f "react-scripts.*start" 2>/dev/null && echo "✅ Killed react-scripts processes"
pkill -f "node.*server.js" 2>/dev/null && echo "✅ Killed server.js processes"

# Clean up any remaining node processes on these ports
echo "🧹 Final cleanup..."
lsof -ti:3000,3001 2>/dev/null | xargs kill -9 2>/dev/null

echo "🎉 Cleanup complete! All Design Diary processes should be terminated."
echo "💡 You can now restart the servers with: npm start (frontend) and cd server && npm start (backend)"
