import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';

@Module({
  providers: [GameService, GameGateway],
  exports: [GameGateway], // Export GameGateway here
})
export class GameModule {}
