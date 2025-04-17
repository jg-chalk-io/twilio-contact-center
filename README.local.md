# Running Twilio Contact Center Locally

This document provides instructions for running the Twilio Contact Center application locally.

## Prerequisites

- Node.js (recommended version 10.x for full compatibility, though newer versions may work)
- npm (Node Package Manager)
- A Twilio account with the following:
  - Account SID and Auth Token
  - A TaskRouter Workspace
  - A Programmable Chat Service
  - API Key SID and Secret

## Installation Steps

1. Clone the repository (if you haven't already)

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the root directory with the following variables:
   ```
   # Twilio Account Information
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WORKSPACE_SID=your_workspace_sid
   TWILIO_CHAT_SERVICE_SID=your_chat_service_sid
   TWILIO_API_KEY_SID=your_api_key_sid
   TWILIO_API_KEY_SECRET=your_api_key_secret
   
   # Optional: Port configuration (default is 5000)
   PORT=5000
   ```

4. Start the application:
   ```
   npm start
   ```

5. The application will start and automatically launch ngrok to create a public URL for your local server. You'll see output similar to:
   ```
   magic happens on port 5000
   ngrok url -> https://xxxx-xxx-xxx-xxx.ngrok.io
   ```

6. Open the ngrok URL in your browser followed by `/setup` (e.g., `https://xxxx-xxx-xxx-xxx.ngrok.io/setup`) to configure the application.

7. Follow the setup instructions to complete the configuration.

## Important Notes

- The ngrok URL changes each time you restart the application, so you'll need to update any external services (like Twilio webhooks) with the new URL.
- For WebRTC functionality (phone calls), you need to use HTTPS, which ngrok provides.
- If you're experiencing issues, check the console logs for error messages.

## Troubleshooting

- If you encounter issues with Twilio services, verify your account credentials and ensure your Twilio account has the necessary services enabled.
- Make sure your Twilio account has sufficient funds for making calls and sending messages.
- Check that your ngrok URL is properly configured in the Twilio console for webhooks.
