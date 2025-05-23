/* this route creates tasks for our customers */
const taskrouterHelper = require('./helpers/taskrouter-helper.js');
const chatHelper = require('./helpers/chat-helper.js'); // Deprecated, kept for backward compatibility
const conversationsHelper = require('./helpers/conversations-helper.js');
const videoHelper = require('./helpers/video-helper.js');

module.exports.createCallback = async (req, res) => {
  const attributes = {
    title: 'Callback request',
    text: req.body.text,
    channel: 'callback',
    name: req.body.name,
    team: req.body.team,
    phone: req.body.phone
  };

  try {
    const task = await taskrouterHelper.createTask(attributes);

    const response = {
      taskSid: task.sid
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json(res.convertErrorToJSON(error));
  }
};

module.exports.createChat = async (req, res) => {
  const friendlyName = 'Support Chat with ' + req.body.identity;
  const uniqueName = `chat_room_${Math.random().toString(36).substring(7)}`;

  try {
    // Create a conversation using the Conversations API
    const conversation = await conversationsHelper.createConversation(friendlyName, uniqueName);

    const attributes = {
      title: 'Chat request',
      text: 'Customer entered chat via support page',
      channel: 'chat',
      name: req.body.identity,
      chat: {
        sid: conversation.sid,
        friendlyName: conversation.friendlyName,
        uniqueName: conversation.uniqueName
      }
    };

    const task = await taskrouterHelper.createTask(attributes);

    // Create an access token using the Conversations API
    const response = {
      identity: req.body.identity,
      token: conversationsHelper.createAccessToken(req.body.identity, req.body.endpointId).toJwt(),
      chat: {
        sid: conversation.sid,
        friendlyName: conversation.friendlyName,
        uniqueName: conversation.uniqueName
      },
      taskSid: task.sid
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json(res.convertErrorToJSON(error));
  }
};

module.exports.createVideo = async (req, res) => {
  const roomName = `video_room_${Math.random().toString(36).substring(7)}`;

  const attributes = {
    title: 'Video request',
    text: 'Customer requested video support on web page',
    channel: 'video',
    name: req.body.identity,
    video: {
      roomName: roomName
    }
  };

  try {
    const task = await taskrouterHelper.createTask(attributes);

    const response = {
      identity: req.body.identity,
      token: videoHelper.createAccessToken(req.body.identity, roomName).toJwt(),
      video: {
        roomName: roomName
      },
      taskSid: task.sid
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json(res.convertErrorToJSON(error));
  }
};
