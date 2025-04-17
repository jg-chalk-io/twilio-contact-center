/**
 * DEPRECATED: This module is deprecated and will be removed in a future version.
 * Please use the conversations-helper.js module instead.
 */

const conversationsHelper = require('./conversations-helper')

// For backward compatibility, we're redirecting to the new conversations helper
module.exports.createChannel = async (friendlyName, uniqueName) => {
	console.warn('WARNING: chat-helper.createChannel is deprecated. Use conversations-helper.createConversation instead.')
	return conversationsHelper.createConversation(friendlyName, uniqueName)
}

module.exports.createAccessToken = (identity, endpointId) => {
	console.warn('WARNING: chat-helper.createAccessToken is deprecated. Use conversations-helper.createAccessToken instead.')
	return conversationsHelper.createAccessToken(identity, endpointId)
}