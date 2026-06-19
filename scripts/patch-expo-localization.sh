#!/bin/bash
#
# Patch expo-localization for newer iOS SDKs (iOS 26+).
#
# Apple added new Calendar.Identifier cases, which makes the non-frozen
# switch in getUnicodeCalendarIdentifier non-exhaustive and breaks the iOS
# build with: "error: switch must be exhaustive".
#
# We add an `@unknown default` case. Runs automatically via postinstall, so
# the fix survives `pnpm install` / node_modules being regenerated.

set -e

# Resolve the real file through pnpm's symlink (avoids hardcoding the store hash).
FILE="node_modules/expo-localization/ios/LocalizationModule.swift"

if [ ! -f "$FILE" ]; then
  echo "ℹ️  expo-localization not found at $FILE — skipping patch."
  exit 0
fi

if grep -q "@unknown default:" "$FILE"; then
  echo "✅ expo-localization already patched."
  exit 0
fi

# Insert an @unknown default branch right after the `.iso8601` case.
perl -0pi -e 's/(case \.iso8601:\s*\n\s*return "iso8601"\n)(\s*\}\n)/$1    \@unknown default:\n      return "gregory"\n$2/' "$FILE"

if grep -q "@unknown default:" "$FILE"; then
  echo "✅ Patched expo-localization for iOS 26+ compatibility."
else
  echo "⚠️  Could not patch expo-localization (pattern not found). Build may fail on newer Xcode."
fi
