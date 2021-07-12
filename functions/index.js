const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.startGame = functions.https.onCall((data, context) => {
  let players = Array(data.numPlayers);
  for (let playerNumber = 1; playerNumber <= players.length;
       ++playerNumber) {
    players[playerNumber - 1] = {
      name: "Player " + playerNumber,
      score: 0,
    };
  }
  const game = {
    players: players,
    unusedDoubles: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  };
  admin.database().ref(`game/${data.gameId}`).set(game);
});

class DominoTile {
  constructor(end1, end2) {
    this.end1 = end1;
    this.end2 = end2;
  }

  equals(tile2) {
    return this.end1 == tile2.end1 && this.end2 == tile2.end2;
  }

  swapIfNeeded(tile2) {
    if (this.end1 != tile2.end2) {
      const end2 = this.end2;
      this.end2 = this.end1;
      this.end1 = end2;
    }
  }

  match(tile2) {
    return this.end1 == tile2.end2 || this.end2 == tile2.end2;
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

function startRound(game) {
  // double 9 set has 55 tiles - (n+1)(n=2)/2
  const tiles = Array(55);
  for (let end1 = 0, i = 0; end1 <= 9; ++end1) {
    for (let end2 = 0; end2 <= end1; ++end2) {
      tiles[i++] = new DominoTile(end1, end2);
    }
  }
  const shuffled_tiles = getShuffledArray(tiles);
  const tiles_per_player = getTilesPerPlayer(game.players.length);
  for (let i = 0; i < game.players.length; ++i) {
    const tile_index = i * tiles_per_player;
    game.players[i].hand = shuffled_tiles.slice(
        tile_index, tile_index + tiles_per_player);
    game.players[i].penny = false;
    game.players[i].walking = false;
    delete game.players[i].line;
  }
  game.boneyard = shuffled_tiles.slice(game.players.length * tiles_per_player);
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
}

exports.startRound = functions.https.onCall((data, context) => {
  admin.database().ref(`game/${data.gameId}`).get().then((snapshot) => {
    let game = snapshot.val();
    startRound(game);
    admin.database().ref(`game/${data.gameId}`).set(game);
  })
  .catch((error) => {
    throw error;
  });
});

const actions = {
  NONE: 0,
  PLAY: 1,
  DRAW: 2,
  PASS: 3,
  WALKING: 4,
}

exports.takeAction = functions.https.onCall((data, context) => {
  return admin.database().ref(`game/${data.gameId}`).get().then((snapshot) => {
    var game = snapshot.val();
    const gameId = data.gameId;
    let currentPlayerIndex = 0;
    for (; currentPlayerIndex < game.players.length; currentPlayerIndex++) {
      if (game.players[currentPlayerIndex].name == game.currentPlayer) {
        break;
      }
    }
    delete data.gameId;
    if ("currentActions" in game) {
      game.currentActions.unshift(data);
    } else {
      game.currentActions = [data];
    }
    switch (data.action) {
      case actions.PLAY:
        // note: this makes the game not work for double sets above 9
        const tile = new DominoTile(Math.floor(data.tile / 10), data.tile % 10);
        let inHand = false;
        for (let i = 0; i < game.players[currentPlayerIndex].hand.length; i++) {
          if (tile.equals(game.players[currentPlayerIndex].hand[i])) {
            inHand = true;
            game.players[currentPlayerIndex].hand.splice(i, 1);
            break;
          }
        }
        if (!inHand) {
          throw new functions.https.HttpsError(
            'invalid-argument', 'Can\'t play tile not in hand.');
        }
        if ("line" in game.players[data.line - 1]) {
          const line = game.players[data.line - 1].line;
          /*if (tile.match(line[line.length - 1])) {
            tile.swapIfNeeded(line[line.length - 1]);
          } else {
            throw new functions.https.HttpsError(
                'invalid-argument', 'Can\'t play on non-matching tile.');
          }*/
          game.players[data.line - 1].line.push(tile);
        } else {
          const currentDouble = new DominoTile(
              game.currentDouble, game.currentDouble);
          if (tile.match(currentDouble)) {
            tile.swapIfNeeded(currentDouble);
          } else {
            throw new functions.https.HttpsError(
                'invalid-argument', 'Can\'t play on non-matching tile.');
          }
          game.players[data.line - 1].line = [tile]
        }
        game.players[currentPlayerIndex].hand.splice()
        break;
      case actions.DRAW:
        if ("hand" in game.players[currentPlayerIndex]) {
          game.players[currentPlayerIndex].hand.push(game.boneyard[0]);
        } else {
          game.players[currentPlayerIndex].hand = [game.boneyard[0]];
        }
        game.boneyard.splice(0, 1);
        break;
      case actions.PASS:
        // can only pass if you've either played or drawn
        if (!game.hasOwnProperty("currentActions")) {
          throw new functions.https.HttpsError(
              'invalid-argument', 'Can\'t pass without playing or drawing.');
        }
        let playedOrDrew = false;
        for (let i = 0; i < game.currentActions.length; i++) {
          if (game.currentActions[i].action === actions.PLAY ||
              game.currentActions[i].action === actions.DRAW) {
            playedOrDrew = true;
            break;
          }
        }
        if (!playedOrDrew) {
          throw new functions.https.HttpsError(
              'invalid-argument', 'Can\'t pass without playing or drawing.');
        }
        // check for win condition
        if (game.players[currentPlayerIndex].walking &&
            !("hand" in game.players[currentPlayerIndex])) {
          // win!
          for (let i = 0; i < game.players.length; i++) {
            let roundScore = 0;
            if ("hand" in game.players[i]) {
              for (let j = 0; j < game.players[i].hand.length; j++) {
                const tile = game.players[i].hand[j];
                roundScore += tile.end1 + tile.end2;
              }
            }
            game.players[i].score += roundScore;
          }
          startRound(game);
          break;
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
    admin.database().ref(`game/${gameId}`).set(game);
  })
  .catch((error) => {
    throw error;
  });
});

