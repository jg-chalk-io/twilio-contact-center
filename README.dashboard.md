# Twilio TaskRouter Realtime Dashboard Integration

This document provides instructions for setting up and using the Twilio TaskRouter Realtime Dashboard that has been integrated into the Twilio Contact Center application.

## Overview

The Twilio TaskRouter Realtime Dashboard provides real-time monitoring of your contact center operations, including:

- Task counts by status (pending, reserved, assigned, completed, canceled)
- Agent counts by activity (available, reserved, unavailable)
- Average task acceptance time
- Detailed task information including channel, team, agent, priority, and status

## Prerequisites

Before using the dashboard, you need to set up a Twilio Sync Service:

1. Log in to your [Twilio Console](https://www.twilio.com/console)
2. Navigate to Sync > Services
3. Click "Create Sync Service"
4. Give your service a name (e.g., "Contact Center Dashboard")
5. Copy the Service SID (starts with IS...)
6. Add the Service SID to your .env file as `TWILIO_SYNC_SERVICE_SID`

## Configuration

The dashboard requires the following environment variables to be set in your .env file:

```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WORKSPACE_SID=your_workspace_sid
TWILIO_API_KEY_SID=your_api_key_sid
TWILIO_API_KEY_SECRET=your_api_key_secret
TWILIO_SYNC_SERVICE_SID=your_sync_service_sid
```

## TaskRouter Workspace Configuration

To enable real-time updates in the dashboard, you need to configure your TaskRouter Workspace to send events to the dashboard:

1. In your Twilio Console, go to TaskRouter > Workspaces
2. Select your workspace and go to Settings
3. Under "Event Callbacks", check the following events:
   - Task Created
   - Task Completed
   - Task Canceled
   - Task Wrapup
   - Task Updated
   - Reservation Created
   - Reservation Accepted
   - Reservation Rejected
   - Reservation Timeout
   - Reservation Canceled
   - Reservation Completed
   - Worker Activity Updated
4. Set the "Event Callback URL" to `https://<your-app-url>/api/dashboard/event`
5. Save the changes

## Accessing the Dashboard

Once everything is set up, you can access the dashboard at:

```
https://<your-app-url>/dashboard
```

## How It Works

1. TaskRouter generates events and sends them to the Event Callback URL
2. The server processes these events and updates Twilio Sync documents
3. The dashboard frontend subscribes to these Sync documents and updates in real-time
4. The dashboard also periodically fetches current tasks and statistics

## Troubleshooting

If the dashboard is not updating in real-time:

1. Check that your TaskRouter Workspace is configured to send events to the correct URL
2. Verify that your Twilio Sync Service SID is correctly set in your .env file
3. Check the server logs for any errors related to Twilio Sync or TaskRouter
4. Ensure that your Twilio account has the necessary permissions and credits

## Additional Resources

- [Twilio TaskRouter Documentation](https://www.twilio.com/docs/taskrouter)
- [Twilio Sync Documentation](https://www.twilio.com/docs/sync)
