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
                <GameInfo currentDouble={this.state.game.currentDouble}/>
              </section>
              <section className="Playfield">
                <Playfield players={this.state.game.players}/>
              </section>
              <section className="Hand">
                <Hand player="Player 1" players={this.state.game.players}/>
              </section>
            </div>
          }
        </div>
      );
  }
}

class GameInfo extends React.Component {
  render() {
    return (<p>Round: Double: {this.props.currentDouble}</p>);
  }
}

class Playfield extends React.Component {
  render() {
    let players = this.props.players.map(function(player) {
      console.log(player);
      let line = player.line.map(function(tile) {
        if (tile !== null) {
          return (<div>{tile.end1}{tile.end2}</div>);
        } else {
          return;
        }
      });
      return (<tr><td>{player.name}</td><td>{player.score}</td><td>{line}</td></tr>);
    });
    return (
        <p>
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
      if (this.props.players[i].name == this.props.player) {
        let hand = this.props.players[i].hand.map(function(tile) {
          return (<td>{tile.end1}{tile.end2}</td> );
        });
        return (<p>Hand: <table><tr>{hand}</tr></table></p>);
        break;
      }
    }
  }
}


export default App;
