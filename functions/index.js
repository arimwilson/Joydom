const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const MAX_DOUBLE = 9;

// TODO(ariw): Don't let players overwrite each others' games.
exports.startGame = functions.https.onCall((data, context) => {
  // don't want to waste database storage
  if (data.gameId >= 1500) {
    throw new functions.https.HttpsError(
        "invalid-argument", `Game ID ${data.gameId} is too high`);
  }
  const players = Array(1);
  players[0] = {name: data.name, score: 0};
  const game = {
    numPlayers: data.numPlayers,
    players: players,
    unusedDoubles: [...Array(MAX_DOUBLE + 1).keys()].map((x) => MAX_DOUBLE - x),
  };
  return admin.database().ref(`game/${data.gameId}`).set(game);
});

exports.joinGame = functions.https.onCall((data, context) => {
  return admin.database().ref(`game/${data.gameId}`).get().then((snapshot) => {
    const game = snapshot.val();
    if (game === null) {
      throw new functions.https.HttpsError(
          "invalid-argument", "Game ID doesn't exist.");
    }
    if (game.players.length >= game.numPlayers) {
      throw new functions.https.HttpsError(
          "invalid-argument", "Can't join a full game.");
    }
    game.players.push({name: data.name, score: 0});
    return admin.database().ref(`game/${data.gameId}`).set(game);
  }).catch((error) => {
    throw error;
  });
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

function isDouble(currentDouble) {
  return (tile) => tile.end1 === currentDouble && tile.end2 === currentDouble;
}

const ACTIONS = {
  NONE: 0,
  PLAY: 1,
  DRAW: 2,
  PASS: 3,
  WALKING: 4,
};

class Action {
  constructor(player, action, tile, line, game) {
    this.player = player;
    this.action = action;
    if (typeof tile !== "undefined") {
      this.tile = tile;
    }
    if (typeof line !== "undefined") {
      this.line = line;
    }
    if (typeof game !== "undefined") {
      const priorGame = JSON.parse(JSON.stringify(game));
      for (let i = 0; i < priorGame.actions.length; i++) {
        delete priorGame.actions[i].priorGame;
      }
      this.priorGame = JSON.stringify(priorGame);
    }
  }

  // return only actions of the current player
  static currentActions(game) {
    let i = 0;
    for (; i < game.actions.length; i++) {
      if (game.actions[i].player != game.currentPlayer) break;
    }
    return game.actions.slice(0, i);
  }
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
        const doubleIndex = game.players[j].hand.findIndex(isDouble(
            game.currentDouble));
        if (doubleIndex !== -1) {
          game.players[j].hand.splice(doubleIndex, 1);
          game.currentPlayer = game.players[j].name;
          game.actions = [new Action(
              game.currentPlayer, ACTIONS.PLAY,
              new DominoTile(game.currentDouble, game.currentDouble), j + 1)];
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
  }).catch((error) => {
    throw error;
  });
});

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
    let tile = undefined;
    if (typeof data.tile !== "undefined") {
      // note: this makes the game not work for double sets above 9
      tile = new DominoTile(Math.floor(data.tile / 10), data.tile % 10);
    }
    // TODO(ariw): Add extra action information (e.g. penny was added/removed).
    game.actions.unshift(
        new Action(game.currentPlayer, data.action, tile, data.line, game));
    switch (data.action) {
      case ACTIONS.PLAY: {
        if (data.line < 1 || data.line > game.players.length) {
          throw new functions.https.HttpsError(
              "invalid-argument", `Can't play on invalid line ${data.line}`);
        }
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
      case ACTIONS.DRAW: {
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
      case ACTIONS.PASS: {
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
            let winner;
            let winningScore = 1000;
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
        const currentActions = Action.currentActions(game);
        if (currentActions.length === 0) {
          throw new functions.https.HttpsError(
              "invalid-argument", "Can't pass without playing or drawing.");
        }
        // if you did not play on your own and could not have; add a penny.
        // doubles don't count as playing on your own but count if held in
        // reserve. if you played on your own; remove a penny
        let playedOrDrew = false;
        let playedOnOwn = false;
        for (let i = 0; i < currentActions.length; i++) {
          const action = currentActions[i];
          if (action.action === ACTIONS.PLAY ||
              action.action === ACTIONS.DRAW) {
            playedOrDrew = true;
          }
          if (action.action === ACTIONS.PLAY &&
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
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        if (nextPlayerIndex === 1) {
          game.turn++;
        }
        game.currentPlayer = game.players[nextPlayerIndex].name;
        break;
      }
      case ACTIONS.WALKING: {
        game.players[currentPlayerIndex].walking = game.turn;
        break;
      }
      default: {
        throw new functions.https.HttpsError(
            "invalid-argument", "Invalid action specified.");
      }
    }
    return admin.database().ref(`game/${gameId}`).set(game);
  }).catch((error) => {
    throw error;
  });
});

exports.undo = functions.https.onCall((data, context) => {
  return admin.database().ref(`game/${data.gameId}`).get().then((snapshot) => {
    const game = snapshot.val();
    if (typeof game.actions === "undefined" || game.actions.length <= 1) {
      // can't undo nothing or initial double
      throw new functions.https.HttpsError(
          "invalid-argument", "Unable to undo initial actions.");
    }
    const priorGame = JSON.parse(game.actions[0].priorGame);
    for (let i = 1; i < game.actions.length; i++) {
      if (typeof(game.actions[i].priorGame) !== "undefined") {
        priorGame.actions[i - 1].priorGame = game.actions[i].priorGame;
      }
    }
    return admin.database().ref(`game/${data.gameId}`).set(priorGame);
  }).catch((error) => {
    throw error;
  });
});
