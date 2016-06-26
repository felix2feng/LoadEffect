// All master logic incl. Communication between web server and worker, worker spin up and wind down

// Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Modules
const masterController = require('./master_controller.js');

// DEPENDENCY: [TODO] Need to update with correct port number
const port = process.env.port || 8000;

// Start Express Server
const app = express();
app.set('port', port);

// Middleware
app.use(bodyParser.json());

// Handle POST request from the web server
app.post('/api/master', masterController.webServer);

// Handle POST request for jobs from the worker
app.post('/api/requestJob', masterController.requestJob);

// Handle completion POST request from the worker
app.post('/api/complete', masterController.complete);

// Server listens at specified port
app.listen(app.get('port'), () => {
  console.log(`Master server listening to port ${app.get('port')}`);
});
