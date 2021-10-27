
const functions = require("firebase-functions");
const moment  = require("moment")
const _ = require("lodash"); 
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const admin = require('firebase-admin');
admin.initializeApp();
const firestore = admin.firestore();

// const Firestore = require('@google-cloud/firestore');
// // Use your project ID here
// const PROJECTID = '[YOUR_PROJECT_ID]';
// const firestore = new Firestore({
//   projectId: PROJECTID,
//   timestampsInSnapshots: true
//   // NOTE: Don't hardcode your project credentials here.
//   // If you have to, export the following to your shell:
//   //   GOOGLE_APPLICATION_CREDENTIALS=<path>
//   // keyFilename: '/cred/cloud-functions-firestore-000000000000.json',
// });
const COLLECTION_NAME = 'scheduler-runtime';

exports.dailyScheduledFunction = functions.pubsub.schedule('0 0 * * *')
  // .timeZone('America/New_York')
  .onRun((context) => {
  console.log('This will be run daily at midnight', context);
  functions.logger.info("Scheduler Checking!", {structuredData: true}, context);
  const runTime = moment.now();

  firestore.collection(COLLECTION_NAME).add({
    runTime,
  }).then(doc => {
    console.info('Stored new entry id#', doc.id);
  }).catch(err => {
    console.error(err);
  });

  const investmentData = []
  const day = moment().get('date');
  console.log('Fetching investments to create transactions for Day:', day);
  firestore.collection('userInvestments').get()
    .then(resp => {
      _.forEach(resp.docs, doc => {
        const data = doc.data();
        investmentData.push(data)
        const active = _.get(data, 'active', true);
        const investedDate = _.get(data, 'time_stamp');
        const investedDay = moment(investedDate).get('date')
        console.log('Data:', data, ', Invested Day:', investedDay, active);
        if (active && investedDay === day){
          console.log('Adding Transaction for ', doc.id);
          addTransactions(_.get(data, 'amount'), _.get(data, 'user'), _.get(data, 'recipient'))
        }
      })
    })
    .catch((e) => {
      console.error(e);
    });
  console.log('Returning Success')
  return 'success';
});

function addTransactions (amount, userId, recipientId) {
  const transDoc = {
    amount: amount,
    recipient: recipientId,
    sender: userId,
    timestamp: moment.now(),
  };
  const ref = firestore.collection("transactions")
  ref.add(transDoc)
    .then(doc => {
      console.info('Successfully added transaction', doc.id);
    }).catch(err => {
      console.error(err);
    })
}
