#!/bin/bash
echo "🚀 Setting up MakerSet..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Create .env from example
if [ ! -f "server/.env" ] && [ -f "server/.env.example" ]; then
    echo "📝 Creating .env file..."
    cp server/.env.example server/.env
    echo "⚠️  Please edit server/.env with your settings!"
fi

# Create directories
mkdir -p server/database
mkdir -p server/uploads
mkdir -p server/logs

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your configuration"
echo "2. Run: npm run db:setup"
echo "3. Run: npm run dev"
