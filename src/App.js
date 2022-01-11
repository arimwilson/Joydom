import React from 'react';
import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/functions';
import { DndProvider } from 'react-dnd';
import { useDrag } from 'react-dnd'
import { useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend';

import './App.css';
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

var name;
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
      page = <StartPage changePage={this.changePage} />;
    } else if (this.state.page === "join") {
      page = <JoinPage changePage={this.changePage} />;
    } else if (this.state.page === "play") {
      page = <PlayPage changePage={this.changePage} />;
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

class StartPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { game: null, };
    this.started = false;
  }

  menu = () => {
    this.props.changePage("menu");
  }

  componentDidMount() {
    let defaultNames = [
      "Joyce", "Ari", "Callie", "Reece", "Hunter", "Brooke", "Jackie", "Kurt",
      "Denise", "Courtney", "Ken", "Mickey", "Jennifer", "Jessy"];
    let defaultName = defaultNames[getRandomInt(0, defaultNames.length)]
    name = prompt('name? ', defaultName);
    if (name === null) {
      name = defaultName;
    }
    let defaultGameId = getRandomInt(0, 1500);
    gameId = prompt('Game ID (<1500)? ', defaultGameId);
    if (gameId === null) {
      gameId = defaultGameId;
    }
    let defaultNumPlayers = "4";
    let numPlayers = prompt('Number of players? ', defaultNumPlayers);
    if (numPlayers === null) {
      numPlayers = defaultNumPlayers;
    }
    var startGame = functions.httpsCallable('startGame');
    startGame({
      name: name,
      gameId: gameId,
      numPlayers: parseInt(numPlayers),
    }).then((response) => {
      database.ref(`game/${gameId}`).on('value', (snapshot) => {
        this.setState({ game: snapshot.val(), });
        let playersToJoin =
          this.state.game.numPlayers - this.state.game.players.length;
        if (playersToJoin === 0 && !this.started) {
          var startRound = functions.httpsCallable('startRound');
          startRound({ gameId: gameId }).then((response) => {}).catch(
            (error) => {
              alert(`Code: ${error.code}. Message: ${error.message}`);
          });
          this.started = true;
          this.props.changePage("play");
        }
      }, (errorObject) => {
        console.log(errorObject);
        this.menu();
      });
    }).catch((error) => {
      alert(`Code: ${error.code}. Message: ${error.message}`);
      this.menu();
    });
  }

  render() {
    if (this.state.game === null) {
      return null;
    }
    let playersToJoin =
      this.state.game.numPlayers - this.state.game.players.length;
    let players = this.state.game.players.map(function(player) {
      return (<li>{player.name}</li>);
    });
    return  (
      <span className="StartPage">
        Waiting for {playersToJoin} player(s) to join game ID {gameId}. Current
        players:
        <ul>
        {players}
        </ul>
        <br /><button onClick={this.menu}>Back</button>
      </span>
    );
  }
}

// TODO(ariw): Remove duplication between this and StartPage.
class JoinPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { game: null, }
  }

  menu = () => {
    this.props.changePage("menu");
  }

  componentDidMount() {
    let defaultNames = [
      "Joyce", "Ari", "Callie", "Reece", "Hunter", "Brooke", "Jackie", "Kurt",
      "Denise", "Courtney", "Ken", "Mickey", "Jennifer", "Jessy"];
    let defaultName = defaultNames[getRandomInt(0, defaultNames.length)]
    name = prompt('name? ', defaultName);
    if (name === null) {
      name = defaultName;
    }
    let defaultGameId = 0;
    gameId = prompt('Game ID (<1500)? ', defaultGameId);
    if (gameId === null) {
      gameId = defaultGameId;
    }
    var joinGame = functions.httpsCallable('joinGame');
    joinGame({
      name: name,
      gameId: gameId,
    }).then((response) => {
      database.ref(`game/${gameId}`).on('value', (snapshot) => {
        this.setState({ game: snapshot.val(), });
        let playersToJoin =
          this.state.game.numPlayers - this.state.game.players.length;
        if (playersToJoin === 0) {
          this.props.changePage("play");
        }
      }, (errorObject) => {
        console.log(errorObject);
        this.menu();
      });
    }).catch((error) => {
      alert(`Code: ${error.code}. Message: ${error.message}`);
      this.menu();
    });
  }

  render() {
    if (this.state.game === null) {
      return null;
    }
    let playersToJoin =
      this.state.game.numPlayers - this.state.game.players.length;
    let players = this.state.game.players.map(function(player) {
      return (<li>{player.name}</li>);
    });
    return  (
      <span className="JoinPage">
        Waiting for {playersToJoin} player(s) to join game ID {gameId}. Current
        players:
        <ul>
        {players}
        </ul>
        <br /><button onClick={this.menu}>Back</button>
      </span>
    );
  }
}

