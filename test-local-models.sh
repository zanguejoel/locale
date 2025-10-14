#!/bin/bash

# Test Local Models - Quick Start Script
# Usage: ./test-local-models.sh [ios|android]

set -e

PLATFORM="${1:-ios}"

echo "🧪 Testing Local Models on $PLATFORM"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in jaime-mobile-app directory${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📦 Step 1: Installing dependencies...${NC}"
pnpm install

if [ "$PLATFORM" == "ios" ]; then
    echo -e "\n${YELLOW}🍎 Step 2: Setting up iOS...${NC}"
    
    # Check if pods need installing
    if [ ! -d "ios/Pods" ]; then
        echo "Installing CocoaPods..."
        cd ios
        pod install
        cd ..
    else
        echo "CocoaPods already installed ✓"
    fi
    
    echo -e "\n${GREEN}✅ Ready to test on iOS!${NC}"
    echo -e "\n${YELLOW}🚀 Starting Metro bundler...${NC}"
    echo -e "In another terminal, run: ${GREEN}npx expo run:ios${NC}"
    echo ""
    echo "To test:"
    echo "1. Open the app"
    echo "2. Go to Profile → Toggle to 'Local' mode"
    echo "3. Watch the download progress"
    echo "4. Look for the warning in logs (it's harmless!)"
    echo "5. Send a test message once download completes"
    echo ""
    
    npx expo start --clear

elif [ "$PLATFORM" == "android" ]; then
    echo -e "\n${YELLOW}🤖 Step 2: Setting up Android...${NC}"
    
    # Check if Android SDK is available
    if ! command -v adb &> /dev/null; then
        echo -e "${RED}❌ Error: Android SDK (adb) not found${NC}"
        echo "Please install Android Studio and Android SDK"
        exit 1
    fi
    
    echo -e "\n${GREEN}✅ Ready to test on Android!${NC}"
    echo -e "\n${YELLOW}🚀 Starting Metro bundler...${NC}"
    echo -e "In another terminal, run: ${GREEN}npx expo run:android${NC}"
    echo ""
    echo "To test:"
    echo "1. Open the app"
    echo "2. Go to Profile → Toggle to 'Local' mode"
    echo "3. Watch the download progress"
    echo "4. Look for the warning in logs (it's harmless!)"
    echo "5. Send a test message once download completes"
    echo ""
    
    # Open Android logs in background
    echo -e "${YELLOW}📱 Android logs will appear below...${NC}"
    (adb logcat | grep -i "executorch\|ReactNative" &)
    
    npx expo start --clear

else
    echo -e "${RED}❌ Error: Invalid platform '$PLATFORM'${NC}"
    echo "Usage: ./test-local-models.sh [ios|android]"
    exit 1
fi

echo -e "\n${GREEN}🎉 Testing complete!${NC}"
echo -e "Check ${YELLOW}TESTING_LOCAL_MODELS.md${NC} for detailed testing instructions"

