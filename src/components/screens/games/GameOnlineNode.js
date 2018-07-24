import React from 'react';
import { ImageBackground, StyleSheet, View, Switch, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-elements';
import InputButton from '../../utils/InputButton'
import GameStyle from '../../../styles/GameStyle'
import Modal from 'react-native-modalbox';
import { Colors } from '../../../styles/colors';

import button from '../../../styles/button';
import text from '../../../styles/text';
import I18n from '../../../languages/i18n';
import {CheckWinner, _displayMessage} from '../../utils/checkWinner';
import DeviceInfo from 'react-native-device-info';

import { bindActionCreators } from "redux";
import * as actions from '../../actions/index';
import { connect } from 'react-redux';
import { AsyncStorage, DeviceEventEmitter, AppState } from 'react-native';

const inputButtons = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8]
];

const HeartBeatTime = 3000;

class GameOnlineNode extends React.Component {
  state = {
      uuid: null,
      squares: Array(9).fill(null),
      numSteps: 0,
      isYourTurn: null,
      role: null,
      roundStatus: null,
      modelStatus: null,
      modelMsg: null,
  }

  componentWillUnmount() {
    console.log('componentWillUnmount')
    this._stopHeartBeat();
    // this.viewWillBlur.remove();
    // this.viewDidFocus.remove();
    // AppState.removeEventListener('change', this._handleAppStateChange);
  }

  componentDidMount(){
    console.log('componentDidMount')
      //get from api yourTurn, role= 'O' or 'X'
      this.setState({
        uuid: DeviceInfo.getUniqueID(),
        isYourTurn: false,
      })
      if(this._interval){
        this._stopHeartBeat();
      }
      this._interval = setInterval(this._heartBeatInterval, HeartBeatTime);

      // this.viewWillBlur = this.props.navigation.addListener('didBlur',this._willBlur);
      // this.viewDidFocus = this.props.navigation.addListener('didFocus',this._didFocus);
      // AppState.addEventListener('change', this._handleAppStateChange);
  }

  _handleAppStateChange = (appState) => {
      console.log('handleAppStateChange:'+appState);
   }

  _didBlur = (obj) =>{
    console.log(obj)
  };
  _didFocus = (obj) =>{
    console.log(obj)
  };

  _startHeartBeat = () => {
    console.log('_startHeartBeat:'+this._interval);
    this._stopHeartBeat();
    this._heartBeatInterval();
    this._interval = setInterval(this._heartBeatInterval, HeartBeatTime);
  };

  _stopHeartBeat = () => {
    console.log('_stopHeartBeat:'+this._interval);
    clearInterval(this._interval);
    this._interval = null;
  };

  _heartBeatInterval = () => {
      const { getStepsNode } = this.props;
      getStepsNode({
        uuid: this.state.uuid
      });
    };

  componentWillReceiveProps(nextProps) {
    // console.log(nextProps);
    // console.log(this.state);
    this._stepsHandler(nextProps);
  }

  _stepsHandler = (nextProps) =>{
      if(nextProps.steps.steps){
        const {steps, role, start, oppoDisc} = nextProps.steps;
        if(oppoDisc){
          this._onOpponentDisconnect();
          return;
        }
        if(start)
        {
          let isYourTurn = false;
          let numSteps = this.state.numSteps;
          let squares = this.state.squares;
          if(steps.length > this.state.numSteps){
            numSteps = steps.length;
            for(var i = this.state.numSteps; i < steps.length; i++){
              squares[parseInt(steps[i].position)] = steps[i].piece;
            }
          }
          isYourTurn = ((numSteps % 2 === 0 ? 'X' : 'O') === role);

          if(steps.length > 0){
            this._checkNewStep({
              role:role,
              numSteps: numSteps,
              isYourTurn: isYourTurn,
              squares: squares,
              lastStep: null,
            });
          }else {
            this.setState({
              role: role,
              numSteps: numSteps,
              isYourTurn: isYourTurn,
              squares: squares,
              roundStatus: 'playing',
              modelStatus: null,
              modelMsg: null,
            });
          }

        }
        else
        {
          this.setState({
            squares: Array(9).fill(null),
            numSteps: 0,
            role: role,
            isYourTurn: false,
            roundStatus: 'waiting',
            modelStatus: null,
            modelMsg: null,
          });
        }
      }
    };
  _onOpponentDisconnect = () => {
    this.setState({
      isYourTurn: false,
      modelStatus: 'gameOver',
      modelMsg: 'Opponent disconnected!',
      roundStatus: 'over',
    });
  };

