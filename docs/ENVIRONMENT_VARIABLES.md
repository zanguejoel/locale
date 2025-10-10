# Environment Variables

This document lists all environment variables used in the mobile app.

## Setup

Create a `.env` file in the root of the mobile app directory with the following variables:

## Variables

### `EXPO_PUBLIC_MIXPANEL_TOKEN`
- **Description:** Mixpanel analytics token for tracking app events
- **Required:** Optional (app works without it, but analytics won't track)
- **Example:** `your_mixpanel_token_here`

### `EXPO_PUBLIC_WEB_FRONTEND_URL`
- **Description:** Base URL for the web frontend, used for redirecting to web dashboard
- **Required:** No (defaults to `https://odysseytech.ai`)
- **Default:** `https://odysseytech.ai`
- **Usage:** Credit purchase redirects, web dashboard links
- **Example:** `https://odysseytech.ai`

## Example `.env` File

```bash
# Mixpanel Analytics Token
EXPO_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token_here

# Web Frontend Base URL
EXPO_PUBLIC_WEB_FRONTEND_URL=https://odysseytech.ai
```

## How Environment Variables Are Used

Environment variables are accessed through the `app.config.js` file:

```javascript
extra: {
  mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
  webFrontendUrl: process.env.EXPO_PUBLIC_WEB_FRONTEND_URL || 'https://odysseytech.ai',
}
```

Then accessed in code using `expo-constants`:

```typescript
import Constants from 'expo-constants';

const webUrl = Constants.expoConfig?.extra?.webFrontendUrl;
```

## URLs Generated

### Credit Purchase URL
- **Full URL:** `${WEB_FRONTEND_URL}/dashboard/settings?tab=usage`
- **Default:** `https://odysseytech.ai/dashboard/settings?tab=usage`
- **Used in:** Credit purchase modal redirect

## Development vs Production

The same environment variables are used for both development and production. Make sure to:

1. Set proper values in your local `.env` file for development
2. Set proper values in your CI/CD or app distribution platform for production

## Notes

- All public environment variables must be prefixed with `EXPO_PUBLIC_`
- Changes to environment variables require restarting the Expo dev server
- Environment variables are embedded at build time, not runtime


