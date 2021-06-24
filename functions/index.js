const functions = require("firebase-functions");
const admin = require("firebase-admin");
const database = require("firebase-database");
admin.initializeApp();

//   functions.logger.info("Hello logs!", {structuredData: true});

exports.startGame = functions.https.onRequest(async (request, response) => {
  player_number = 1
  let players = Array(request.num_players)
      .fill()
      .map(function() {
          player = {name: "Player ${player_number} ", score: 0};
          player_number++;
          return player;
      })
  const writeResult = await admin.firestore().collection("games").add({
     players: players,
     current_double: 9,
  });
  response.json({
    text: "wrote game successfully!",
  });
});


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

