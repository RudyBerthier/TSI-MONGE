const pokersolver = require('pokersolver').Hand;

class PokerGame {
  constructor(roomId, options = {}) {
    this.roomId = roomId;
    this.players = []; // { id, socketId, username, avatar, chips, currentBet, folded, isAllIn, cards, position, isOffline }
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.status = 'WAITING'; // WAITING, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
    this.dealerIndex = 0;
    this.turnIndex = 0;
    this.smallBlindAmount = options.smallBlind || 10;
    this.bigBlindAmount = options.bigBlind || 20;
    this.currentMaxBet = 0;
    this.minRaise = this.bigBlindAmount;
    this.history = []; // History of hands for showing past winners
    this.timeline = []; // Hand history timeline for replay
    this.initialPlayersSnapshot = []; // Players state at start of hand
    this.lastActionTime = Date.now();
  }

  // --- Players Management ---
  addPlayer(player) {
    if (this.players.find(p => p.id === player.id)) {
      // Reconnect
      const existing = this.players.find(p => p.id === player.id);
      existing.socketId = player.socketId;
      existing.isOffline = false;
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = null;
      }
      return true;
    }
    if (this.players.length >= 9) return false;
    
    this.players.push({
      id: player.id,
      socketId: player.socketId,
      username: player.username,
      avatar: player.avatar,
      chips: player.chips || 10000,
      currentBet: 0,
      folded: false,
      isAllIn: false,
      isReady: false,
      cards: [],
      position: this.players.length,
      isOffline: false
    });
    return true;
  }

  removePlayer(userId) {
    const p = this.players.find(p => p.id === userId);
    if (!p) return;
    
    if (this.status !== 'WAITING') {
      p.isOffline = true;
      if (this.onStateChange) this.onStateChange();
      
      // Give them 30 seconds to reconnect before folding
      p.disconnectTimer = setTimeout(() => {
        if (p.isOffline && this.status !== 'WAITING' && !p.folded) {
          if (this.players[this.turnIndex]?.id === userId) {
            this.fold(userId);
          } else {
            p.folded = true;
            this.timeline.push({ type: 'ACTION', player_id: userId, action: 'fold', amount: 0 });
            this.checkNextPhase();
          }
          if (this.onStateChange) this.onStateChange();
        }
      }, 30000);
      
    } else {
      this.players = this.players.filter(p => p.id !== userId);
    }
  }

  toggleReady(userId) {
    if (this.status !== 'WAITING') return false;
    const player = this.players.find(p => p.id === userId);
    if (player) {
      player.isReady = !player.isReady;
      if (this.players.length >= 2 && this.players.every(p => p.isReady)) {
        this.startGame();
      }
      return true;
    }
    return false;
  }

  // --- Game Flow ---
  startGame() {
    const activePlayers = this.players.filter(p => p.chips > 0 && !p.isOffline);
    if (activePlayers.length < 2) return false;

    this.status = 'PREFLOP';
    this.communityCards = [];
    this.pot = 0;
    this.timeline = [];
    this.currentMaxBet = this.bigBlindAmount;
    this.minRaise = this.bigBlindAmount;
    
    this.players.forEach(p => {
      p.currentBet = 0;
      p.folded = (p.chips <= 0 || p.isOffline);
      p.isAllIn = false;
      p.cards = [];
    });

    this.initialPlayersSnapshot = this.players.filter(p => !p.folded).map(p => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      initialChips: p.chips,
      cards: []
    }));

    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    while (this.players[this.dealerIndex].folded) {
      this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    }

    this.initDeck();
    
    // Deal 2 cards
    this.players.forEach(p => {
      if (!p.folded) {
        p.cards = [this.deck.pop(), this.deck.pop()];
        const snap = this.initialPlayersSnapshot.find(s => s.id === p.id);
        if (snap) snap.cards = [...p.cards];
      }
    });

    this.timeline.push({ type: 'PHASE', phase: 'PREFLOP', pot: 0 });

    // Blinds
    let sbIndex = this.getNextActiveIndex(this.dealerIndex);
    let bbIndex = this.getNextActiveIndex(sbIndex);
    
    // Head to head specific rule: Dealer is SB
    if (activePlayers.length === 2) {
      sbIndex = this.dealerIndex;
      bbIndex = this.getNextActiveIndex(sbIndex);
    }

    this.placeBet(sbIndex, this.smallBlindAmount, true);
    this.placeBet(bbIndex, this.bigBlindAmount, true);

    this.turnIndex = this.getNextActiveIndex(bbIndex);
    return true;
  }

  initDeck() {
    const suits = ['h', 'd', 'c', 's'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    this.deck = [];
    for (let s of suits) {
      for (let v of values) {
        this.deck.push(v + s);
      }
    }
    // Shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // --- Betting Logic ---
  placeBet(index, amount, isBlind = false) {
    const player = this.players[index];
    const actualBet = Math.min(amount, player.chips);
    player.chips -= actualBet;
    player.currentBet += actualBet;
    this.pot += actualBet;

    if (player.chips === 0) {
      player.isAllIn = true;
    }

    if (player.currentBet > this.currentMaxBet) {
      const raiseAmount = player.currentBet - this.currentMaxBet;
      if (raiseAmount > this.minRaise && !isBlind) {
        this.minRaise = raiseAmount;
      }
      this.currentMaxBet = player.currentBet;
    }
    
    if (actualBet > 0) {
      this.timeline.push({
        type: isBlind ? 'BLIND' : 'ACTION',
        player_id: player.id,
        action: isBlind ? 'blind' : 'bet',
        amount: actualBet
      });
    }

    return actualBet;
  }

  getNextActiveIndex(currentIndex) {
    let i = (currentIndex + 1) % this.players.length;
    let count = 0;
    while ((this.players[i].folded || this.players[i].isAllIn) && count < this.players.length) {
      i = (i + 1) % this.players.length;
      count++;
    }
    return i;
  }

  getActivePlayersCount() {
    return this.players.filter(p => !p.folded).length;
  }
  
  getBettingPlayersCount() {
    return this.players.filter(p => !p.folded && !p.isAllIn).length;
  }

  // --- Actions ---
  fold(userId) {
    if (this.players[this.turnIndex].id !== userId) return false;
    const player = this.players[this.turnIndex];
    player.folded = true;
    this.timeline.push({ type: 'ACTION', player_id: userId, action: 'fold', amount: 0 });
    this.checkNextPhase();
    return true;
  }

  call(userId) {
    if (this.players[this.turnIndex].id !== userId) return false;
    const player = this.players[this.turnIndex];
    const amountToCall = this.currentMaxBet - player.currentBet;
    this.placeBet(this.turnIndex, amountToCall);
    // Replace the last action in timeline if it was just logged as a generic 'bet' by placeBet
    if (this.timeline[this.timeline.length - 1].action === 'bet') {
      this.timeline[this.timeline.length - 1].action = amountToCall === 0 ? 'check' : 'call';
    }
    this.checkNextPhase();
    return true;
  }

  raise(userId, amount) {
    if (this.players[this.turnIndex].id !== userId) return false;
    const player = this.players[this.turnIndex];
    
    // total amount the player is putting in to reach currentMaxBet + their raise
    const totalNewBet = this.currentMaxBet + amount;
    const amountToAdd = totalNewBet - player.currentBet;
    
    if (amount < this.minRaise && player.chips > amountToAdd) return false; // Invalid raise

    this.placeBet(this.turnIndex, amountToAdd);
    // Replace generic 'bet' with 'raise'
    if (this.timeline[this.timeline.length - 1].action === 'bet') {
      this.timeline[this.timeline.length - 1].action = 'raise';
      this.timeline[this.timeline.length - 1].raiseTo = totalNewBet;
    }
    
    this.checkNextPhase();
    return true;
  }

  checkNextPhase() {
    // If only 1 player left not folded, they win immediately
    if (this.getActivePlayersCount() === 1) {
      this.endHand();
      return;
    }

    // Check if betting round is over
    let bettingOver = true;
    const activeBets = this.players.filter(p => !p.folded && !p.isAllIn);
    if (activeBets.length > 0) {
      const maxBet = Math.max(...activeBets.map(p => p.currentBet));
      if (activeBets.some(p => p.currentBet < maxBet)) {
        bettingOver = false;
      }
    }

    // Is there anyone who still needs to act? (e.g. if we just raised, everyone needs a chance to call)
    // A simple way to check is if bettingOver is true and everyone has matched currentMaxBet or is all-in.
    // AND we must ensure everyone has acted at least once (which we can track by checking if turnIndex has completed a loop, but simple bet matching usually works if we start properly).
    
    if (bettingOver) {
      this.nextPhase();
    } else {
      this.turnIndex = this.getNextActiveIndex(this.turnIndex);
    }
  }

  nextPhase() {
    // Reset bets for next round, but keep pot
    this.players.forEach(p => p.currentBet = 0);
    this.currentMaxBet = 0;
    this.minRaise = this.bigBlindAmount;

    if (this.status === 'PREFLOP') {
      this.status = 'FLOP';
      const newCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
      this.communityCards.push(...newCards);
      this.timeline.push({ type: 'PHASE', phase: 'FLOP', cards: newCards, pot: this.pot });
    } else if (this.status === 'FLOP') {
      this.status = 'TURN';
      const newCards = [this.deck.pop()];
      this.communityCards.push(...newCards);
      this.timeline.push({ type: 'PHASE', phase: 'TURN', cards: newCards, pot: this.pot });
    } else if (this.status === 'TURN') {
      this.status = 'RIVER';
      const newCards = [this.deck.pop()];
      this.communityCards.push(...newCards);
      this.timeline.push({ type: 'PHASE', phase: 'RIVER', cards: newCards, pot: this.pot });
    } else if (this.status === 'RIVER') {
      this.status = 'SHOWDOWN';
      this.endHand();
      return;
    }

    // If everyone is all in or folded, just fast-forward with a delay for suspense
    if (this.getBettingPlayersCount() <= 1) {
      if (this.onStateChange) this.onStateChange(); // Broadcast current state so cards show up
      setTimeout(() => {
        this.nextPhase();
      }, 2000); // 2 second delay between fast-forward phases
      return;
    }

    // Start betting with first active player after dealer
    this.turnIndex = this.getNextActiveIndex(this.dealerIndex);
  }

  endHand() {
    this.status = 'SHOWDOWN';
    
    const activePlayers = this.players.filter(p => !p.folded);
    
    if (activePlayers.length === 1) {
      // Winner by fold
      const winner = activePlayers[0];
      winner.chips += this.pot;
      this.history.push({
        type: 'fold',
        winner: winner.id,
        amount: this.pot
      });
    } else {
      // Evaluate hands
      const hands = activePlayers.map(p => {
        // pokersolver uses format ['As', 'Ks', 'Qs', 'Js', 'Ts']
        const cards = [...p.cards, ...this.communityCards];
        const solved = pokersolver.solve(cards);
        solved.player = p;
        return solved;
      });

      const winners = pokersolver.winners(hands);
      
      // Split pot (ignoring side pots for simplicity in v1)
      const splitAmount = Math.floor(this.pot / winners.length);
      winners.forEach(w => {
        w.player.chips += splitAmount;
      });

      this.history.push({
        type: 'showdown',
        winners: winners.map(w => ({ id: w.player.id, handName: w.name, cards: w.cards.map(c => c.value + c.suit) })),
        community: this.communityCards,
        amount: this.pot
      });
    }

    this.timeline.push({ type: 'SHOWDOWN', winners: this.history.slice(-1)[0], pot: this.pot });

    // Save to DB via Room Manager
    if (this.onHandComplete) {
      this.onHandComplete({
        room_id: this.roomId,
        pot: this.pot,
        players: this.initialPlayersSnapshot,
        community_cards: this.communityCards,
        timeline: this.timeline,
        winners: this.history.slice(-1)[0]
      });
    }

    // Reset for next game
    setTimeout(() => {
      this.status = 'WAITING';
      this.pot = 0;
      this.communityCards = [];
      this.players.forEach(p => {
        p.cards = [];
        p.currentBet = 0;
        if (p.chips <= 0) {
           p.isOffline = true; // Kicked out if 0 chips
        }
      });
      // Remove offline players
      this.players = this.players.filter(p => !p.isOffline);
      
      // Auto-start if enough players
      if (this.players.length >= 2) {
         this.startGame();
      } else {
         // Not enough players, reset ready states
         this.players.forEach(p => p.isReady = false);
      }
      
      if (this.onStateChange) this.onStateChange();
    }, 8000);
  }

  getState(userId) {
    return {
      roomId: this.roomId,
      status: this.status,
      pot: this.pot,
      communityCards: this.communityCards,
      dealerIndex: this.dealerIndex,
      turnIndex: this.turnIndex,
      currentMaxBet: this.currentMaxBet,
      minRaise: this.minRaise,
      players: this.players.map(p => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        chips: p.chips,
        currentBet: p.currentBet,
        folded: p.folded,
        isAllIn: p.isAllIn,
        isReady: p.isReady,
        position: p.position,
        isOffline: p.isOffline,
        // Only send cards to the owner or at showdown
        cards: (p.id === userId || this.status === 'SHOWDOWN') ? p.cards : []
      })),
      history: this.history.slice(-1)[0] || null
    };
  }
}

module.exports = PokerGame;
