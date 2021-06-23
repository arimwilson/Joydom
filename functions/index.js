const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.startRound = functions.https.onRequest((request, response) => {
  firebase.database().ref('games/' +gameId).set({
    num_players: 4
    current_double: 9
  })
});

exports.takeTurn = functions.https.onRequest((request, response) => {
  if (request.pieceSelected !== null and request.lineSelected !== null) {
    // place a piece

  } else {
    // need to draw a piece
  }
});

