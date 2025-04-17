'use strict'

const twilio = require('twilio')
const AccessToken = twilio.jwt.AccessToken
const SyncGrant = AccessToken.SyncGrant

// Task to Worker mapping
const taskWorker = {}

// Task Sid to Recording URLs mapping
const taskSidRecordingUrl = {}

/**
 * Generates a Twilio Sync token for the dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getToken = function(req, res) {
	// Get the user identity from the request
	const identity = req.query.identity || 'dashboard-user'

	// Create access token with credentials
	const token = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY_SID,
		process.env.TWILIO_API_KEY_SECRET,
		{identity: identity}
	)

	// Create a Sync grant and add to token
	const syncGrant = new SyncGrant({
		serviceSid: process.env.TWILIO_SYNC_SERVICE_SID
	})
	token.addGrant(syncGrant)

	// Return token info as JSON
	res.json({
		identity: identity,
		token: token.toJwt()
	})
}

/**
 * Handles TaskRouter events and updates Sync documents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleEvent = function(req, res) {
	const requestData = req.body

	// Store the Task to WorkerName mapping
	if (requestData.EventType === 'reservation.accepted' || requestData.EventType === 'reservation.created') {
		taskWorker[requestData.TaskSid] = requestData.WorkerName
	}

	// Create Twilio client
	const client = twilio(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN
	)

	// Update Sync document with event data
	client.sync.v1.services(process.env.TWILIO_SYNC_SERVICE_SID)
		.documents('SyncTaskRouterEvents')
		.update({data: requestData})
		.then(() => {
			console.log('Event synced')

			// Sync statistics
			syncTaskRouterStatistics(client)
		})
		.catch(err => console.error('Error syncing event:', err))

	res.send('OK')
}

/**
 * Gets and syncs TaskRouter statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.syncStatistics = function(req, res) {
	// Create Twilio client
	const client = twilio(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN
	)

	syncTaskRouterStatistics(client)
		.then(() => res.send('OK'))
		.catch(err => {
			console.error('Error syncing statistics:', err)
			// Return a more detailed error message
			res.status(500).json({
				error: 'Error syncing statistics',
				details: err.message,
				stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
			})
		})
}

/**
 * Gets current tasks from TaskRouter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTasks = function(req, res) {
	// Create Twilio client
	const client = twilio(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN
	)

	client.taskrouter.v1.workspaces(process.env.TWILIO_WORKSPACE_SID)
		.tasks
		.list({ordering: 'Priority:desc,DateCreated:asc'})
		.then(tasks => {
			const tasksResults = []

			tasks.forEach(task => {
				const taskModel = {
					TaskSid: task.sid,
					Priority: task.priority
				}

				// Parse task attributes
				const attributes = JSON.parse(task.attributes)
				Object.assign(taskModel, attributes)

				// Add worker name if available
				try {
					taskModel.WorkerName = taskWorker[task.sid] || ""
				} catch (e) {
					taskModel.WorkerName = ""
				}

				// Workaround for video channel task missing team name
				if (taskModel.channel === 'video') {
					taskModel.team = 'Support'
				}

				// Get previously stored recording url
				try {
					taskModel.RecordingUrl = taskSidRecordingUrl[task.sid] || ""
				} catch (e) {
					taskModel.RecordingUrl = ""
				}

				taskModel.TaskStatus = task.assignment_status
				tasksResults.push(taskModel)
			})

			res.json(tasksResults)
		})
		.catch(err => {
			console.error('Error fetching tasks:', err)
			res.status(500).json({error: 'Error fetching tasks'})
		})
}

/**
 * Syncs tasks to Twilio Sync
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.syncTasks = function(req, res) {
	// Create Twilio client
	const client = twilio(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN
	)

	// First get all tasks
	exports.getTasks({}, {
		json: function(tasksResults) {
			const syncMap = 'SyncTaskRouterTasks'

			// Delete the current Sync Map and re-create if we have Tasks
			if (tasksResults.length > 0) {
				// Delete the Sync Map
				client.sync.v1.services(process.env.TWILIO_SYNC_SERVICE_SID)
					.syncMaps(syncMap)
					.remove()
					.catch(err => {
						// Ignore error if map doesn't exist
						console.log('Map deletion error (may not exist yet):', err)
					})
					.then(() => {
						// Create a new Sync Map
						return client.sync.v1.services(process.env.TWILIO_SYNC_SERVICE_SID)
							.syncMaps
							.create({uniqueName: syncMap})
					})
					.then(() => {
						// Add each task to the Sync Map
						const promises = tasksResults.map(task => {
							return client.sync.v1.services(process.env.TWILIO_SYNC_SERVICE_SID)
								.syncMaps(syncMap)
								.syncMapItems
								.create({
									key: task.TaskSid,
									data: task
								})
						})

						return Promise.all(promises)
					})
					.then(() => {
						console.log('Tasks synced successfully')
					})
					.catch(err => {
						console.error('Error syncing tasks:', err)
					})
			}

			res.send('OK')
		},
		status: function() {
			return {
				json: function(error) {
					res.status(500).json(error)
				}
			}
		}
	})
}

/**
 * Handles recording callbacks from Twilio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleRecordingCallback = function(req, res) {
	const taskSid = req.body.TaskSid
	const recordingUrl = req.body.RecordingUrl + ".mp3"

	taskSidRecordingUrl[taskSid] = recordingUrl
	res.send('OK')
}

/**
 * Gets workers from TaskRouter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getWorkers = function(req, res) {
	// Create Twilio client
	const client = twilio(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN
	)

	client.taskrouter.v1.workspaces(process.env.TWILIO_WORKSPACE_SID)
		.workers
		.list()
		.then(workers => {
			const workersResults = []

			workers.forEach(worker => {
				const workerModel = {
					worker_sid: worker.sid,
					friendly_name: worker.friendly_name,
					activity_name: worker.activity_name,
					account_sid: worker.account_sid,
					workspace_sid: worker.workspace_sid
				}

				// Parse worker attributes
				const attributes = JSON.parse(worker.attributes)
				Object.assign(workerModel, attributes)

				workersResults.push(workerModel)
			})

			res.json(workersResults)
		})
		.catch(err => {
			console.error('Error fetching workers:', err)
			res.status(500).json({error: 'Error fetching workers'})
		})
}

/**
 * Serves the dashboard HTML page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboard = function(req, res) {
	res.sendFile(process.cwd() + '/public/dashboard/taskrouter_dashboard.html')
}

/**
 * Proxy for Twilio EMS token requests to avoid CORS issues
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEmsToken = function(req, res) {
	const axios = require('axios')
	const url = 'https://ems.us1.twilio.com/v1/token'

	console.log('Received EMS token request with body:', JSON.stringify(req.body))

	// If the request body is empty, use a default payload
	const payload = Object.keys(req.body).length === 0 ? {
		identity: 'dashboard-user',
		product: 'flex',
		token_ttl: 3600
	} : req.body

	// Forward the request to Twilio EMS with proper headers
	axios.post(url, payload, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Basic ' + Buffer.from(
				process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN
			).toString('base64')
		}
	})
	.then(response => {
		console.log('EMS token request successful')
		res.json(response.data)
	})
	.catch(error => {
		console.error('Error proxying EMS token request:', error.message)
		if (error.response) {
			console.error('Response data:', error.response.data)
			console.error('Response status:', error.response.status)
		}
		res.status(500).json({
			error: 'Error proxying EMS token request',
			details: error.message,
			response: error.response ? error.response.data : null
		})
	})
}

/**
 * Helper function to sync TaskRouter statistics to Twilio Sync
 * @param {Object} client - Twilio client
 * @returns {Promise} - Promise that resolves when statistics are synced
 */
