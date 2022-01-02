import React from 'react';
import './App.css';

import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/functions';

import { firebaseConfig } from './firebaseConfig'
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

const database = firebase.database();
const functions = firebase.functions();
if (window.location.hostname === "localhost" ||
    window.location.hostname.startsWith("192.168.0")) {
  const host = window.location.hostname;
  functions.useFunctionsEmulator(`http://${host}:5001`);
  try {
    database.useEmulator(`${host}`, 9000); 
  } catch (error) {
    // ignore repeated reinitialization errors for live development
  }
}

var gameId;
var aboutPage = { __html: require('./about.html.js') };

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { page: "menu", };
  }

  changePage = (page) => {
    this.setState({page: page});
  }

  render() {
    let page;
    if (this.state.page === "menu") {
      page = <MenuPage changePage={this.changePage} />;
    } else if (this.state.page === "start") {
      page = <PlayPage />;
    } else if (this.state.page === "join") {
      page = <JoinPage changePage={this.changePage} />;
    } else {
      page = <AboutPage changePage={this.changePage} />;
    }
    return (
      <div className="App">
        <header>
          <h2>Joyce Dominoes</h2>
        </header>
        {page}
      </div>
    );
  }
}

class MenuPage extends React.Component {
  constructor(props) {
    super(props);
  }

  start = () => {
    this.props.changePage("start");
  }

  join = () => {
    this.props.changePage("join");
  }

  about = () => {
    this.props.changePage("about");
  }

  render() {
    return (
      <span className="MenuPage">
        Welcome to Joyce Dominoes!<br />
        <button onClick={this.start}>Start game</button><br />
        <button onClick={this.join}>Join game</button><br />
        <button onClick={this.about}>How to play / about</button>
      </span>
    );
  }
}

class JoinPage extends React.Component {
  constructor(props) {
    super(props);
  }

  menu = () => {
    this.props.changePage("menu");
  }

  render() {
    return (
      <span className="JoinPage">
        Hello world!
        <br /><button onClick={this.menu}>Back</button>
      </span>
    );
  }
}

class AboutPage extends React.Component {
  constructor(props) {
    super(props);
  }

  menu = () => {
    this.props.changePage("menu");
  }

  render() {
    return (
      <span className="AboutPage">
        <span dangerouslySetInnerHTML={aboutPage} />
        <br /><button onClick={this.menu}>Back</button>
      </span>
    );
  }
}

class PlayPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { game: null, }
  }

  componentDidMount() {
    var startGame = functions.httpsCallable('startGame');
    let defaultGameId = getRandomInt(0, 1000);
    gameId = prompt('Game ID? ', defaultGameId);
    if (gameId === null) {
      gameId = defaultGameId;
    }
    let defaultNumPlayers = "4";
    let numPlayers = prompt('Number of players? ', defaultNumPlayers);
    if (numPlayers === null) {
      numPlayers = defaultNumPlayers;
    }
    startGame({
      gameId: gameId,
      numPlayers: parseInt(numPlayers),
    }).then((response) => {
			var startRound = functions.httpsCallable('startRound');
			startRound({ gameId: gameId }).then((response) => {
				database.ref(`game/${gameId}`).on('value', (snapshot) => {
					this.setState({game: snapshot.val(), });
				}, (errorObject) => {
					console.log(errorObject);
				});
			}).catch((error) => {
				alert(`Code: ${error.code}. Message: ${error.message}`);
			});
    }).catch((error) => {
      alert(`Code: ${error.code}. Message: ${error.message}`);
    });
  }

  render() {
    return (
        this.state.game !== null &&
        <span className={`PlayPage row`}>
          <span className="column">
            <GameInfo
              winner={this.state.game.winner}
              turn={this.state.game.turn}
              currentDouble={this.state.game.currentDouble}
              unusedDoubles={this.state.game.unusedDoubles}
              numBones=
              {"boneyard" in this.state.game ?
                this.state.game.boneyard.length : 0}
            />
            <Playfield
              players={this.state.game.players}
              currentPlayer={this.state.game.currentPlayer} />
            <Hand
              currentPlayer={this.state.game.currentPlayer}
              players={this.state.game.players} />
          </span>
          <span className="column">
            <Actions actions={this.state.game.actions} />
          </span>
        </span>
    );
  }
}

