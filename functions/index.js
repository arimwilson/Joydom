const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.startRound = functions.https.onRequest(async (request, response) => {
  // const writeResult = await admin.firestore().collection("games").add({
  //   num_players: 4,
  //   current_double: 9,
  // });
  response.json({
  });
});

exports.takeTurn = functions.https.onRequest((request, response) => {
  if (request.pieceSelected !== null && request.lineSelected !== null) {
    // place a piece

  } else {
    // need to draw a piece
  }
  response.send("hello from firebase");
});

