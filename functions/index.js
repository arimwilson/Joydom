const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.startGame = functions.https.onCall((data, context) => {
  // functions.logger.info(data);
  const players = Array(data.numPlayers);
  for (let playerNumber = 1; playerNumber <= data.numPlayers; ++playerNumber) {
    players[playerNumber - 1] = {
      name: "Player " + playerNumber,
      score: 0,
    };
  }
  const game = {
    players: players, currentDouble: 9,
    unusedDoubles: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  };
  admin.database().ref(`game/${data.gameId}`).set(game);
});


exports.startRound = functions.https.onRequest(async (request, response) => {
  // const writeResult = await admin.firestore().collection("games").add({
  //   numPlayers: 4,
  //   currentDouble: 9,
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

