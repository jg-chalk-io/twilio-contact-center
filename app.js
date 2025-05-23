'use-strict'

// Load environment variables from .env file
require('dotenv').config()

var express       = require('express')
var bodyParser    = require('body-parser')
var sessions      = require('express-session')
var compression   = require('compression')

const context = require('./context')

var { isRunningOnHeroku, isRunningOnGoogle, isRunningOnVercel } = require('./util-cloud-provider')

/* check the environment the application is running on */
let util

if (isRunningOnHeroku()) {
	console.log('application is running on Heroku')
	util = require('./util-heroku-pg.js')
	util.createConfigurationIfNotExists()
} else if (isRunningOnGoogle()) {
	console.log('application is running on Google App Engine')
	util = require('./util-google-cloud-datastore.js')
	util.createConfigurationIfNotExists()
} else if (isRunningOnVercel()) {
	console.log('application is running on Vercel')
	// For Vercel, we'll use Supabase for configuration storage
	util = require('./util-supabase.js')
	util.createConfigurationIfNotExists()
} else {
	console.log('application is running on unknown host with local configuration')
	util = require('./util-file.js')
}

util.getConfiguration(function (error, configuration) {
	if (error) {
		console.log(error)
	} else {
		context.set({ configuration: configuration })
	}
})

var app = express()

app.set('port', (process.env.PORT || 5000))

app.use(compression())

// Session configuration
const sessionConfig = {
	resave: true,
	saveUninitialized: false,
	secret: process.env.SESSION_SECRET || 'keyboard cat',
	name: 'twilio_call_center_session',
	cookie: {
		maxAge: 3600000,
		secure: process.env.NODE_ENV === 'production'
	}
}

// In production, use a more robust session store if available
app.use(sessions(sessionConfig))

app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({
	extended: true
}))

app.enable('trust proxy')

app.use(function (req, res, next) {

	var replaceErrors = function (key, value) {
		if (value instanceof Error) {
			var error = {}

			Object.getOwnPropertyNames(value).forEach(function (key) {
				error[key] = value[key]
			})

			return error
		}

		return value
	}

	res.convertErrorToJSON = (error) => {
		console.log(error)

		return JSON.stringify(error, replaceErrors)
	}

	next()
})

// Request logger middleware
app.use(function (req, res, next) {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
	next();
});

app.use(function (req, res, next) {
	if (!context.get() || !context.get().configuration) {
		res.status(500).send('error: configuration could not be loaded')
	} else {
		req.configuration = context.get().configuration
		req.util = util
		next()
	}
})

app.use('/', function (req, res, next) {
	if (req.path.substr(0,4) === '/api') {
		res.set({
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=0',
		})
	}

	/* override content type for twiml routes */
	if (req.path.includes('/api/ivr')) {
		res.set({
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=0',
		})
	}

	next()
})

var router = express.Router()

var setup = require('./controllers/setup.js')

router.route('/setup').get(setup.get)
router.route('/setup').post(setup.update)

var setupPhoneNumber = require('./controllers/setup-phone-number.js')

router.route('/setup/phone-number/validate').post(setupPhoneNumber.validate)
router.route('/setup/phone-number').post(setupPhoneNumber.update)

var validate = require('./controllers/validate.js')

router.route('/validate/setup').post(validate.validateSetup)

var tasks = require('./controllers/tasks.js')

router.route('/tasks/callback').post(tasks.createCallback)
router.route('/tasks/chat').post(tasks.createChat)
router.route('/tasks/video').post(tasks.createVideo)

/* routes for agent interface and phone */
var agents = require('./controllers/agents.js')

router.route('/agents/login').post(agents.login)
router.route('/agents/logout').post(agents.logout)
router.route('/agents/session').get(agents.getSession)

var phone = require('./controllers/phone.js')
var phoneIncoming = require('./controllers/phone-incoming.js')

router.route('/phone/incoming').post(phoneIncoming.incoming)
router.route('/phone/call').post(phone.call)
router.route('/phone/call/:sid/add-participant/:phone').post(phone.addParticipant)
router.route('/phone/call/:sid/conference').get(phone.getConference)
router.route('/phone/hold').post(phone.hold)

var phoneTransfer = require('./controllers/phone-transfer.js')

router.route('/phone/transfer/available-workers').get(phoneTransfer.getAvailableWorkers)
router.route('/phone/transfer/:sid').post(phoneTransfer.create)
router.route('/phone/transfer/:sid/forward/:to/initiated-by/:from').post(phoneTransfer.forward)

/* routes for IVR */
var ivr = require('./controllers/ivr.js')

router.route('/ivr/welcome').get(ivr.welcome)
router.route('/ivr/select-team').get(ivr.selectTeam)
router.route('/ivr/create-task').get(ivr.createTask)

/* routes called by the Twilio TaskRouter */
var taskrouter = require('./controllers/taskrouter.js')

router.route('/taskrouter/workspace').get(taskrouter.getWorkspace)
router.route('/taskrouter/activities').get(taskrouter.getActivities)

var workers = require('./controllers/workers.js')

router.route('/workers').get(workers.list)
router.route('/workers').post(workers.create)
router.route('/workers/:id').delete(workers.delete)

/* routes for messaging adapter */
var messagingAdapter = require('./controllers/messaging-adapter.js')

router.route('/messaging-adapter/inbound').post(messagingAdapter.inbound)
router.route('/messaging-adapter/outbound').post(messagingAdapter.outbound)

/* routes for dashboard */
var dashboard = require('./controllers/dashboard.js')

router.route('/dashboard/token').get(dashboard.getToken)
router.route('/dashboard/event').post(dashboard.handleEvent)
router.route('/dashboard/statistics').get(dashboard.syncStatistics)
router.route('/dashboard/tasks').get(dashboard.getTasks)
router.route('/dashboard/sync-tasks').get(dashboard.syncTasks)
router.route('/dashboard/recording-callback').post(dashboard.handleRecordingCallback)
router.route('/dashboard/workers').get(dashboard.getWorkers)
router.route('/dashboard/ems-token').post(dashboard.getEmsToken)

// Serve static files first
app.use(express.static(__dirname + '/public'))

// Explicitly serve dashboard static files
app.use('/dashboard/images', express.static(__dirname + '/public/dashboard/images'))
app.use('/dashboard', express.static(__dirname + '/public/dashboard'))

// API routes
app.use('/api', router)

// Dashboard route - should come after static files
app.get('/dashboard/', dashboard.getDashboard)
app.get('/dashboard/index.html', dashboard.getDashboard)

// Setup ngrok for local development (to expose local server to the internet for Twilio webhooks)
const ngrok = require('ngrok')

const ngrokUrl = async function () {
	const url = await ngrok.connect((process.env.PORT || 5000))
	console.log('ngrok url ->', url)
	console.log('Please use this URL for your Twilio webhooks')
	console.log('After the installation has completed please open ' + url + '/setup to configure the application')
}

app.listen(app.get('port'), function () {
	console.log('magic happens on port', app.get('port'))

	// Only start ngrok in local development environment
	if (!isRunningOnHeroku() && !isRunningOnGoogle()) {
		ngrokUrl()
	}
})
