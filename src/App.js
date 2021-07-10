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
  database.useEmulator(`${host}`, 9000);
}

const gameId = 123;

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { game: null, }
  }

  componentDidMount() {
    database.ref(`game/${gameId}`).on('value', (snapshot) => {
      this.setState({game: snapshot.val(), });
    }, (errorObject) => {
      console.log(errorObject);
    });
    var startGame = functions.httpsCallable('startGame');
    startGame({ gameId: gameId, numPlayers: 4 }).then((response) => {
    }).catch((error) => {
      alert(`error: ${JSON.stringify(error)}`);
    });
  }

  render() {
    return (
      <div className="App">
        <header>
          <h2>Joyce Dominoes</h2>
        </header>
        {this.state.game !== null &&
          <div>
            <section className="GameInfo">
              <GameInfo
                  currentDouble={this.state.game.currentDouble}
                  unusedDoubles={this.state.game.unusedDoubles}/>
            </section>
            <section className="Playfield">
              <Playfield
                  players={this.state.game.players}
                  currentPlayer={this.state.game.currentPlayer}/>
            </section>
            <section className="Hand">
              <Hand
                  currentPlayer={this.state.game.currentPlayer}
                  players={this.state.game.players}/>
            </section>
          </div>
        }
      </div>
    );
  }
}

class GameInfo extends React.Component {
  render() {
    return (<p><b>Round</b>: Double: {this.props.currentDouble}, Unused: {this.props.unusedDoubles}</p>);
  }
}

function getPlayerRowFun(currentPlayer) {
  return function(player) {
    let line = ("line" in player? player.line.map(function(tile) {
      if (tile !== null) {
        return (<div>{tile.end1}{tile.end2}</div>);
      } else {
        return;
      }
    }): <div>empty</div>);
    const isCurrentPlayer = player.name === currentPlayer;
    return (
      <tr>
        <td>{isCurrentPlayer? <u>{player.name}</u> : player.name}</td>
        <td>{player.score}</td>
        <td>{line}</td>
        <td>{player.penny? 'yes': 'no'}</td>
        <td>{player.walking? 'yes': 'no'}</td>
      </tr>);
  }
}

class Playfield extends React.Component {
  render() {
    let players = this.props.players.map(getPlayerRowFun(this.props.currentPlayer));
    return (
        <p>
          <b>Lines:</b>
          <table>
            <tr>
              <th>Name</th>
              <th>Score</th>
              <th>Line</th>
              <th>Penny?</th>
              <th>Walking?</th>
            </tr>
            {players}
          </table>
        </p>);
  }
}

const actions = {
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
    var request = {gameId: gameId, action: actions.PLAY};
    if (text === "Draw") {
      request.action = actions.DRAW;
    } else if (text === "Pass") {
      request.action = actions.PASS;
    } else if (text === "Pass/end turn") {
      request.action = actions.PASS;
    } else if (text === "Walking") {
      request.action = actions.WALKING;
    } else {
      request.tile = Number(text);
      request.line = prompt(`Which line (1-${this.props.players.length})?`);
    }
    takeAction(request).then((response) => {
    }).catch((error) => {
      alert(`error: ${JSON.stringify(error)}`);
    });
  }

  render() {
    for (let i = 0; i < this.props.players.length; i++) {
      if (this.props.players[i].name === this.props.currentPlayer) {
        let handleClick = this.handleClick;
        let hand = this.props.players[i].hand.map(function(tile) {
          return (
              <td>
                <button onClick={handleClick}>{tile.end1}{tile.end2}
                </button>
              </td>);
        });
        return (
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
            </p>);
      }
    }
  }
}

export default App;
