#!/bin/bash
# Design Diary - New Machine Setup Script
# Run this script when setting up Design Diary on a new machine

set -e  # Exit on any error

echo "🚀 Setting up Design Diary on new machine..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Error: Please run this script from the Design Diary project root directory"
    exit 1
fi

# 1. Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# 2. Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# 3. Set up Python virtual environment (recommended)
echo "🐍 Setting up Python virtual environment..."
if command -v python3 &> /dev/null; then
    python3 -m venv venv
    source venv/bin/activate
    echo "✅ Python virtual environment created and activated"
else
    echo "⚠️  Python3 not found. Please install Python 3.8+ manually"
fi

# 4. Install Python dependencies
if [ -f "requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    echo "✅ Python dependencies installed"
else
    echo "⚠️  requirements.txt not found, skipping Python dependencies"
fi

cd ..

# 5. Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x *.sh

# 6. Create .env file template if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env template..."
    cat > .env << EOF
# Design Diary Environment Variables
# Add your API keys and configuration here

# OpenAI API Key (for Cline/Continue)
# OPENAI_API_KEY=your-openai-key-here

# Anthropic API Key (for Cline/Continue)
# ANTHROPIC_API_KEY=your-anthropic-key-here

# Other configuration
NODE_ENV=development
EOF
    echo "✅ .env template created"
fi

# 7. Git configuration check
echo "🔧 Checking Git configuration..."
if ! git config user.name > /dev/null 2>&1; then
    echo "⚠️  Git user.name not set. Please configure:"
    echo "   git config --global user.name 'Your Name'"
fi

if ! git config user.email > /dev/null 2>&1; then
    echo "⚠️  Git user.email not set. Please configure:"
    echo "   git config --global user.email 'your.email@example.com'"
fi

# 8. VS Code extensions check
if command -v code &> /dev/null; then
    echo "🔧 VS Code detected. Recommended extensions will be suggested when you open the project."
else
    echo "⚠️  VS Code not found. Please install VS Code for the best development experience."
fi

# 9. Test the setup
echo "🧪 Testing the setup..."
if [ -f "start-dev.sh" ]; then
    echo "✅ start-dev.sh found"
else
    echo "❌ start-dev.sh not found"
fi

if [ -f "cleanup.sh" ]; then
    echo "✅ cleanup.sh found"
else
    echo "❌ cleanup.sh not found"
fi

# 10. Final instructions
echo ""
echo "🎉 Setup complete! Here's what to do next:"
echo ""
echo "📋 Next Steps:"
echo "   1. Configure your .env file with API keys if needed"
echo "   2. Open VS Code: code ."
echo "   3. Install recommended extensions when prompted"
echo "   4. Enable VS Code Settings Sync to sync with other machines"
echo "   5. Start the application: ./start-dev.sh"
echo ""
echo "🔄 For synchronization with other machines:"
echo "   • Use './sync-start.sh' to pull changes and start"
echo "   • Use './sync-end.sh' to save work and push changes"
echo "   • See SYNCHRONIZATION-GUIDE.md for detailed instructions"
echo ""
echo "🌐 Application URLs (after starting):"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend:  http://localhost:3001"
echo ""
echo "📚 Documentation:"
echo "   • README.md - Main documentation"
echo "   • SYNCHRONIZATION-GUIDE.md - Multi-machine sync guide"
echo ""
echo "✅ Ready to start developing! Run './start-dev.sh' to begin."
