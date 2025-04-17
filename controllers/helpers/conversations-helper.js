'use strict'

/**
 * Twilio Conversations Helper
 * 
 * This module provides helper functions for working with Twilio Conversations API
 * which replaces the deprecated Programmable Chat API.
 */

const twilio = require('twilio')

const AccessToken = twilio.jwt.AccessToken
const ConversationsGrant = AccessToken.ConversationsGrant

const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
	accountSid: process.env.TWILIO_ACCOUNT_SID
})

/**
 * Creates a new conversation
 * @param {string} friendlyName - The friendly name for the conversation
 * @param {string} uniqueName - The unique name for the conversation
 * @returns {Promise<Object>} - The created conversation
 */
module.exports.createConversation = async (friendlyName, uniqueName) => {
	return client.conversations.v1.conversations.create({
		friendlyName: friendlyName,
		uniqueName: uniqueName
	})
}

/**
 * Fetches a conversation by SID or unique name
 * @param {string} sidOrUniqueName - The SID or unique name of the conversation
 * @returns {Promise<Object>} - The conversation
 */
module.exports.fetchConversation = async (sidOrUniqueName) => {
	return client.conversations.v1.conversations(sidOrUniqueName).fetch()
}

/**
 * Creates a participant in a conversation
 * @param {string} conversationSid - The SID of the conversation
 * @param {string} identity - The identity of the participant
 * @returns {Promise<Object>} - The created participant
 */
module.exports.createParticipant = async (conversationSid, identity) => {
	return client.conversations.v1.conversations(conversationSid)
		.participants
		.create({
			identity: identity
		})
}

/**
 * Creates a message in a conversation
 * @param {string} conversationSid - The SID of the conversation
 * @param {string} author - The author of the message
 * @param {string} body - The body of the message
 * @returns {Promise<Object>} - The created message
 */
module.exports.createMessage = async (conversationSid, author, body) => {
	return client.conversations.v1.conversations(conversationSid)
		.messages
		.create({
			author: author,
			body: body
		})
}

/**
 * Creates an access token for Twilio Conversations
 * @param {string} identity - The identity of the user
 * @param {string} endpointId - The endpoint ID for the user
 * @returns {Object} - The access token
 */
module.exports.createAccessToken = (identity, endpointId) => {
	/* create token */
	const accessToken = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY_SID,
		process.env.TWILIO_API_KEY_SECRET,
		{ ttl: 3600 }
	)

	/* grant the access token Twilio Conversations capabilities */
	const conversationsGrant = new ConversationsGrant({
		serviceSid: process.env.TWILIO_CONVERSATIONS_SERVICE_SID
	})

	accessToken.addGrant(conversationsGrant)
	accessToken.identity = identity

	return accessToken
}
