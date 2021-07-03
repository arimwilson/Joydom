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
    window.location.hostname === "192.168.0.105") {
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
    var startGame = functions.httpsCallable('startGame');
    database.ref(`game/${gameId}`).on('value', (snapshot) => {
      this.setState({game: snapshot.val(), });
    }, (errorObject) => {
      console.log(errorObject);
    });
    startGame({ gameId: gameId, numPlayers: 4 }).then((response) => {
    }).catch((error) => {
      console.log(`error: ${JSON.stringify(error)}`);
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
    if (player.name === currentPlayer) {
      return (<tr><td><u>{player.name}</u></td><td>{player.score}</td><td>{line}</td></tr>);
    } else {
      return (<tr><td>{player.name}</td><td>{player.score}</td><td>{line}</td></tr>);
    }
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
            </tr>
            {players}
          </table>
        </p>);
  }
}

class Hand extends React.Component {
  render() {
    for (let i = 0; i < this.props.players.length; i++) {
      if (this.props.players[i].name == this.props.currentPlayer) {
        let hand = this.props.players[i].hand.map(function(tile) {
          return (<td><button>{tile.end1}{tile.end2}</button></td> );
        });
        return (
            <p>
              <b>{this.props.currentPlayer}'s hand:</b>
              <table>
                <tr>{hand}</tr>
                <tr>
                  <td><button>Draw</button></td>
                  <td><button>Pass</button></td>
                  <td><button>Walking</button></td>
                </tr>
              </table>
            </p>);
        break;
      }
    }
  }
}


export default App;
