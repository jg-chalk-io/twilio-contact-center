# Migrating to Twilio Conversations API

This document provides information about the migration from Twilio Programmable Chat API to Twilio Conversations API in the Twilio Contact Center application.

## Overview

Twilio Programmable Chat API has been deprecated in favor of the new Twilio Conversations API. The Conversations API provides all the functionality of the Chat API plus additional features like:

- Cross-channel messaging (SMS, MMS, WhatsApp, and chat)
- Delivery receipts
- States and timers
- Group MMS ("Group Texting")

## Changes Made

The following changes have been made to migrate from Programmable Chat to Conversations:

1. **Environment Variables**:
   - Added `TWILIO_CONVERSATIONS_SERVICE_SID` to the `.env` file
   - Kept `TWILIO_CHAT_SERVICE_SID` for backward compatibility

2. **New Helper Module**:
   - Created `controllers/helpers/conversations-helper.js` with Conversations API functionality
   - Updated `controllers/helpers/chat-helper.js` to use the new conversations helper for backward compatibility

3. **Server-Side Code**:
   - Updated token generation to include Conversations grants
   - Updated channel creation to use Conversations API
   - Updated message handling to use Conversations API
   - Added fallback to Chat API for backward compatibility

4. **Client-Side Code**:
   - Updated the client initialization to use Conversations Client
   - Added fallback to Chat Client for backward compatibility

## Required Environment Variables

Make sure your `.env` file includes the following variables:

```
# Twilio Account Information
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WORKSPACE_SID=your_workspace_sid

# Twilio Conversations Service (replaces Chat Service)
TWILIO_CONVERSATIONS_SERVICE_SID=your_conversations_service_sid

# For backward compatibility (deprecated)
TWILIO_CHAT_SERVICE_SID=your_chat_service_sid

# Twilio API Keys
TWILIO_API_KEY_SID=your_api_key_sid
TWILIO_API_KEY_SECRET=your_api_key_secret
```

## Setting Up Twilio Conversations

To set up Twilio Conversations for your application:

1. **Create a Conversations Service**:
   - Go to the [Twilio Console](https://www.twilio.com/console/conversations/services)
   - Click "Create Conversations Service"
   - Give your service a name (e.g., "Contact Center")
   - Copy the Service SID (starts with IS...)
   - Add it to your `.env` file as `TWILIO_CONVERSATIONS_SERVICE_SID`

2. **Create API Keys** (if you don't already have them):
   - Go to the [Twilio Console](https://www.twilio.com/console/dev-tools/api-keys)
   - Click "Create API Key"
   - Give your key a name (e.g., "Contact Center API Key")
   - Copy the SID and Secret
   - Add them to your `.env` file as `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET`

## Client-Side Libraries

Make sure to update your client-side libraries to include the Twilio Conversations SDK:

```html
<!-- Include the Twilio Conversations SDK -->
<script src="https://sdk.twilio.com/js/conversations/releases/2.0.0/twilio-conversations.min.js"></script>

<!-- Keep the Chat SDK for backward compatibility -->
<script src="https://media.twiliocdn.com/sdk/js/chat/releases/3.3.0/twilio-chat.min.js"></script>
```

## Backward Compatibility

The migration has been implemented with backward compatibility in mind:

- The application will first try to use the Conversations API
- If that fails, it will fall back to the Chat API
- This ensures that existing channels and functionality continue to work during the transition

## Testing

After deploying the changes, test the following functionality:

1. **Creating a new chat**: Verify that new chats are created using the Conversations API
2. **Sending messages**: Verify that messages can be sent and received
3. **Agent interactions**: Verify that agents can join conversations and interact with customers

## Troubleshooting

If you encounter issues:

1. **Check the console logs**: Look for errors or warnings related to Conversations or Chat
2. **Verify your credentials**: Make sure your Conversations Service SID and API keys are correct
3. **Check for browser compatibility**: The Conversations SDK requires modern browsers

## Additional Resources

- [Twilio Conversations Documentation](https://www.twilio.com/docs/conversations)
- [Migrating from Programmable Chat to Conversations](https://www.twilio.com/docs/conversations/migrating-chat-conversations)
- [Conversations JavaScript SDK](https://www.twilio.com/docs/conversations/javascript)
