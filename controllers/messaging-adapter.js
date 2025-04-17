const twilio = require('twilio');
const taskrouterHelper = require('./helpers/taskrouter-helper.js');
const helper = require('./messaging-adapter-helper');
const conversationsHelper = require('./helpers/conversations-helper');

const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
	accountSid: process.env.TWILIO_ACCOUNT_SID
});

module.exports.inbound = async (req, res) => {
	req.direction = 'inbound:';

	console.log(`${req.direction} request received: ${JSON.stringify(req.body)}`);

	/* basic request body validation */
	if (!req.body.From) {
		return res.status(500).json({ message: 'Invalid request body. "From" is required' });
	}

	if (!req.body.Body) {
		return res.status(500).json({ message: 'Invalid request body. "Body" is required' });
	}

	try {
		const channel = await retrieveChannel(req);

		console.log(`${req.direction} channel ${channel.sid} received`);

		if (!await hasActiveTask(req.body.From)) {
			await createTask(req, channel);
		}

		const message = await createMessage(channel, req.body.From, req.body.Body);

		console.log(
			`${req.direction} chat message from ${message.from} on channel ${channel.sid} created, body ${message.body}`
		);

		res.setHeader('Content-Type', 'application/xml');
		res.status(200).end();
	} catch (error) {
		console.log(
			req.direction + 'create chat message failed: %s',
			JSON.stringify(error, Object.getOwnPropertyNames(error))
		);
		res.setHeader('Content-Type', 'application/xml');
		res.status(500).send(JSON.stringify(error, Object.getOwnPropertyNames(error)));
	}
};

const fetchChannel = async (sid) => {
	try {
		// Try to fetch using Conversations API first
		const conversation = await conversationsHelper.fetchConversation(sid);
		return conversation;
	} catch (error) {
		// Fall back to Chat API for backward compatibility
		console.warn('Falling back to Chat API for fetching channel');
		const channel = await client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels(sid).fetch();
		return channel;
	}
};

const retrieveChannel = async (req) => {
	console.log(`${req.direction} retrieve channel for user ${req.body.From}`);

	const uniqueName = `support_channel_${req.body.From}`;
	const friendlyName = `Support Chat with ${req.body.From}`;

	let channel;

	try {
		channel = await fetchChannel(uniqueName);

		return channel;
	} catch (error) {
		if (error.code === 20404) {
			channel = await createChannel(uniqueName, friendlyName, req.body.From);

			return channel;
		} else {
			console.error(
				`${req.direction} retrieve channel failed: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
			);
			throw error;
		}
	}
};

const createChannel = async (uniqueName, friendlyName, from) => {
	const payload = {
		friendlyName: friendlyName,
		uniqueName: uniqueName,
		attributes: JSON.stringify({ forwarding: true })
	};

	// Create conversation using Conversations API
	const conversation = await conversationsHelper.createConversation(friendlyName, uniqueName);

	console.log(`conversation ${conversation.sid} created`);

	// Add participant to the conversation
	const participant = await conversationsHelper.createParticipant(conversation.sid, from);

	console.log(`added participant ${participant.sid} (${from}) to conversation ${conversation.sid}`);

	return conversation;
};

const createMessage = async (channel, from, body) => {
	try {
		// Try to create message using Conversations API
		const message = await conversationsHelper.createMessage(channel.sid, from, body);
		return message;
	} catch (error) {
		// Fall back to Chat API for backward compatibility
		console.warn('Falling back to Chat API for creating message');
		const message = await client.chat
			.services(process.env.TWILIO_CHAT_SERVICE_SID)
			.channels(channel.sid)
			.messages.create({
				from: from,
				body: body
			});
		return message;
	}
};

const hasActiveTask = async (from) => {
	const tasks = await taskrouterHelper.getOngoingTasks(from);

	console.log(`user ${from} has ${tasks.length} ongoing task(s)`);

	return tasks.length > 0;
};

const createTask = async (req, channel) => {
	const attributes = helper.createTaskAttributes(req.body.From, channel);

	const task = await taskrouterHelper.createTask(attributes);

	console.log(` ${req.direction} task ${task.sid} created with attributes ${JSON.stringify(task.attributes)}`);

	return task;
};

const forwardChannel = async (channel, req) => {
	try {
		// Try to get participants using Conversations API
		const participants = await client.conversations.v1.conversations(channel.sid).participants.list();

		await Promise.all(
			participants.map(async (participant) => {
				if (req.body.From !== participant.identity) {
					console.log(`${req.direction} forward message "${req.body.Body}" to identity ${participant.identity}`);

					await forwardMessage(participant.identity, req.body.Body, req);
				}
			})
		);
	} catch (error) {
		// Fall back to Chat API for backward compatibility
		console.warn('Falling back to Chat API for listing members');
		const members = await client.chat
			.services(process.env.TWILIO_CHAT_SERVICE_SID)
			.channels(channel.sid)
			.members.list();

		await Promise.all(
			members.map(async (member) => {
				if (req.body.From !== member.identity) {
					console.log(`${req.direction} forward message "${req.body.Body}" to identity ${member.identity}`);

					await forwardMessage(member.identity, req.body.Body, req);
				}
			})
		);
	}
};

const forwardMessage = async (to, body, req) => {
	const message = await client.messages.create({
		to: to,
		from: helper.getFrom(to, req.configuration),
		body: body
	});

	console.log(
		`${req.direction} message ${message.sid} create, body "${body}" sent to endpoint ${to}, sender is ${helper.getFrom(
			to,
			req.configuration
		)}`
	);

	return message;
};

module.exports.outbound = async (req, res) => {
	req.direction = 'outbound: ';

	console.log(`${req.direction} message received "${req.body.Body}", channel ${req.body.ChannelSid} - ${new Date()}`);

	try {
		const channel = await fetchChannel(req.body.ChannelSid);

		console.log(`${req.direction} channel ${channel.sid} received`);

		let attributes = JSON.parse(channel.attributes);

		if (!attributes.forwarding) {
			console.log(`${req.direction} channel ${channel.sid} needs no forwarding`);
			res.status(200).end();
		} else {
			await forwardChannel(channel, req);

			console.log(`${req.direction} message forwarding for channel ${channel.sid} done`);
			res.status(200).end();
		}
	} catch (error) {
		console.log(`${req.direction} forwarding chat message failed: ${res.convertErrorToJSON(error)}`);
		res.status(500).send(res.convertErrorToJSON(error));
	}
};