class AboutPage extends React.Component {
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
    database.ref(`game/${gameId}`).on('value', (snapshot) => {
      this.setState({game: snapshot.val(), });
    }, (errorObject) => {
      console.log(errorObject);
    });
  }

  render() {
    return (
      this.state.game !== null &&
      <span className={`PlayPage row`}>
        <DndProvider backend={HTML5Backend}>
          <span className="column">
            <GameInfo
              state={this.state.game.state}
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
              players={this.state.game.players}
              changePage={this.props.changePage} />
          </span>
          <span className="column">
            <Actions
              actions={this.state.game.actions} 
              players={this.state.game.players} />
          </span>
        </DndProvider>
      </span>
    )
  }
}

class GameInfo extends React.Component {
  render() {
    return (
      <span className="GameInfo">
        <p>
          <b>Game information</b>:
          <ul>
            {typeof this.props.winner !== 'undefined' &&
            <li><b>WINNER IS {this.props.winner}</b></li>}
            <li>Round double: {this.props.currentDouble}</li>
            <li>Unused doubles: {this.props.unusedDoubles}</li>
            <li>Turn: {this.props.turn + 1}</li>
            <li>Number of bones remaining: {this.props.numBones}</li>
          </ul>
        </p>
      </span>);
  }
}

class Tile extends React.Component {
  render() {
    let rotated = false, pipsLeft = this.props.tile.end1,
        pipsRight = this.props.tile.end2;
    if (pipsRight > pipsLeft) {
      rotated = true;
      pipsLeft = this.props.tile.end2;
      pipsRight = this.props.tile.end1;
    }
    let style = {width: '60px', height: 'auto'};
    if (rotated && this.props.vertical) {
      style['transform'] = 'rotate(270deg)';
    } else if (rotated) {
      style['transform'] = 'rotate(180deg)';
    } else if (this.props.vertical) {
      style['transform'] = 'rotate(90deg)';
    }
    if (this.props.dragging) {
      style['opacity'] = 0.5;
    }
    return <img src={`images/${pipsLeft}${pipsRight}.svg`}
                style={style}
                {...this.props.extraAttributes}></img>
  }
}

function playTile(tile, line) {
  console.log(tile);
  console.log(line);
}

// Use new React-style hook because react-dnd works better with it.
const LineDrop = (props) => {
  const [, drop] = useDrop(
    () => ({
      accept: DraggableTypes.HAND_TILE,
      drop: (monitor) => playTile(monitor.getItem(), props.line)
    }),
    [props]
  );
  return <div className="LineDrop" ref={drop} />;
}

class PlayerRow extends React.Component {
  render() {
    let line = ("line" in this.props.player?
      this.props.player.line.map(function(tile) {
        if (tile !== null) {
          return <Tile tile={tile} vertical={tile.end1 === tile.end2} />;
        } else {
          return;
        }
      }):
      <span>empty</span>);
    const isCurrentPlayer = this.props.player.name === this.props.currentPlayer;
    return (
      <tr>
        <td>{isCurrentPlayer? <u>{this.props.player.name}</u> : this.props.player.name}</td>
        <td>{this.props.player.score}</td>
        <td>{this.props.player.penny? 'yes': 'no'}</td>
        <td>{("walking" in this.props.player)? this.props.player.walking: 'no'}</td>
        <td>{line} <LineDrop line={this.props.line} /></td>
      </tr>);    
  }
}

