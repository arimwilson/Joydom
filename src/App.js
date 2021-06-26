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
        <section className="GameInfo">
          <GameInfo game={this.state.game}/>
        </section>
        <section className="Playfield">
          <Playfield />
        </section>
        <section className="Hand">
          <Hand />
        </section>
      </div>
    );
  }
}

class GameInfo extends React.Component {
  render() {
    if (this.props.game !== null) {
      return (<p>Game: Current double: {this.props.game.currentDouble}</p>);
    } else {
      return (<p>Game not yet started</p>);
    }
  }
}

function Playfield() {
  return (<p>Playfield</p>);
}

function Hand() {
  return (<p>Hand</p>);
}


export default App;