class GameInfo extends React.Component {
  render() {
    return (
      <span className="GameInfo">
        {this.props.winner !== undefined &&
          <p><b>WINNER IS {this.props.winner}</b></p>}
        <p>
          <b>Round</b>:
          Turn: {this.props.turn + 1},
          current double: {this.props.currentDouble},
          unused doubles: {this.props.unusedDoubles},
          number of bones: {this.props.numBones}
        </p>
      </span>);
  }
}

function getPlayerRowFun(currentPlayer) {
  return function(player) {
    let line = ("line" in player? player.line.map(function(tile) {
      if (tile !== null) {
        return (<span>{tile.end1}{tile.end2} </span>);
      } else {
        return;
      }
    }): <div>empty</div>);
    const isCurrentPlayer = player.name === currentPlayer;
    return (
      <tr>
        <td>{isCurrentPlayer? <u>{player.name}</u> : player.name}</td>
        <td>{player.score}</td>
        <td>{player.penny? 'yes': 'no'}</td>
        <td>{("walking" in player)? player.walking: 'no'}</td>
        <td>{line}</td>
      </tr>);
  }
}

class Playfield extends React.Component {
  render() {
    let players = this.props.players.map(getPlayerRowFun(this.props.currentPlayer));
    return (
      <span className="Playfield">
        <p>
          <b>Playfield:</b>
          <table>
            <tr>
              <th>Name</th>
              <th>Score</th>
              <th>Penny?</th>
              <th>Walking?</th>
              <th style={{ whiteSpace: 'nowrap' }}>Line</th>
            </tr>
            {players}
          </table>
        </p>
      </span>);
  }
}

const ACTIONS = {
  NONE: 0,
  PLAY: 1,
  DRAW: 2,
  PASS: 3,
  WALKING: 4,
}

class Hand extends React.Component {
  constructor(props) {
    super(props);
    this.state = { tilesPlayed: [],  walking: false };
  }

  handleClick = (e) => {
    const text = e.target.textContent;
    var takeAction = functions.httpsCallable('takeAction');
    var request = {gameId: gameId, action: ACTIONS.PLAY};
    if (text === "Draw") {
      request.action = ACTIONS.DRAW;
    } else if (text === "Pass") {
      request.action = ACTIONS.PASS;
    } else if (text === "Pass/end turn") {
      request.action = ACTIONS.PASS;
    } else if (text === "Walking") {
      request.action = ACTIONS.WALKING;
    } else {
      request.tile = Number(text);
      request.line = prompt(`Which line (1-${this.props.players.length})?`);
      if (request.line === null) {
        return;
      }
    }
    takeAction(request).then((response) => {
    }).catch((error) => {
      alert(`Code: ${error.code}. Message: ${error.message}`);
    });
  }

  render() {
    for (let i = 0; i < this.props.players.length; i++) {
      if (this.props.players[i].name === this.props.currentPlayer) {
        let handleClick = this.handleClick;
        let hand = "empty";
        if ("hand" in this.props.players[i]) {
          hand = this.props.players[i].hand.map(function(tile) {
            return (
                <td>
                  <button onClick={handleClick}>{tile.end1}{tile.end2}
                  </button>
                </td>);
          });
        }
        return (
          <span className="Hand">
            <p>
              <b>{this.props.currentPlayer}'s hand:</b>
              <table><tr>{hand}</tr></table>
              <table>
                <tr>
                  <td><button onClick={this.handleClick}>Draw</button></td>
                  <td><button onClick={this.handleClick}>Pass/end turn</button></td>
                  <td><button onClick={this.handleClick}>Walking</button></td>
                </tr>
              </table>
            </p>
          </span>);
      }
    }
  }
}

function renderAction(action) {
  switch (action.action) {
    case ACTIONS.PLAY:
      return (
        <tr>{action.player} played {action.tile} on the {action.line} line.
        </tr>);
    case ACTIONS.DRAW:
      return (<tr>{action.player} drew a tile.</tr>);
    case ACTIONS.PASS:
      return (<tr>{action.player} ended their turn.</tr>);
    case ACTIONS.WALKING:
      return (<tr>{action.player} is walking!</tr>);
    default:
      return (<tr>ERROR UNKNOWN ACTION {action.action}</tr>);
  }
}

class Actions extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let actions = "none";
    if ("actions" in this.props) {
      actions = this.props.actions.map(renderAction);
    }
    return (
      <span className="Actions">
        <b>Actions</b>
        <table>{actions}</table>
      </span>
    );
  }
}

export default App;
