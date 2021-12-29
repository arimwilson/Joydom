const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

let MAX_DOUBLE = 9;

exports.startGame = functions.https.onCall((data, context) => {
  const players = Array(data.numPlayers);
  for (let playerNumber = 1; playerNumber <= players.length;
    ++playerNumber) {
    players[playerNumber - 1] = {
      name: "Player " + playerNumber,
      score: 0,
    };
  }
  const game = {
    players: players,
    unusedDoubles:  [...Array(MAX_DOUBLE + 1).keys()].map(x => MAX_DOUBLE - x),
  };
  return admin.database().ref(`game/${data.gameId}`).set(game);
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
  const shuffled = arr.slice(0); let i = arr.length; let temp; let index;
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
    case 5:
    case 6:
      return 8;
    case 7:
    case 8:
      return 6;
    default:
      throw new functions.https.HttpsError(
          "invalid-argument", "Too few or many players specified.");
  }
}

function isDoubleFun(currentDouble) {
  return (tile) => tile.end1 === currentDouble && tile.end2 === currentDouble;
}

function startRound(game) {
  // double 9 set has 55 tiles - (n+1)(n+2)/2
  const tiles = Array((MAX_DOUBLE + 1)*(MAX_DOUBLE + 2) / 2);
  for (let end1 = 0, i = 0; end1 <= MAX_DOUBLE; ++end1) {
    for (let end2 = 0; end2 <= end1; ++end2) {
      tiles[i++] = new DominoTile(end1, end2);
    }
  }
  const shuffledTiles = getShuffledArray(tiles);
  const tilesPerPlayer = getTilesPerPlayer(game.players.length);
  for (let i = 0; i < game.players.length; ++i) {
    const tileIndex = i * tilesPerPlayer;
    game.players[i].hand = shuffledTiles.slice(
        tileIndex, tileIndex + tilesPerPlayer);
    game.players[i].penny = false;
    delete game.players[i].walking;
    delete game.players[i].line;
  }
  game.boneyard = shuffledTiles.slice(game.players.length * tilesPerPlayer);
  // find current double in players hands and play it and set current player. if
  // it's not there, check for the next unsuded double. if none of the unused
  // doubles are in player hands, add tiles to player hands from boneyard until
  // they have one.
  let foundDouble = false;
  while (!foundDouble) {
    for (let i = 0; i < game.unusedDoubles.length; i++) {
      game.currentDouble = game.unusedDoubles[i];
      for (let j = 0; j < game.players.length; j++) {
        const doubleIndex = game.players[j].hand.findIndex(isDoubleFun(
            game.currentDouble));
        if (doubleIndex !== -1) {
          game.players[j].hand.splice(doubleIndex, 1);
          game.currentPlayer = game.players[j].name;
          game.currentActions = [
            {action: actions.PLAY, tile: game.currentDouble * 11, line: j+1}];
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
  game.turn = 0;
}

exports.startRound = functions.https.onCall((data, context) => {
  return admin.database().ref(`game/${data.gameId}`).get().then((snapshot) => {
    const game = snapshot.val();
    startRound(game);
    return admin.database().ref(`game/${data.gameId}`).set(game);
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
};

function couldHavePlayedOnOwn(currentDouble, line, hand) {
  let matchTile = new DominoTile(currentDouble, currentDouble);
  if (typeof line !== "undefined") {
    matchTile = line[line.length - 1];
  }
  for (let i = 0; i < hand.length; i++) {
    if (new DominoTile(hand[i]).match(matchTile)) return true;
  }
  return false;
}

exports.takeAction = functions.https.onCall((data, context) => {
  return admin.database().ref(`game/${data.gameId}`).get().then((snapshot) => {
    const game = snapshot.val();
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
      case actions.PLAY: {
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
              "invalid-argument", "Can't play tile not in hand.");
        }
        // can play on own line or another player line only if penny present
        if (data.line - 1 !== currentPlayerIndex &&
            !game.players[data.line - 1].penny) {
          throw new functions.https.HttpsError(
             "invalid-argument",
             "Can't play on another player's line with no penny.");
        }
        if ("line" in game.players[data.line - 1]) {
          const line = game.players[data.line - 1].line;
          if (tile.match(line[line.length - 1])) {
            tile.swapIfNeeded(line[line.length - 1]);
          } else {
            throw new functions.https.HttpsError(
                "invalid-argument", "Can't play on non-matching tile.");
          }
          game.players[data.line - 1].line.push(tile);
        } else {
          const currentDouble = new DominoTile(
              game.currentDouble, game.currentDouble);
          if (tile.match(currentDouble)) {
            tile.swapIfNeeded(currentDouble);
          } else {
            throw new functions.https.HttpsError(
                "invalid-argument", "Can't play on non-matching tile.");
          }
          game.players[data.line - 1].line = [tile];
        }
        game.players[currentPlayerIndex].hand.splice();
        break;
      }
      case actions.DRAW: {
        if (game.boneyard.length > 0) {
          if ("hand" in game.players[currentPlayerIndex]) {
            game.players[currentPlayerIndex].hand.push(game.boneyard[0]);
          } else {
            game.players[currentPlayerIndex].hand = [game.boneyard[0]];
          }
          game.boneyard.splice(0, 1);
        }
        break;
      }
      case actions.PASS: {
        // check for win condition
        if (("walking" in game.players[currentPlayerIndex]) &&
            game.players[currentPlayerIndex].walking === game.turn - 1 &&
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
          // check for game win condition
          if (game.unusedDoubles.length === 0) {
            let winner, winningScore = 1000;
            for (let i = 0; i < game.players.length; i++) {
              if (game.players[i].score < winningScore) {
                winningScore = game.players[i].score;
                winner = game.players[i].name;
              }
            }
            game.winner = winner;
          } else {
            startRound(game);
          }
          break;
        }
        // can only pass if you've either played or drawn
        // TODO(ariw): ensure that you've played at least one tile if you have
        // one that you can play.
        if (!("currentActions" in game)) {
          throw new functions.https.HttpsError(
              "invalid-argument", "Can't pass without playing or drawing.");
        }
        // if you did not play on your own and could not have; add a penny.
        // doubles don't count as playing on your own but count if held in
        // reserve. if you played on your own; remove a penny
        let playedOrDrew = false, playedOnOwn = false;
        for (let i = 0; i < game.currentActions.length; i++) {
          const action = game.currentActions[i];
          if (action.action === actions.PLAY ||
              action.action === actions.DRAW) {
            playedOrDrew = true;
          }
          if (action.action === actions.PLAY &&
              action.line - 1 === currentPlayerIndex &&
              Math.floor(action.tile / 10) !== action.tile % 10) {
            playedOnOwn = true;
          }
        }
        if (!playedOrDrew) {
          throw new functions.https.HttpsError(
              "invalid-argument", "Can't pass without playing or drawing.");
        }
        if (playedOnOwn) {
          game.players[currentPlayerIndex].penny = false;
        } else if (!couldHavePlayedOnOwn(
            game.currentDouble, game.players[currentPlayerIndex].line,
            game.players[currentPlayerIndex].hand)) {
          game.players[currentPlayerIndex].penny = true;
        }
        const nextPlayer = (currentPlayerIndex + 1) % game.players.length + 1;
        if (nextPlayer === 1) {
          game.turn++;
        }
        game.currentPlayer = `Player ${nextPlayer}`;
        delete game.currentActions;
        break;
      }
      case actions.WALKING: {
        game.players[currentPlayerIndex].walking = game.turn;
        break;
      }
      default: {
        return new functions.https.HttpsError(
            "invalid-argument", "Invalid action specified.");
      }
    }
    return admin.database().ref(`game/${gameId}`).set(game);
  })
  .catch((error) => {
    throw error;
  });
});

