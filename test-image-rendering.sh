#!/bin/bash
echo "🔍 Image Rendering Debug Helper"
echo "================================"
echo ""
echo "Choose platform:"
echo "1) iOS"
echo "2) Android"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "📱 Starting iOS logs..."
    echo "Look for [LazyImage] and [ChatMessage] logs"
    echo "Press Ctrl+C to stop"
    echo ""
    npx react-native log-ios | grep --color=always -E "\[LazyImage\]|\[ChatMessage\].*[Aa]dditional|Image.*load|Is valid URL"
elif [ "$choice" = "2" ]; then
    echo ""
    echo "📱 Starting Android logs..."
    echo "Look for [LazyImage] and [ChatMessage] logs"
    echo "Press Ctrl+C to stop"
    echo ""
    npx react-native log-android | grep --color=always -E "\[LazyImage\]|\[ChatMessage\].*[Aa]dditional|Image.*load|Is valid URL"
else
    echo "Invalid choice"
    exit 1
fi
