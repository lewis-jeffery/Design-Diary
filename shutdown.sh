#!/bin/bash

echo "🔄 Shutting down Design Diary..."

# Function to check if a process is running on a port
check_port() {
    local port=$1
    lsof -ti:$port > /dev/null 2>&1
}

# Function to gracefully shutdown via API
graceful_shutdown() {
    local port=$1
    echo "📡 Sending shutdown signal to server on port $port..."
    
    # Try to call the shutdown endpoint
    if curl -s -X POST "http://localhost:$port/api/shutdown" > /dev/null 2>&1; then
        echo "✅ Shutdown signal sent successfully"
        
        # Wait for server to shut down gracefully
        local count=0
        while check_port $port && [ $count -lt 10 ]; do
            echo "⏳ Waiting for server to shut down... ($((count + 1))/10)"
            sleep 1
            count=$((count + 1))
        done
        
        if check_port $port; then
            echo "⚠️ Server didn't shut down gracefully, forcing termination..."
            return 1
        else
            echo "✅ Server shut down gracefully"
            return 0
        fi
    else
        echo "⚠️ Failed to send shutdown signal"
        return 1
    fi
}

# Function to force kill processes on a port
force_kill_port() {
    local port=$1
    echo "🔨 Force killing processes on port $port..."
    
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "Found processes: $pids"
        kill -TERM $pids 2>/dev/null
        sleep 2
        
        # Check if processes are still running
        local remaining_pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$remaining_pids" ]; then
            echo "🔨 Force killing remaining processes: $remaining_pids"
            kill -KILL $remaining_pids 2>/dev/null
        fi
        
        echo "✅ Processes terminated"
    else
        echo "ℹ️ No processes found on port $port"
    fi
}

# Function to clean up temp files
cleanup_temp_files() {
    echo "🧹 Cleaning up temporary files..."
    
    # Clean up Design Diary temp files
    local temp_dir="/tmp/design-diary-python"
    if [ -d "$temp_dir" ]; then
        rm -rf "$temp_dir"
        echo "✅ Cleaned up $temp_dir"
    fi
    
    # Clean up any remaining Python processes
    pkill -f "persistent_runner_" 2>/dev/null || true
    
    echo "✅ Cleanup complete"
}

# Main shutdown sequence
main() {
    echo "🚪 Design Diary Shutdown Script"
    echo "================================"
    
    # Check if servers are running
    backend_running=false
    frontend_running=false
    
    if check_port 3001; then
        backend_running=true
        echo "📍 Backend server detected on port 3001"
    fi
    
    if check_port 3000; then
        frontend_running=true
        echo "📍 Frontend server detected on port 3000"
    fi
    
    if [ "$backend_running" = false ] && [ "$frontend_running" = false ]; then
        echo "ℹ️ No servers appear to be running"
        cleanup_temp_files
        echo "✅ Shutdown complete"
        exit 0
    fi
    
    # Try graceful shutdown of backend first (it handles cleanup)
    if [ "$backend_running" = true ]; then
        if ! graceful_shutdown 3001; then
            force_kill_port 3001
        fi
    fi
    
    # Shutdown frontend server
    if [ "$frontend_running" = true ]; then
        echo "🔄 Shutting down frontend server on port 3000..."
        force_kill_port 3000
    fi
    
    # Final cleanup
    cleanup_temp_files
    
    # Kill any remaining node processes related to Design Diary
    echo "🧹 Cleaning up any remaining processes..."
    pkill -f "react-scripts" 2>/dev/null || true
    pkill -f "design-diary" 2>/dev/null || true
    
    echo ""
    echo "✅ Design Diary shutdown complete!"
    echo "🎉 All servers stopped and cleanup finished"
}

# Handle script interruption
trap 'echo ""; echo "⚠️ Shutdown interrupted"; exit 1' INT TERM

# Run main function
main "$@"