class Playfield extends React.Component {
  render() {
    let currentPlayer = this.props.currentPlayer;
    let players = this.props.players.map(function(player, line) {
      return <PlayerRow player={player} currentPlayer={currentPlayer}
                        line={line + 1} />;
    });
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

export const DraggableTypes = {
  HAND_TILE: 'handtile'
}

// Use new React-style hook because react-dnd works better with it.
const HandTile = (props) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DraggableTypes.HAND_TILE,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));
  props.extraAttributes['ref'] = drag;
  
  return (
    <Tile tile={props.tile} vertical={props.vertical} dragging={isDragging}
          extraAttributes={props.extraAttributes} />);
}

class Hand extends React.Component {
  handleClick = (e) => {
    const text = e.currentTarget.textContent;
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
    } else if (text === "Exit game") {
      this.props.changePage("menu");
      return;
    } else {
      request.tile = Number(e.currentTarget.id);
      request.line = parseInt(
          prompt(`Which line (1-${this.props.players.length})?`));
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
    let handleClick = this.handleClick;
    if (this.props.currentPlayer !== name) {
      return (
        <span className="Hand">
          <p>
            <b>{this.props.currentPlayer}'s turn.</b>
            <br /><button onClick={handleClick}>Exit game</button>
          </p>
        </span>
      );
    }
    let i = 0;
    for (; i < this.props.players.length; i++) {
      if (this.props.players[i].name === this.props.currentPlayer) {
        break;
      }
    }
    
    let hand = "empty";
    if ("hand" in this.props.players[i]) {
      hand = this.props.players[i].hand.map(function(tile) {
        return (
            <td>
              <HandTile tile={tile} vertical={false}
                        extraAttributes={{onClick: handleClick,
                                          id: `${tile.end1}${tile.end2}`}} />
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
              <td><button onClick={handleClick}>Draw</button></td>
              <td><button onClick={handleClick}>Pass/end turn</button></td>
              <td><button onClick={handleClick}>Walking</button></td>
            </tr>
          </table>
          <br /><button onClick={handleClick}>Exit game</button>
        </p>
      </span>
    );
  }
}

class Action extends React.Component {
  render() {
    switch (this.props.action.action) {
      case ACTIONS.PLAY:
        let playedName = this.props.players[this.props.action.line - 1].name;
        if (this.props.action.player === playedName) {
          playedName = "their";
        } else {
          playedName += "'s";
        }
        return (
          <tr>
            {this.props.action.player} played{' '}
            <Tile tile={this.props.action.tile} vertical={false} /> on{' '}
            {playedName} line.
          </tr>);
      case ACTIONS.DRAW:
        return (<tr>{this.props.action.player} drew a tile.</tr>);
      case ACTIONS.PASS:
        return (<tr>{this.props.action.player} ended their turn.</tr>);
      case ACTIONS.WALKING:
        return (<tr>{this.props.action.player} is walking!</tr>);
      default:
        return (<tr>UNKNOWN ACTION {this.props.action.action}</tr>);
    }
  }
}

class Actions extends React.Component {
  constructor(props) {
    super(props);
    this.undo = this.undo.bind(this);
  }

  undo() {
    (functions.httpsCallable('undo')({gameId: gameId})).then((response) => {
    }).catch((error) => {
      alert(`Code: ${error.code}. Message: ${error.message}`);
    });
  }

  render() {
    let actions = "none";
    let players = this.props.players;
    if (typeof this.props.actions !== 'undefined') {
      actions = this.props.actions.map(function(action) {
        return <Action action={action} players={players} />;
      });
    }
    return (
      <span className="Actions">
        <p>
          <b>Round actions:</b>
          <table>
            <button onClick={this.undo}>Undo</button>
            {actions}
          </table>
        </p>
      </span>
    );
  }
}

export default App;