  _checkNewStep = (data) => {
    const {role, squares, numSteps, isYourTurn, lastStep} = data;
    let winner = this._calculateWinner(squares);
    console.log('_checkNewStep role:'+role);
    if(winner){
      this.setState({
        role: role,
        squares: squares,
        numSteps: numSteps,
        isYourTurn: false,
        modelStatus: 'gameOver',
        modelMsg: winner === role? I18n.t('game.success') : (winner === '='? I18n.t('game.draw') : I18n.t('game.failed')),
        roundStatus: 'over',
      });
      this._stopHeartBeat();
      this._setResult(winner,lastStep);
    }
    else {
      this.setState({
        role: role,
        squares: squares,
        numSteps: numSteps,
        isYourTurn: isYourTurn,
      });
    }
  };

  _setResult = (winner,lastStep) => {
      if( this.state.roundStatus === 'over'){
        return;
      }

      const { putResult } = this.props;
      putResult({
        uuid: this.state.uuid,
        status: 'over',
        winner: winner,
        reason: 'P',
        lastStep: lastStep,
      });
    };

  _newGame = () => {
    this.setState({
        squares: Array(9).fill(null),
        numSteps: 0,
        isYourTurn: false,
        role: null,
        roundStatus: null,
        modelStatus: null,
        modelMsg: null,
    });
    this._startHeartBeat();
  };

  _renderInputButtons() {
      let views = [];

      for (var r = 0; r < inputButtons.length; r++) {
          let row = inputButtons[r];
          let inputRow = [];

          for (var i = 0; i < row.length; i++) {
              let input = row[i];

              inputRow.push(
                  <InputButton value={this.state.squares[input]}
                   onPress={this._onInputButtonPressed.bind(this, input)}
                  key={r + "-" + i} />
              );
          }
          views.push(<View style={GameStyle.inputRow} key={"row-" + r}>{inputRow}</View>)
      }
      return views;
  }

  _onInputButtonPressed = (input) => {
      //alert(input);
      if(!this.state.isYourTurn || this.state.roundStatus === 'over'){
        return;
      }

      const squares = this.state.squares;
      if(this._calculateWinner(squares) || squares[input] ){
          return;
      }
      const nextPiece = this.state.role;

      squares[input] = nextPiece;
      this._checkNewStep({
        role: this.state.role,
        squares: squares,
        numSteps: this.state.numSteps + 1,
        isYourTurn: !this.state.isYourTurn,
        lastStep: {
          uuid: this.state.uuid,
          index: this.state.numSteps+1,
          position: input,
          piece: nextPiece,
        },
      });

      const { addStepNode } = this.props;
      addStepNode({
        uuid: this.state.uuid,
        index: this.state.numSteps+1,
        position: input,
        piece: nextPiece,
      })

    };

  render(){
    const { isYourTurn } = this.state;
    const squares = this.state.squares;
    const winner = this._calculateWinner(squares)
    let status;
    if(winner){
        status = I18n.t('game.waiting');
    }
    else
    {
        status = this.state.isYourTurn ? I18n.t('game.yourTurn') : I18n.t('game.waiting') ;
    }
    return(
      <ImageBackground source={require('../../../images/default.jpg')} style={GameStyle.rootContainer}>
        <View style={{flex: 1, justifyContent:'center', alignItems:'center'}}>
          <Text h2 >{status}</Text>
        </View>
        <View style={{flex: 3, justifyContent: 'center'}} >
          <View style={GameStyle.gameBoard}>{this._renderInputButtons()}</View>
        </View>
        <View style={{flex: 1}} />

        <Modal
          style={[GameStyle.messageModal, {backgroundColor: Colors.blue}]}
          position={"center"}
          ref={"result"}
          backdropPressToClose={false}
          isOpen={this.state.modelStatus==='gameOver'}
          >
          <Text h2>{this.state.modelMsg}</Text>
          <TouchableOpacity
            style={[
              button.ModelBtn,
              {backgroundColor: Colors.lightBlue}
            ]}
            onPress={() => this._newGame()}
          >
            <Text h4 style={{color:'white'}}>{'New Game'}</Text>
          </TouchableOpacity>
        </Modal>
      </ImageBackground>
    )
  }

  _calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if(this.state.numSteps >= 9){
      return '=';
    }
    return null;
  };

  _isWaiting = () => {
    if(!this.state.isYourTurn)
    {
      return false;
    }
    return true;
  };

}



const mapStateToProps = (state) => ({
  ...state
})

const mapDispatchProps = (dispatch) => {
  return bindActionCreators(actions, dispatch)
}

export default connect(mapStateToProps, mapDispatchProps)(GameOnlineNode)
