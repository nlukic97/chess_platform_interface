import CustomChessBoard from "./CustomChessBoard"
import {useParams} from "react-router-dom"
import {useEffect, useState} from "react"
import {useSocket} from "../contexts/SocketProvider"
import Chat from "./Chat"
import "./ChessGamePage.scss"
import Modal from "./Modal"
import Chess from "chess.js"
import * as PropTypes from "prop-types"
import {GameHistory} from "./GameHistory"

import VoiceChat from "./VoiceChat"
import Sound from "./Sound"
import SoundBoard from "./SoundBoard";

const ConnectingLoader = () => (
  <Modal>
    <div className="loader-spinner"/>
  </Modal>
)

const RoomLink = ({roomID}) => (
  <Modal>
    <div className="waiting-room">
      <div>Share the room ID or send the link to your friend!</div>
      <div>
        <div className="label">Room ID:</div>
        <div className="room-id-wrapper">
          <div className="room-id-label">{roomID}</div>
          <button onClick={() => navigator.clipboard.writeText(roomID)}>Copy to Clipboard!</button>
        </div>
      </div>
      <div>
        <div>Direct link:</div>
        <div className="room-id-wrapper">
          <div className="room-id-label">{`${window.location.href}`}</div>
          <button onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy to Clipboard!
          </button>
        </div>
      </div>
      <div>
        Waiting for the opponent to join...
      </div>
    </div>
    <Sound source="elevator-music.mp3" text="Elevator music" hidden isElevatorMusic/>
  </Modal>
)

GameHistory.propTypes = {game: PropTypes.any}

export function ChessGamePage({fen = false}) {

  const [messages, setMessages] = useState([])
  const {uuid} = useParams()
  const {socket, connect} = useSocket()
  const [gameStarted, setGameStarted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [gameData, setGameData] = useState({})
  const [game, setGame] = useState(null)
  const [showSoundBoard, setShowSoundBoard] = useState(false)


  useEffect(() => {
    const connectionParams = {roomId: uuid}
    if (fen) {
      connectionParams.fen = fen
    }
    connect(connectionParams)
  }, [])

  useEffect(() => {
    if (!socket) {
      return
    }

    /* Calculating the latency.
    Source: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/#no-more-pong-event-for-retrieving-latency */
    let pings = []
    let averagePing
    let pingInterval = setInterval(() => {
      const start = Date.now()

      // volatile, so the packet will be discarded if the socket is not connected
      socket.volatile.emit("ping-server", () => {
        const latency = (Date.now() - start) / 2 // Only need one time communication (client to server), so we divide by 2
        console.log(`Latency: ${latency}ms`)
        pings.push(parseInt(latency))
      })

      if (pings.length >= 10) {
        clearInterval(pingInterval)
        averagePing = pings.reduce((acc, curr) => {
          acc += curr
          return acc
        }, 0)

        averagePing = averagePing / pings.length
        console.log(`The average ping is: ${averagePing}ms`)
      }
    }, 5000)

    socket.on("connect", () => {
      setIsConnected(true)
    })
    socket.on("game-started", ({pieces, playersTurn, initialPosition}) => {
      setGame(initialPosition ? new Chess(initialPosition) : new Chess())
      setGameData({pieces, playersTurn, setGame, safeGameMutate})
      setGameStarted(true)
    })

    socket.on('toggle-soundboard', () => {
      setShowSoundBoard(prev => !prev)
    })

    return () => {
      socket.off("game-started")
      socket.off('toggle-soundboard')
    }
  }, [socket])

  function safeGameMutate(modify) {
    // await new Promise((resolve, reject) => {
    //     resolve()
    // })
    setGame((g) => {
      const update = {...g}
      modify(update)
      return update
    })
  }

  const {playersTurn} = gameData

  return (
    <div>
      {!isConnected ? <ConnectingLoader/>
        : gameStarted ? (
          <div className="game-chat-wrapper">
            <div>
              <CustomChessBoard {...gameData} game={game}/>
              <GameHistory game={game}/>
              {
                game.game_over() ? (
                  <div>
                    Game over!
                  </div>
                ) : (
                  <div>
                    {playersTurn === "b" ? "Black to move" : "White to move"}
                  </div>
                )
              }
              <div style={{display: `${showSoundBoard ? '' : 'none'}`}}>
                <SoundBoard/>
              </div>
            </div>
            <Chat messages={messages} setMessages={setMessages}/>
          </div>
        ) : (
          <RoomLink roomID={uuid}/>
        )}
    </div>
  )
}