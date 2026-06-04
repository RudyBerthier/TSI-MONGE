class TicTacToe {
  constructor(roomId, io, player1, player2, onGameEnd) {
    this.roomId = roomId;
    this.io = io;
    this.onGameEnd = onGameEnd;
    const p1Id = player1.id === player2.id ? `${player1.id}_1` : player1.id;
    const p2Id = player1.id === player2.id ? `${player2.id}_2` : player2.id;

    this.players = {
      [p1Id]: { ...player1, id: p1Id, symbol: 'X' },
      [p2Id]: { ...player2, id: p2Id, symbol: 'O' }
    };
    
    // Board is a 1D array of 9 elements (index 0-8)
    // null = empty, 'X' = player1, 'O' = player2
    this.board = Array(9).fill(null);
    this.currentPlayerId = p1Id;
    this.status = 'playing'; // 'playing', 'won', 'draw'
    this.winnerId = null;
    this.winningLine = null;
  }

  start() {
    this.broadcastState();
  }

  broadcastState() {
    this.io.to(this.roomId).emit('game:update', {
      board: this.board,
      status: this.status,
      currentPlayerId: this.currentPlayerId,
      winnerId: this.winnerId,
      winningLine: this.winningLine,
      players: this.players
    });
  }

  handleAction(userId, action) {
    if (this.status !== 'playing') return;
    if (userId !== this.currentPlayerId) return; // Not their turn

    if (action.type === 'play_turn') {
      const { index } = action.payload; // 0 to 8
      
      if (index < 0 || index > 8 || this.board[index] !== null) return; // Invalid move

      // Apply move
      this.board[index] = this.players[userId].symbol;

      // Check win or draw
      if (this.checkWin(this.players[userId].symbol)) {
        this.status = 'won';
        this.winnerId = userId;
        this.broadcastState();
        if (this.onGameEnd) {
          const p1Id = Object.keys(this.players)[0];
          const p2Id = Object.keys(this.players)[1];
          const loserId = (userId === p1Id) ? p2Id : p1Id;
          this.onGameEnd(this.roomId, this.winnerId, loserId, false);
        }
        return;
      } else if (this.board.every(cell => cell !== null)) {
        this.status = 'draw';
        this.broadcastState();
        if (this.onGameEnd) {
          const p1Id = Object.keys(this.players)[0];
          const p2Id = Object.keys(this.players)[1];
          this.onGameEnd(this.roomId, p1Id, p2Id, true);
        }
        return;
      } else {
        // Swap turn
        const p1Id = Object.keys(this.players)[0];
        const p2Id = Object.keys(this.players)[1];
        this.currentPlayerId = (userId === p1Id) ? p2Id : p1Id;
      }

      this.broadcastState();
    }
  }

  checkWin(symbol) {
    const winLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const line of winLines) {
      const [a, b, c] = line;
      if (this.board[a] === symbol && this.board[b] === symbol && this.board[c] === symbol) {
        this.winningLine = line;
        return true;
      }
    }
    return false;
  }

  destroy() {
    // Cleanup any timers if needed
  }
}

module.exports = TicTacToe;
