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

function App() {
  return (
    <div className="App">
      <header>
        <h2>Joyce Dominoes</h2>
      </header>
      <section className="GameInfo">
        <GameInfo />
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

function GameInfo() {
  if (window.location.hostname === "localhost") {
    functions.useFunctionsEmulator("http://localhost:5001");
    firestore.settings({
      host: "localhost:8080",
      ssl: false,
    });
  }
  var startGame = functions.httpsCallable('startGame');
  var result = '';
  startGame({ numPlayers: 4 })
      .then((response) => {
        result = response.text;
      });
  return (<p>GameInfo {result}</p>);
}

function Playfield() {
  return (<p>Playfield</p>);
}

function Hand() {
  return (<p>Hand</p>);
}


export default App;
