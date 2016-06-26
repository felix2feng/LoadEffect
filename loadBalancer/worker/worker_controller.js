// Dependencies
const request = require('request');
const scenariorunner = require('./scripts/scenario');
const Action = require('../../server/models/ActionsModel');

// const primeCreator = require('../testData/primeTester.js');

// Global Variable
let jobsCompleted = 0;

// TODO: CURRENTLY HARD CODED
const resultAddress = 'http://localhost:8000/api/complete';
const requestJob = 'http://localhost:8000/api/requestJob';

const handleJob = jobs => {
  console.log('Got some work from the server', jobs);
  const results = [];
  jobs.forEach(job => {
    const jobResult = {};

    scenariorunner.run(job.targetUrl, job.script)
    .then((runresults) => {
    /*
    runresults: {
      scenarioTime: timeToRunScenarioInMilliseconds,
      transactionTimes: [
        [path, statusCode, elapsedTime, dataSizeInBytes, 'GET'],
      ]
    }
    */
      // TODO: For each job, save actions to the database
      const actionsResults = runresults.transactionTimes;
      for (let i = 0; i < actionsResults.length; i++) {
        // SAVE ITEM TO DATABASE
        const data = {
          statusCode: actionsResults[i].statusCode,
          responseTime: actionsResults[i].elapsedTime,
          // TODO ADD MORE
        };
        const newAction = new Action(data);
        newAction.save()
          .then(() => {
            console.log('Successfully saved');
          })
          .catch(err => {
            console.error(err);
          });
      }
      jobResult[job] = runresults;
      results.push(jobResult);
      jobsCompleted++;
    });
  });
  request.post({
    url: resultAddress,
    json: true,
    body: results,
  });
  // This post response is happening
  request.post(requestJob, (error, response, body) => {
    if (error) {
      console.error(error);
    } else if (body === 'done') {
      console.log('Jobs completed is ', jobsCompleted);
      process.exit();
    } else {
      handleJob(JSON.parse(body).job);
    }
  });
};

module.exports = { handleJob };
