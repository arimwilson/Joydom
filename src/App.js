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
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';

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

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

var name = [
  "Joyce", "Ari", "Callie", "Reece", "Hunter", "Brooke", "Jackie", "Kurt",
  "Denise", "Courtney", "Ken", "Mickey", "Jennifer", "Jessy"][
      getRandomInt(0, 14)];
var gameId = getRandomInt(0, 1500);
var numPlayers = "4";
var numAiPlayers = "2";
var aboutPage = { __html: require('./about.html.js') };


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
    this.state = {
      name: name,
      gameId: gameId,
      numPlayers: numPlayers,
      numAiPlayers: numAiPlayers,
    };
  }

  saveState = () => {
    name = this.state.name;
    gameId = this.state.gameId;
    numPlayers = this.state.numPlayers;
    numAiPlayers = this.state.numAiPlayers;
  }

  start = () => { this.saveState(); this.props.changePage("start"); }

  join = () => { this.saveState(); this.props.changePage("join"); }

  render() {
    return (
      <span className="MenuPage">
        Welcome to Joyce Dominoes!<br />
        <Form>
          <Container fluid>
            <Row><Col>
              <Form.Group>
                <Form.Label>Player name</Form.Label>
                <Form.Control
                    type="text" name="name" value={this.state.name}
                    onChange={(e) => {this.setState({ "name": e.target.value })}}/>
              </Form.Group>
            </Col></Row>
            <Row><Col>
              <Form.Group>
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
            </Col></Row>
            <Row>
              <Col>
                <Form.Group>
                  <Form.Label>Players?</Form.Label>
                  <Form.Control
                        type="text" name="numPlayers"
                        value={this.state.numPlayers} onChange={
                          (e) => {this.setState({ "numPlayers": e.target.value })}
                        }/>
                  <Form.Text>
                  Not needed if joining game.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Computer players?</Form.Label>
                  <Form.Control
                        type="text" name="numAiPlayers"
                        value={this.state.numAiPlayers} onChange={
                          (e) => {this.setState({ "numAiPlayers": e.target.value })}
                        }/>
                  <Form.Text>
                  Not needed if joining game.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row><Col>
              <Button variant="primary" onClick={this.start}>Start</Button>{' '}
              <Button variant="primary" onClick={this.join}>Join</Button>
            </Col></Row>
          </Container>
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
      numAiPlayers: parseInt(numAiPlayers)
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

  componentWillUnmount() {
    database.ref(`game/${gameId}`).off();
  }

  render() {
    if (this.state.game === null) {
      return null;
    }
    let playersToJoin =
      this.state.game.numPlayers - this.state.game.players.length;
    let players = this.state.game.players.map(function(player) {
      return (<li key={player.name}>{player.name}</li>);
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

  componentWillUnmount() {
    database.ref(`game/${gameId}`).off();
  }

  render() {
    if (this.state.game === null) {
      return null;
    }
    let playersToJoin =
      this.state.game.numPlayers - this.state.game.players.length;
    let players = this.state.game.players.map(function(player) {
      return (<li key={player.name}>{player.name}</li>);
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

  componentWillUnmount() {
    database.ref(`game/${gameId}`).off();
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
    let src = `images/${pipsLeft}${pipsRight}`;
    if (this.props.vertical) {
      style['height'] = '60px';
      src = src.concat('v');
    }
    if (rotated) {
      style['transform'] = 'rotate(180deg)';
    }
    if (this.props.dragging) {
      style['opacity'] = 0.5;
    }
    return <img src={`${src}.svg`} style={style}
                alt={`${pipsLeft}${pipsRight}`} />
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

// TODO(ariw): Show LineDrop only if either it's my line or there's a penny.
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
  let style = {width: '60px', height: '60px'};
  if (!canDrop) {
    style['visibility'] = 'hidden';
  }
  return <img src="images/linedrop.svg" style={style}  alt="linedrop"
              ref={drop} />;
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
    let style = {};
    if (this.props.player.name === this.props.currentPlayer) {
      style['text-decoration'] = 'underline';
    }
    let length = "hand" in this.props.player? this.props.player.hand.length: 0;
    return (
      <tr>
        <td>
          <span style={style}>
            {this.props.player.name} ({length} tiles)
          </span>
          <Walking walking={"walking" in this.props.player} />
        </td>
        <td>
          {line}
          <Penny penny={this.props.player.penny} />
          <LineDrop line={this.props.line} />
        </td>
      </tr>);    
  }
}

class Playfield extends React.Component {
  render() {
    let currentPlayer = this.props.currentPlayer;
    let players = this.props.players.map(function(player, line) {
      return <PlayerRow key={player.name} player={player}
                        currentPlayer={currentPlayer} line={line + 1} />;
    });
    return (
      <span className="Playfield">
        <b>Playfield:</b>
        <table>
          {players}
        </table>
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
  
  return (
    <span id={props.id} onClick={props.onClick} ref={drag}>
      <Tile tile={props.tile} vertical={props.vertical} dragging={isDragging} />
    </span>);
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
    let i = 0;
    for (; i < this.props.players.length; i++) {
      if (this.props.players[i].name === name) {
        break;
      }
    }
    let hand = "empty", currentPlayer = this.props.currentPlayer;
    if ("hand" in this.props.players[i]) {
      hand = this.props.players[i].hand.map(function(tile) {
        let tileString = `${tile.end1}${tile.end2}`;
        let tileComponent =
            <HandTile tile={tile} vertical={false} onClick={handleClick}
                      id={tileString} />
        if (currentPlayer !== name) {
          tileComponent = <Tile tile={tile} vertical={false} />;
        }
        return <td key={tileString}>{tileComponent}</td>;
      });
    }
    return (
      <span className="Hand">
        <b>{name}'s hand:</b>
        <table><tr>{hand}</tr></table>
        <Dropdown>
          {this.props.currentPlayer === name && <>
            <Button variant="primary" onClick={handleClick}>Draw</Button>{' '}
            <Button variant="primary" onClick={handleClick}>
              Pass/end turn
            </Button>{' '}
            <Button variant="primary" onClick={handleClick}>
              Walking
            </Button>{' '}
          </>}
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
    return <li key={player.name}>{player.name}: {player.score}</li>;
  });
  return (
    <>
      <Dropdown.Item onClick={handleShow}>Scores</Dropdown.Item>

      <Modal className="ActionModal" show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Scores</Modal.Title>
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
