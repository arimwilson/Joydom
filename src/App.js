import React, { useState } from 'react';
import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/functions';

import { DndProvider } from 'react-dnd';
import { useDrag } from 'react-dnd'
import { useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend';

import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

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
var numPlayers;
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
    } else {
      page = <PlayPage changePage={this.changePage} />;
    }

    return (
      <div className="App">
        <header>
          <h3>
            Joyce Dominoes{' '}
            <AboutModal />
          </h3>
        </header>
        {page}
      </div>
    );
  }
}

const AboutModal = () => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <Button as="img" variant="outline-dark" src="images/about.svg" alt="about"
              onClick={handleShow} />

      <Modal className="AboutModal" show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>How to play / about</Modal.Title>
        </Modal.Header>
        <Modal.Body><span dangerouslySetInnerHTML={aboutPage} /></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

class MenuPage extends React.Component {
  constructor(props) {
    super(props);
    let defaultNames = [
      "Joyce", "Ari", "Callie", "Reece", "Hunter", "Brooke", "Jackie", "Kurt",
      "Denise", "Courtney", "Ken", "Mickey", "Jennifer", "Jessy"];
    this.state = {
      name: defaultNames[getRandomInt(0, defaultNames.length)],
      gameId: getRandomInt(0, 1500),
      numPlayers: 2,
    };
  }

  start = () => {
    name = this.state.name;
    gameId = this.state.gameId;
    numPlayers = this.state.numPlayers;
    this.props.changePage("start");
  }

  join = () => {
    name = this.state.name;
    gameId = this.state.gameId;
    this.props.changePage("join");
  }

  render() {
    return (
      <span className="MenuPage">
        Welcome to Joyce Dominoes!<br />
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Player name</Form.Label>
            <Form.Control
                type="text" name="name" value={this.state.name}
                onChange={(e) => {this.setState({ "name": e.target.value })}}/>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Game ID</Form.Label>
            <Form.Control
                type="text" name="gameId" value={this.state.gameId}
                onChange={
                  (e) => {this.setState({ "gameId": e.target.value })}
                }/>
            <Form.Text>
              Enter a unique game ID &lt;1500.
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Number of players</Form.Label>
            <Form.Control
                  type="text" name="numPlayers" value={this.state.numPlayers}
                  onChange={
                    (e) => {this.setState({ "numPlayers": e.target.value })}
                  }/>
            <Form.Text>
              Not needed if joining game.
            </Form.Text>
          </Form.Group>
          <Button variant="primary" onClick={this.start}>Start</Button>{' '}
          <Button variant="primary" onClick={this.join}>Join</Button>
        </Form>
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
        <br /><Button variant="secondary" onClick={this.menu}>Back</Button>
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
        <br /><Button variant="secondary" onClick={this.menu}>Back</Button>
      </span>
    );
  }
}

// TODO(ariw): Weird freaking bugs around drag-n-drop:
// 1) Sometimes DnD doesn't seem to work at all (no dragging, no drop targets
//    appearing).
// 2) If a previous tile in someone's hand has been played, dragging a later
//    tile onto the board acts as though the 1-previous tile has been played.
//    (as though the HandTile for the previous piece was still there).
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
      <span className="PlayPage">
        <DndProvider backend={HTML5Backend}>
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
            actions={this.state.game.actions}
            changePage={this.props.changePage} />
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
            <li>Game id: {gameId}</li>
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
    let style = {width: 'auto', height: '30px'};
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
                style={style} alt={`${pipsLeft}${pipsRight}`}
                {...this.props.extraAttributes} />
  }
}

function playTile(tile, line) {
  var takeAction = functions.httpsCallable('takeAction');
  var request = {gameId: gameId, action: ACTIONS.PLAY};
  request.tile = tile.end1 * 10 + tile.end2;
  request.line = line;
  takeAction(request).then((response) => {
  }).catch((error) => {
    alert(`Code: ${error.code}. Message: ${error.message}`);
  });
}

