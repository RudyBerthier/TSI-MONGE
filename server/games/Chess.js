const { Chess: ChessInstance } = require('chess.js');

class Chess {
  constructor(roomId, io, player1, player2, onGameEnd) {
    this.roomId = roomId;
    this.io = io;
    this.onGameEnd = onGameEnd;

    // Assign colors randomly
    const p1IsWhite = Math.random() > 0.5;
    
    const p1Id = player1.id === player2.id ? `${player1.id}_1` : player1.id;
    const p2Id = player1.id === player2.id ? `${player2.id}_2` : player2.id;

    this.players = {
      [p1Id]: {
        ...player1,
        id: p1Id,
        color: p1IsWhite ? 'w' : 'b'
      },
      [p2Id]: {
        ...player2,
        id: p2Id,
        color: p1IsWhite ? 'b' : 'w'
      }
    };

    this.chess = new ChessInstance();
    this.status = 'playing'; // 'playing', 'won', 'draw'
    this.winnerId = null;
    this.lastMove = null;
  }

  start() {
    this.broadcastState();
  }

  broadcastState() {
    const p1Id = Object.keys(this.players)[0];
    const p2Id = Object.keys(this.players)[1];

    let currentPlayerId = null;
    if (this.status === 'playing') {
      const turnColor = this.chess.turn(); // 'w' or 'b'
      currentPlayerId = this.players[p1Id].color === turnColor ? p1Id : p2Id;
    }

    const state = {
      fen: this.chess.fen(),
      status: this.status,
      winnerId: this.winnerId,
      currentPlayerId,
      players: this.players,
      isCheck: this.chess.inCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isDraw: this.chess.isDraw(),
      lastMove: this.lastMove
    };

    this.io.to(this.roomId).emit('game:update', state);
  }

  handleAction(userId, action) {
    if (this.status !== 'playing') return;

    if (action.type === 'play_turn') {
      const { sourceSquare, targetSquare, promotion } = action.payload;
      
      // Verify it's this user's turn
      const turnColor = this.chess.turn();
      if (this.players[userId].color !== turnColor) {
        return; // Not their turn
      }

      try {
        // Attempt the move
        const move = this.chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: promotion || 'q'
        });

        if (move) {
          this.lastMove = { from: sourceSquare, to: targetSquare };
          this.checkGameEnd();
          this.broadcastState();
        }
      } catch (err) {
        console.error('Chess move error:', err.message);
      }
    } else if (action.type === 'resign') {
      this.status = 'won';
      const p1Id = Object.keys(this.players)[0];
      const p2Id = Object.keys(this.players)[1];
      this.winnerId = userId === p1Id ? p2Id : p1Id;
      this.broadcastState();
      this.onGameEnd(this.roomId, this.winnerId, userId, false);
    } else if (action.type === 'offer_draw') {
      // Logic for offering draw can be handled here
      // For simplicity, we just broadcast a draw offer to the other player
      const opponentId = Object.keys(this.players).find(id => id !== userId);
      const opponentSocket = this.players[opponentId].socketId;
      if (opponentSocket) {
        this.io.to(opponentSocket).emit('game:draw_offered');
      }
    } else if (action.type === 'accept_draw') {
      this.status = 'draw';
      this.broadcastState();
      
      const p1Id = Object.keys(this.players)[0];
      const p2Id = Object.keys(this.players)[1];
      this.onGameEnd(this.roomId, p1Id, p2Id, true);
    }
  }

  checkGameEnd() {
    if (this.chess.isCheckmate()) {
      this.status = 'won';
      // The person who just moved won
      const turnColor = this.chess.turn(); // it's the loser's turn now
      const winnerColor = turnColor === 'w' ? 'b' : 'w';
      
      const p1Id = Object.keys(this.players)[0];
      const p2Id = Object.keys(this.players)[1];
      this.winnerId = this.players[p1Id].color === winnerColor ? p1Id : p2Id;
      const loserId = this.winnerId === p1Id ? p2Id : p1Id;
      
      this.onGameEnd(this.roomId, this.winnerId, loserId, false);
    } else if (this.chess.isDraw() || this.chess.isStalemate() || this.chess.isThreefoldRepetition() || this.chess.isInsufficientMaterial()) {
      this.status = 'draw';
      const p1Id = Object.keys(this.players)[0];
      const p2Id = Object.keys(this.players)[1];
      this.onGameEnd(this.roomId, p1Id, p2Id, true);
    }
  }

  destroy() {
    // Cleanup if necessary
  }
}

module.exports = Chess;
