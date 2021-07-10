const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

class DominoTile {
  constructor(end1, end2) {
    this.end1 = end1;
    this.end2 = end2;
  }
}

function getShuffledArray(arr) {
  var shuffled = arr.slice(0), i = arr.length, temp, index;
  while (i--) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled;
}

function getTilesPerPlayer(numPlayers) {
  switch (numPlayers) {
    case 2:
    case 3:
    case 4:
      return 9;
      break;
    case 5:
    case 6:
      return 8;
      break;
    case 7:
    case 8:
      return 6;
      break;
    default:
      throw new functions.https.HttpsError(
          'invalid-argument', 'Too few or many players specified.');
  }
}

function isDoubleFun(currentDouble) {
  return (tile) => tile.end1 === currentDouble && tile.end2 === currentDouble;
}

const actions = {
  NONE: 0,
  PLAY: 1,
  DRAW: 2,
  PASS: 3,
  WALKING: 4,
}

exports.startGame = functions.https.onCall((data, context) => {
  // double 9 set has 55 tiles - (n+1)(n=2)/2
  const tiles = Array(55);
  for (let end1 = 0, i = 0; end1 <= 9; ++end1) {
    for (let end2 = 0; end2 <= end1; ++end2) {
      tiles[i++] = new DominoTile(end1, end2);
    }
  }
  const shuffled_tiles = getShuffledArray(tiles);
  const tiles_per_player = getTilesPerPlayer(data.numPlayers);
  let players = Array(data.numPlayers);
  for (let playerNumber = 1; playerNumber <= players.length;
       ++playerNumber) {
    const tile_index = (playerNumber - 1) * tiles_per_player;
    players[playerNumber - 1] = {
      name: "Player " + playerNumber,
      score: 0,
      hand: shuffled_tiles.slice(tile_index, tile_index + tiles_per_player),
      penny: false,
      walking: false,
    };
  }
  const game = {
    players: players,
    unusedDoubles: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    boneyard: shuffled_tiles.slice(data.numPlayers * tiles_per_player)
  };
  // find current double in players hands and play it and set current player. if
  // it's not there, check for the next unsuded double. if none of the unused
  // doubles are in player hands, add tiles to player hands from boneyard until
  // they have one.
  let foundDouble = false;
  while (!foundDouble) {
    for (let i = 0; i < game.unusedDoubles.length; i++) {
      game.currentDouble = game.unusedDoubles[i];
      for (let j = 0; j < game.players.length; j++) {
        let doubleIndex = game.players[j].hand.findIndex(isDoubleFun(game.currentDouble));
        if (doubleIndex !== -1) {
          game.players[j].line = [new DominoTile(
              game.currentDouble, game.currentDouble)];
          game.players[j].hand.splice(doubleIndex, 1);
          game.currentPlayer = game.players[j].name;
          game.unusedDoubles.splice(i, 1);
          foundDouble = true;
          break;
        }
      }
      if (foundDouble) break;
    }
    if (foundDouble) break;
    for (let i = 0; i < game.players.length; i++) {
      game.players[i].hand.push(game.boneyard[0]);
      game.boneyard.splice(0, 1);
    }
  }
  admin.database().ref(`game/${data.gameId}`).set(game);
});

exports.startRound = functions.https.onCall((data, context) => {
  // const writeResult = await admin.firestore().collection("games").add({
  //   numPlayers: 4,
  //   currentDouble: 9,
  // });
  response.json({
  });
});

exports.takeAction = functions.https.onCall((data, context) => {
  admin.database().ref(`game/${data.gameId}`).get().then((snapshot) => {
    var game = snapshot.val();
    let currentPlayerIndex = 0;
    for (; currentPlayerIndex < game.players.length; currentPlayerIndex++) {
      if (game.players[currentPlayerIndex].name == game.currentPlayer) {
        break;
      }
    }
    switch (data.action) {
      case actions.PLAY:
        // play(game, data.tile, data.line);
        break;
      case actions.DRAW:
        // draw(game);
        break;
      case actions.PASS:
        // can only pass if you've either played or drawn
        if (!game.hasOwnProperty("currentActions")) {
          return new functions.https.HttpsError(
              'invalid-argument', 'Can\'t pass without drawing or playing.');
        }
        let playedOrDrew = false;
        for (let i = 0; i < game.currentActions.length; i++) {
          if (game.currentActions.action === actions.PLAY ||
              game.currentActions.action === actions.DRAW) {
            playedOrDrew = true;
            break;
          }
        }
        if (!playedOrDrew) {
          return new functions.https.HttpsError(
              'invalid-argument', 'Can\'t pass without drawing or playing.');
        }
        const nextPlayer = (currentPlayerIndex + 1) % game.players.length + 1
        game.currentPlayer = `Player ${nextPlayer}`;
        delete game.currentActions;
        break;
      case actions.WALKING:
        game.players[currentPlayerIndex].walking = true;
        break;
      default:
        return new functions.https.HttpsError(
            'invalid-argument', 'Invalid action specified.');
    }
    if ("currentActions" in game) {
      game.currentActions.unshift(data);
    } else {
      game.currentActions = [data];
    }
    admin.database().ref(`game/${data.gameId}`).set(game);
  }, function(error) { functions.logger.log(error) });
});

