import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { v4 as uuidv4 } from 'uuid'; // Importing UUID library for unique IDs


@WebSocketGateway()
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly gameService: GameService) {}

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
    this.gameService.resetRound();
    // Generate 4 auto-players
    for (let i = 1; i <= 4; i++) {
      const autoPlayerId = uuidv4(); // Generating unique ID for auto-player
      const autoPlayerName = `AutoPlayer${i}`;
      this.gameService.addPlayer(autoPlayerId, autoPlayerName);
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('gameState', this.getGameState());
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.gameService.removePlayer(client.id);
    this.emitGameState();
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(client: Socket, payload: { player: string }) {
    console.log(`Player ${payload.player} joined the game with ID ${client.id}`);
    this.gameService.resetRound();
    this.gameService.addPlayer(client.id, payload.player);
    this.gameService.resetRound();
    this.emitGameState();
  }

  @SubscribeMessage('placeGuess')
  handlePlaceGuess(client: Socket, guess: { points: number; multiplier: number }) {
    console.log(`Player ${client.id} placed a bet`);
    this.gameService.placeBet(client.id, guess.multiplier, guess.points);
    // Subscribe to the currentMultiplier Observable
    this.gameService
      .getCurrentMultiplierObservable()
      .subscribe((multiplier) => {
        client.emit('multiplierUpdate', multiplier); // Emit multiplier updates to the client
      });
    // Subscribe to the multiplier frozen event
    this.gameService.getMultiplierFrozenObservable().subscribe(() => {
      // When the multiplier is frozen, emit the game state
      this.emitGameState();
    });
  }

  @SubscribeMessage('resetRound')
  handleResetRound(client: Socket) {
    console.log(`Round reset by ${client.id}`);
    this.gameService.resetRound();
    this.emitGameState();
  }

  @SubscribeMessage('changeSpeed')
  handleChangeSpeed(client: Socket, payload: { speed: number }) {
    console.log(`Speed changed to ${payload.speed} by ${client.id}`);
    this.gameService.setSpeed(payload.speed);
    this.emitGameState();
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(client: Socket, payload: { player: string; message: string }) {
    console.log(`Message from ${payload.player}: ${payload.message}`);
    this.server.emit('chatMessage', payload); // Broadcast the chat message to all clients
  }

  private emitGameState() {
    const gameState = this.getGameState();
    this.server.emit('gameState', gameState);
  }

  private getGameState() {
    return {
      multiplier: this.gameService.getCurrentMultiplier(),
      players: this.gameService.getPlayers(),
    };
  }
}