const LineDrop = (props) => {
  const [{ canDrop }, drop] = useDrop(
    () => ({
      accept: DraggableTypes.HAND_TILE,
      drop: (item) => playTile(item, props.line),
      collect: (monitor) => ({
        canDrop: !!monitor.canDrop()
      })
    }),
    [props]
  );
  let style = {
    'display': 'inline-block',
    'width': '60px',
    'height': '30px',
    'background': 'silver',
  }
  if (!canDrop) {
    style['display'] = 'none';
  }
  return <div className="LineDrop" ref={drop} style={style} />;
}

const Penny = (props) => {
  if (props.penny) {
    return <img src="images/penny.svg" style={ {height: "30px"} } alt="penny "/>
  } else {
    return null;
  }
}

const Walking = (props) => {
  if (props.walking) {
    return <img src="images/walking.svg" style={ {height: "30px"} }
                alt="walking" />
  } else {
    return null;
  }

}

class PlayerRow extends React.Component {
  render() {
    let line = ("line" in this.props.player?
      this.props.player.line.map(function(tile) {
        if (tile !== null) {
          return <Tile tile={tile} vertical={tile.end1 === tile.end2} />;
        } else {
          return null;
        }
      }):
      undefined);
    const isCurrentPlayer = this.props.player.name === this.props.currentPlayer;
    return (
      <tr>
        <td>
          {isCurrentPlayer?
              <u>{this.props.player.name}</u> :
              this.props.player.name}
          <Walking walking={"walking" in this.props.player} />
        </td>
        <td>
          {line}
          <LineDrop line={this.props.line} />
          <Penny penny={this.props.player.penny} />
        </td>
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

const HandTile = (props) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DraggableTypes.HAND_TILE,
    item: props.tile,
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
  constructor(props) {
    super(props);
    this.setState({showActions: false, showScores: false});
  }

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
      if (Number.isNaN(request.line)) {
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
            <b>{this.props.currentPlayer}'s turn.</b><br />
            <Button variant="secondary" onClick={handleClick}>
              Exit game
            </Button>
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
          <Dropdown>
            <Button variant="primary" onClick={handleClick}>Draw</Button>{' '}
            <Button variant="primary" onClick={handleClick}>
              Pass/end turn
            </Button>{' '}
            <Button variant="primary" onClick={handleClick}>
              Walking
            </Button>{' '}
            <Dropdown.Toggle>
              ...
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <ActionModal
                  actions={this.props.actions} players={this.props.players} />
              <ScoreModal players={this.props.players} />
            </Dropdown.Menu>{' '}
            <Button variant="secondary" onClick={handleClick}>Exit game</Button>
          </Dropdown>
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
          <tr><td>
            {this.props.action.player} played{' '}
            <Tile tile={this.props.action.tile} vertical={false} /> on{' '}
            {playedName} line.
          </td></tr>);
      case ACTIONS.DRAW:
        return (<tr><td>{this.props.action.player} drew a tile.</td></tr>);
      case ACTIONS.PASS:
        return (<tr><td>{this.props.action.player} ended their turn.</td></tr>);
      case ACTIONS.WALKING:
        return (<tr><td>{this.props.action.player} is walking!</td></tr>);
      default:
        return (<tr><td>UNKNOWN ACTION {this.props.action.action}</td></tr>);
    }
  }
}


const ActionModal = (props) => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const undo = () => {
    (functions.httpsCallable('undo')({gameId: gameId})).then((response) => {
    }).catch((error) => {
      alert(`Code: ${error.code}. Message: ${error.message}`);
    });
  }

  let actions = "none";
  let players = props.players;
  if (typeof props.actions !== 'undefined') {
    actions = props.actions.map(function(action) {
      return <Action action={action} players={players} />;
    });
  }
  return (
    <>
      <Dropdown.Item onClick={handleShow}>Recent actions</Dropdown.Item>

      <Modal className="ActionModal" show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Recent actions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <table>
            <tr><td><Button variant="info" onClick={undo}>
              Undo
            </Button></td></tr>
            {actions}
          </table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

const ScoreModal = (props) => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  let scores = props.players.map(function(player) {
    return <li>{player.name}: {player.score}</li>;
  });
  return (
    <>
      <Dropdown.Item onClick={handleShow}>Scores</Dropdown.Item>

      <Modal className="ActionModal" show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Recent actions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul>
            {scores}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default App;