function syncTaskRouterStatistics(client) {
	const stats = {}

	// Get Workspace statistics from last 60 minutes
	return client.taskrouter.v1.workspaces(process.env.TWILIO_WORKSPACE_SID)
		.statistics()
		.fetch({minutes: 60})
		.then(statistics => {
			console.log('Retrieved TaskRouter statistics')

			// Process statistics data
			stats.totalTasks = statistics.realtime.total_tasks
			stats.totalWorkers = statistics.realtime.total_workers

			// Process task statuses
			const taskStatuses = statistics.realtime.tasks_by_status
			for (const [key, value] of Object.entries(taskStatuses)) {
				const taskStatus = key + 'Tasks'
				stats[taskStatus] = value
			}

			// Process worker activities
			for (const activity of statistics.realtime.activity_statistics) {
				if (activity.friendly_name === 'Offline') {
					stats.activityOfflineWorkers = activity.workers
				} else if (activity.friendly_name === 'Idle') {
					stats.activityIdleWorkers = activity.workers
				} else if (activity.friendly_name === 'Reserved') {
					stats.activityReservedWorkers = activity.workers
				} else if (activity.friendly_name === 'Busy') {
					stats.activityBusyWorkers = activity.workers
				}
			}

			stats.avgTaskAcceptanceTime = statistics.cumulative.avg_task_acceptance_time
			stats.startTime = statistics.cumulative.start_time
			stats.endTime = statistics.cumulative.end_time

			console.log('Processed statistics:', JSON.stringify(stats))

			// Update Sync document with statistics
			return client.sync.v1.services(process.env.TWILIO_SYNC_SERVICE_SID)
				.documents('SyncTaskRouterStats')
				.update({data: stats})
				.catch(err => {
					console.log('Error updating Sync document:', err.message)
					// If document doesn't exist, create it
					if (err.code === 20404) {
						console.log('Sync document not found, creating it')
						return client.sync.v1.services(process.env.TWILIO_SYNC_SERVICE_SID)
							.documents
							.create({
								uniqueName: 'SyncTaskRouterStats',
								data: stats
							})
					}
					throw err
				})
		})
		.then(() => {
			console.log('Statistics synced successfully')
			return Promise.resolve()
		})
		.catch(err => {
			console.error('Error syncing statistics:', err.message)
			if (err.code) {
				console.error('Error code:', err.code)
			}
			return Promise.reject(err)
		})
}
