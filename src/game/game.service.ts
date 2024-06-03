import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

interface Player {
  id: string;
  name: string;
  points: number;
  guess: { multiplier: number; points: number } | null;
  totalPoints?: number; // New property to store total points
}

@Injectable()
export class GameService {
  private players: Player[] = [];
  private currentMultiplier = 0;
  private freezeMultiplier = 0;
  private interval: NodeJS.Timeout;
  private speed = 1; // default speed (1)

  private $currentMultiplier = new Subject<number>(); // Use Subject for real-time updates
  private $multiplierFrozen = new Subject<void>(); // Subject to notify when multiplier is frozen




  getPlayers(): Player[] {
    return this.players;
  }

  getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }

  addPlayer(id: string, name: string): void {
    this.players.push({ id, name, points: 100, guess: null });
  }

  removePlayer(id: string): void {
    this.players = this.players.filter((player) => player.id !== id);
  }

  placeBet(id: string, multiplier: number, points: number): void {
    this.resetRound();
    const player = this.players.find((player) => player.id === id);
    if (player) {
      player.guess = { multiplier, points };
    }
    // Generate random guesses for auto-players
    this.generateAutoPlayerGuesses();
    this.startMultiplierIncrease();
  }

  generateAutoPlayerGuesses(): void {
    this.players.forEach((player) => {
      if (player.name.startsWith('AutoPlayer')) {
        const randomMultiplier = Math.random() * 10; // Random multiplier between 0 and 10
        const randomPoints = Math.floor(Math.random() * player.points); // Random points between 0 and 100
        player.guess = { multiplier: randomMultiplier, points: randomPoints };
      }
    });
  }

  setMultiplierFreeze(multiplier: number): void {
    this.freezeMultiplier = multiplier;
    clearInterval(this.interval);
    this.evaluateGuesses();
    // Notify subscribers that the multiplier is frozen
    this.$multiplierFrozen.next();
  }

  startRound(): void {
    this.resetRound();
    this.startMultiplierIncrease();
  }

  resetRound(): void {
    clearInterval(this.interval);
    this.currentMultiplier = 0;
    this.freezeMultiplier = 0;
    this.players.forEach((player) => (player.guess = null));
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  private startMultiplierIncrease(): void {
    let x = 0;
    const maxMultiplier = 10; // Maximum value for the multiplier
    const shouldStop = false; // Flag to control the stopping condition

    const interval = setInterval(() => {
      // Increment x based on the speed
      x += this.speed / 10; // Adjust this factor to control how quickly the multiplier increases with speed

      // Calculate the current multiplier using the logistic growth function
      const k = 10; // Carrying capacity (the max value)
      const r = this.calculateGrowthRate(x); // Dynamic growth rate
      const logisticMultiplier = k / (1 + Math.exp(-r * (x - 10))); // Logistic growth formula

      // Add random variation to the multiplier
      const randomFactor = Math.random() / 5; // Random factor to add some noise
      let newMultiplier = logisticMultiplier * (1 + randomFactor);

      // Ensure the multiplier only increases
      if (newMultiplier < this.currentMultiplier) {
        newMultiplier = this.currentMultiplier;
      }

      // Ensure the current multiplier does not exceed the maximum value
      this.currentMultiplier = Math.min(newMultiplier, maxMultiplier);

      console.log(`Multiplier increased to: ${this.currentMultiplier}`);

      // Emit the current multiplier value to the frontend
      this.emitMultiplierValue(this.currentMultiplier);

      // Random chance to freeze the multiplier at each step
      if (Math.random() < 0.1 || shouldStop) { // 10% chance to freeze or if it should stop
        this.currentMultiplier = Math.floor(this.currentMultiplier); // Freeze by rounding down
        this.setMultiplierFreeze(this.currentMultiplier);
        clearInterval(interval); // Stop further increments once the multiplier is frozen
      }
    }, 100); // Adjust the interval as needed for smoother updates
  }

  getCurrentMultiplierObservable(): Subject<number> {
    return this.$currentMultiplier;
  }

  getMultiplierFrozenObservable(): Subject<void> {
    return this.$multiplierFrozen;
  }

  private emitMultiplierValue(multiplier: number): void {
    // Emit the current multiplier value to subscribers
    this.$currentMultiplier.next(multiplier);
  }

  private calculateGrowthRate(x: number): number {
    const minR = 0.05; // Minimum growth rate
    const maxR = 0.2; // Maximum growth rate
    const startThreshold = 5; // Threshold where the dynamic growth rate starts to increase

    // Calculate a dynamic growth rate that starts with smaller steps and gradually increases
    if (x < startThreshold) {
      return minR;
    } else {
      return minR + ((maxR - minR) / startThreshold) * (x - startThreshold);
    }
  }

  private evaluateGuesses(): void {
    this.players.forEach((player) => {
      if (player.guess) {
        if (player.guess.multiplier == this.freezeMultiplier) {
          player.points += player.guess.points * this.freezeMultiplier;
        } else {
          const Upoint = player.points - player.guess.points;
          if (Upoint > 0) {
            player.points = Upoint;
          } else player.points = 0;
        }
      }
    });
    //setTimeout(() => this.startRound(), 5000); // Start a new round after 5 seconds
  }
}
