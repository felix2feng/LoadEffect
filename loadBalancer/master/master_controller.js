// Handle all requests to master.js server

/*
CURRENT MVP IMPLEMENTATION SPECIFICATIONS
--All work is handled in the webServer function
--Server reponds when all tasks have been completed
--All tasks live within one request function
--Ideal situation: EC2 instances are spun up every time a request is needed
--NOT DESIGNED FOR SCALE
--Error handling - Redistribute work to workers that have gone offline
*/

// ASSUMPTIONS
const tasksPerJob = 10; // Arbitrary number of actions per job

// Dependencies
const dockerConnection = require('../../webserver/config/docker-config');
const util = require('../../webserver/lib/utils');

// Modules
const Queue = require('../queue');
const divide = require('../divide');
const helpers = require('../helpers');
const Scenario = require('../../webserver/models/ScenariosModel');

// Global Variables
const jobQueue = new Queue();
const status = {
  workerCount: 0,
};
let results = [];
let currentResultAverage = 0;
let currentscenarioID;
let currentUser;
let totalJobs = 0;

// Handle incoming requests from Web Server
const handleJobFromWebServer = (req, res) => {
  // Individual Task Unit
  currentscenarioID = req.body.scenarioID;
  currentUser = req.body.id_user;

  const task = {
    // TODO: Verify Scenario ID is correctly sent
    scenarioID: req.body.scenarioID,
    scenario: req.body.scenarioName,
    user: req.body.id_user,
    targetUrl: req.body.targetUrl,
    script: req.body.script,
  };

  // TODO: Get scenario ID and pass onto task

  // Split up jobs into chunks and place into job queue
  const spawnCount = +req.body.spawnCount;
  totalJobs = spawnCount;

  const jobsToAdd = divide(spawnCount, tasksPerJob);
  const jobBundle = helpers.bundleTasks(task, tasksPerJob);

  for (let i = 0; i < jobsToAdd; i++) {
    jobQueue.addToQueue(jobBundle);
  }

  console.log('queue is', jobQueue.items);
  console.log('total jobs', totalJobs);

  // Wind up number of requested workers
  const workers = req.body.workers;
  // TODO: CHRIS TO PROVIDE CODE TO WIND UP WORKERS
  for (let j = 1; j <= workers; j++) {
    status.workerCount = j;
    const workerName = 'worker'.concat(status.workerCount);
    console.log('creating ' + workerName);
    util.createContainer(dockerConnection, 'node-sender', workerName);
  }

  res.status(201).send('webserver post request received for ' + workers + ' workers');
};

const complete = (req, res) => {
  console.log('Received POST complete request!', req.body);
  // Add to completed jobs list
  console.log('This is results before the concat', results);
  results = results.concat(req.body);
  /*
  [
    runresults: {
      scenarioTime: timeToRunScenarioInMilliseconds,
      transactionTimes: [
        [path, statusCode, elapsedTime, dataSizeInBytes, 'GET'],
      ]
    },
    runresults: {
      scenarioTime: timeToRunScenarioInMilliseconds,
      transactionTimes: [
        [path, statusCode, elapsedTime, dataSizeInBytes, 'GET'],
      ]
    },
  ]
  */

  console.log('These are our results length', results.length);
  console.log('Total jobs', totalJobs);
  if (results.length === totalJobs) {
    console.log('We are done!');

    // TODO do post request with results to the web server

    let totalTime = 0;
    const resultLength = results.length;
    for (let k = 0; k < results.length; k++) {
      totalTime += results[k].scenarioTime;
    }
    const averageTime = totalTime / resultLength;
    // Get specific scenario from the database
    Scenario.where({ scenarioID: currentscenarioID, id_user: currentUser })
      .save({ averageActionTime: averageTime });
  }
  res.status(200).send();
};

const requestJob = (req, res) => {
  console.log('Got a post request on master server! Queue is', jobQueue.items);
  // Check if jobs are available
  if (jobQueue.checkLength() > 0) {
    const job = jobQueue.takeNext();
    res.json({ job });
  } else {
    // If no jobs available send 0
    res.send('done');
  }
};


module.exports = { handleJobFromWebServer, complete, requestJob };
