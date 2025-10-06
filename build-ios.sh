#!/bin/bash

# iOS Build Script with proper encoding
# This ensures pod install and build work correctly

echo "🚀 Building iOS app with proper environment..."

# Set UTF-8 encoding (required for CocoaPods)
export LANG=en_US.UTF-8

# Check if pods are installed
if [ ! -d "ios/Pods" ]; then
    echo "📦 Installing pods..."
    cd ios
    pod install
    cd ..
else
    echo "✅ Pods already installed, skipping..."
fi

# Build and run
echo "🔨 Building and running iOS app..."
npx expo run:ios --no-install

echo "✅ Build complete!"

