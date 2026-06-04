class RockPaperScissors {
  constructor(roomId, io, player1, player2, onGameEnd) {
    this.roomId = roomId;
    this.io = io;
    this.onGameEnd = onGameEnd;
    
    const p1Id = player1.id === player2.id ? `${player1.id}_1` : player1.id;
    const p2Id = player1.id === player2.id ? `${player2.id}_2` : player2.id;
    
    this.players = {
      [p1Id]: { ...player1, id: p1Id, choice: null },
      [p2Id]: { ...player2, id: p2Id, choice: null }
    };
    
    // 'choosing' (waiting for 1 or both to pick), 'reveal' (both picked, show winner)
    this.status = 'choosing'; 
    this.winnerId = null; // null if draw 
    this.roundCount = 1;
    this.scores = {
      [p1Id]: 0,
      [p2Id]: 0
    };
    this.MAX_SCORE = 3; // First to 3 wins the match
  }

  start() {
    this.broadcastState();
  }

  broadcastState() {
    // We must hide the specific choice of the opponent until status === 'reveal'
    const sanitizeOpponentChoice = (stateForUserId) => {
      const sanitizedPlayers = {};
      for (const [id, p] of Object.entries(this.players)) {
        sanitizedPlayers[id] = {
          ...p,
          // Hide choice if we are still choosing AND this is not our own object
          choice: (this.status === 'choosing' && id !== stateForUserId) 
                    ? (p.choice ? 'locked' : null) 
                    : p.choice
        };
      }
      return sanitizedPlayers;
    };

    // Send personalized state to each player
    for (const pId of Object.keys(this.players)) {
      const socketId = this.players[pId].socketId; // From GameManager
      if (socketId) {
        this.io.to(socketId).emit('game:update', {
          status: this.status,
          winnerId: this.winnerId,
          scores: this.scores,
          roundCount: this.roundCount,
          maxScore: this.MAX_SCORE,
          players: sanitizeOpponentChoice(pId)
        });
      }
    }
  }

  handleAction(userId, action) {
    if (this.status !== 'choosing') return;
    
    // Valid choices: 'rock', 'paper', 'scissors'
    if (action.type === 'play_turn') {
      const { choice } = action.payload; 
      if (!['rock', 'paper', 'scissors'].includes(choice)) return;

      this.players[userId].choice = choice;
      this.broadcastState();

      // Check if both have chosen
      const p1Id = Object.keys(this.players)[0];
      const p2Id = Object.keys(this.players)[1];
      
      const c1 = this.players[p1Id].choice;
      const c2 = this.players[p2Id].choice;

      if (c1 && c2) {
        this.evaluateRound(p1Id, c1, p2Id, c2);
      }
    } else if (action.type === 'next_round' && this.status === 'reveal') {
       // Allow them to verify they want the next round? Or auto-advance via setTimeout.
       // We'll auto-advance below, so this is just in case.
    }
  }

  evaluateRound(p1Id, c1, p2Id, c2) {
    this.status = 'reveal';
    
    if (c1 === c2) {
      this.winnerId = 'draw';
    } else if (
      (c1 === 'rock' && c2 === 'scissors') ||
      (c1 === 'paper' && c2 === 'rock') ||
      (c1 === 'scissors' && c2 === 'paper')
    ) {
      this.winnerId = p1Id;
      this.scores[p1Id]++;
    } else {
      this.winnerId = p2Id;
      this.scores[p2Id]++;
    }

    // Check match win
    if (this.scores[p1Id] >= this.MAX_SCORE) {
      this.status = 'match_won';
      this.winnerId = p1Id;
      if (this.onGameEnd) this.onGameEnd(this.roomId, p1Id, p2Id, false);
    } else if (this.scores[p2Id] >= this.MAX_SCORE) {
      this.status = 'match_won';
      this.winnerId = p2Id;
      if (this.onGameEnd) this.onGameEnd(this.roomId, p2Id, p1Id, false);
    }

    this.broadcastState();

    // If it's just a round, reset for next round automatically after 3.5s
    if (this.status === 'reveal') {
      setTimeout(() => {
        this.players[p1Id].choice = null;
        this.players[p2Id].choice = null;
        this.status = 'choosing';
        this.winnerId = null;
        this.roundCount++;
        this.broadcastState();
      }, 3500);
    }
  }

  destroy() {}
}

module.exports = RockPaperScissors;
