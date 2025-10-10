# Environment Setup

## Quick Start

Create a `.env` file in the root of the mobile app directory:

```bash
# Copy this to .env and update with your values

# Mixpanel Analytics Token (optional)
EXPO_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token_here

# Web Frontend Base URL (defaults to https://odysseytech.ai if not set)
EXPO_PUBLIC_WEB_FRONTEND_URL=https://odysseytech.ai
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXPO_PUBLIC_MIXPANEL_TOKEN` | No | - | Mixpanel analytics token |
| `EXPO_PUBLIC_WEB_FRONTEND_URL` | No | `https://odysseytech.ai` | Web frontend base URL |

See [docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md) for detailed documentation.


