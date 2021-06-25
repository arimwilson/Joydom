import React from 'react';
import './App.css';

import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/functions';

import { useCollectionData } from 'react-firebase-hooks/firestore';

import { firebaseConfig } from './firebaseConfig'
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

const firestore = firebase.firestore();
const functions = firebase.functions();

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { game: null }
  }

  componentDidMount() {
    if (window.location.hostname === "localhost" ||
        window.location.hostname === "192.168.0.105") {
      const host = window.location.hostname;
      functions.useFunctionsEmulator(`http://${host}:5001`);
      firestore.settings({
        host: `${host}:8080`,
        ssl: false,
      });
    }
    var startGame = functions.httpsCallable('startGame');
    startGame({ numPlayers: 4 }).then((response) => {
      this.setState({game: response, });
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
      return (<p>Game: Current double: {this.props.game.data.currentDouble}</p>);
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
