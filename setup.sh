#!/bin/bash

# Design Diary Setup Script
# This script sets up the Design Diary application for development or production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 16 ]; then
            print_success "Node.js version $NODE_VERSION is compatible"
            return 0
        else
            print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 16 or higher"
            return 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 16 or higher"
        return 1
    fi
}

# Function to check Python version
check_python_version() {
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d'.' -f1)
        MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d'.' -f2)
        if [ "$MAJOR_VERSION" -eq 3 ] && [ "$MINOR_VERSION" -ge 8 ]; then
            print_success "Python version $PYTHON_VERSION is compatible"
            return 0
        else
            print_error "Python version $PYTHON_VERSION is too old. Please install Python 3.8 or higher"
            return 1
        fi
    else
        print_error "Python 3 is not installed. Please install Python 3.8 or higher"
        return 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    npm install

    print_status "Installing backend dependencies..."
    cd server
    npm install
    cd ..

    print_success "All dependencies installed successfully"
}

# Function to run health checks
health_check() {
    print_status "Running health checks..."
    
    # Check if ports are available
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3000 is already in use"
    fi
    
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3001 is already in use"
    fi

    print_success "Health checks completed"
}

# Function to setup development environment
setup_development() {
    print_status "Setting up development environment..."
    
    # Make start script executable
    chmod +x start-dev.sh
    
    # Create .env.local if it doesn't exist
    if [ ! -f .env.local ]; then
        cat > .env.local << EOF
REACT_APP_API_URL=http://localhost:3001
REACT_APP_VERSION=1.0.0
EOF
        print_success "Created .env.local file"
    fi
    
    print_success "Development environment setup complete"
}

# Function to setup production environment
setup_production() {
    print_status "Setting up production environment..."
    
    # Build the application
    print_status "Building React application..."
    npm run build
    
    # Create production environment file
    if [ ! -f .env.production ]; then
        cat > .env.production << EOF
NODE_ENV=production
REACT_APP_API_URL=http://localhost:3001
PORT=3000
PYTHON_SERVER_PORT=3001
EOF
        print_success "Created .env.production file"
    fi
    
    print_success "Production environment setup complete"
}

# Function to setup Docker environment
setup_docker() {
    print_status "Setting up Docker environment..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first"
        return 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first"
        return 1
    fi
    
    print_status "Building Docker images..."
    docker-compose build
    
    print_success "Docker environment setup complete"
}

# Function to start the application
start_application() {
    print_status "Starting Design Diary..."
    
    case $1 in
        "development"|"dev")
            ./start-dev.sh
            ;;
        "production"|"prod")
            print_status "Starting production servers..."
            cd server && npm start &
            SERVER_PID=$!
            cd ..
            npx serve -s build -l 3000 &
            FRONTEND_PID=$!
            print_success "Application started in production mode"
            print_status "Frontend: http://localhost:3000"
            print_status "Backend: http://localhost:3001"
            print_status "Press Ctrl+C to stop"
            wait
            ;;
        "docker")
            docker-compose up
            ;;
        *)
            print_error "Invalid start mode. Use: development, production, or docker"
            return 1
            ;;
    esac
}

# Main setup function
main() {
    echo "🎨 Design Diary Setup Script"
    echo "=============================="
    echo ""
    
    # Parse command line arguments
    MODE="development"
    START_APP=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mode|-m)
                MODE="$2"
                shift 2
                ;;
            --start|-s)
                START_APP=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -m, --mode MODE     Setup mode: development, production, or docker (default: development)"
                echo "  -s, --start         Start the application after setup"
                echo "  -h, --help          Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                           # Setup for development"
                echo "  $0 --mode production         # Setup for production"
                echo "  $0 --mode docker --start     # Setup Docker and start"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    print_status "Setup mode: $MODE"
    echo ""
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    check_node_version || exit 1
    check_python_version || exit 1
    
    # Install dependencies (except for Docker mode)
    if [ "$MODE" != "docker" ]; then
        install_dependencies
    fi
    
    # Setup based on mode
    case $MODE in
        "development"|"dev")
            setup_development
            ;;
        "production"|"prod")
            setup_production
            ;;
        "docker")
            setup_docker
            ;;
        *)
            print_error "Invalid mode: $MODE. Use development, production, or docker"
            exit 1
            ;;
    esac
    
    # Run health checks
    health_check
    
    echo ""
    print_success "🎉 Design Diary setup completed successfully!"
    echo ""
    
    # Show next steps
    case $MODE in
        "development"|"dev")
            echo "Next steps:"
            echo "  1. Start the application: ./start-dev.sh"
            echo "  2. Open your browser: http://localhost:3000"
            ;;
        "production"|"prod")
            echo "Next steps:"
            echo "  1. Start backend: cd server && npm start"
            echo "  2. Start frontend: npx serve -s build -l 3000"
            echo "  3. Open your browser: http://localhost:3000"
            ;;
        "docker")
            echo "Next steps:"
            echo "  1. Start with Docker: docker-compose up"
            echo "  2. Open your browser: http://localhost:3000"
            ;;
    esac
    
    # Start application if requested
    if [ "$START_APP" = true ]; then
        echo ""
        start_application $MODE
    fi
}

# Run main function with all arguments
main "$@"
