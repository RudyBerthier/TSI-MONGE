class Connect4 {
  constructor(roomId, io, player1, player2, onGameEnd) {
    this.roomId = roomId;
    this.io = io;
    this.onGameEnd = onGameEnd;
    
    const p1Id = player1.id === player2.id ? `${player1.id}_1` : player1.id;
    const p2Id = player1.id === player2.id ? `${player2.id}_2` : player2.id;
    
    // Assign colors: player1 gets Red, player2 gets Yellow
    this.players = {
      [p1Id]: { ...player1, id: p1Id, color: 'R' },
      [p2Id]: { ...player2, id: p2Id, color: 'Y' }
    };
    
    // Board is a 6 rows x 7 cols grid (0 to 5 for rows, 0 to 6 for cols)
    // We represent it as a 1D array of 42 elements for simplicity or a 2D array. Let's use 2D: [row][col]
    // row 0 is the TOP, row 5 is the BOTTOM.
    this.board = Array(6).fill(null).map(() => Array(7).fill(null));
    
    this.currentPlayerId = p1Id;
    this.status = 'playing'; // 'playing', 'won', 'draw'
    this.winnerId = null;
    this.winningPieces = null; // Array of {row, col}
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
      winningPieces: this.winningPieces,
      players: this.players
    });
  }

  handleAction(userId, action) {
    if (this.status !== 'playing') return;
    if (userId !== this.currentPlayerId) return;

    if (action.type === 'play_turn') {
      const { col } = action.payload; // 0 to 6
      
      if (typeof col !== 'number' || col < 0 || col > 6) return;

      // Find the lowest empty row in this column
      let placedRow = -1;
      for (let r = 5; r >= 0; r--) {
        if (this.board[r][col] === null) {
          placedRow = r;
          break;
        }
      }

      // Column is full
      if (placedRow === -1) return;

      const playerColor = this.players[userId].color;
      this.board[placedRow][col] = playerColor;

      // Check win condition
      const winData = this.checkWin(placedRow, col, playerColor);
      
      if (winData) {
        this.status = 'won';
        this.winnerId = userId;
        this.winningPieces = winData; // [ {r, c}, {r, c}, {r, c}, {r, c} ]
        this.broadcastState();
        if (this.onGameEnd) {
          const p1Id = Object.keys(this.players)[0];
          const p2Id = Object.keys(this.players)[1];
          const loserId = (userId === p1Id) ? p2Id : p1Id;
          this.onGameEnd(this.roomId, this.winnerId, loserId, false);
        }
        return;
      } else if (this.checkDraw()) {
        this.status = 'draw';
        this.broadcastState();
        if (this.onGameEnd) {
          const p1Id = Object.keys(this.players)[0];
          const p2Id = Object.keys(this.players)[1];
          this.onGameEnd(this.roomId, p1Id, p2Id, true);
        }
        return;
      } else {
        // Swap turns
        const p1Id = Object.keys(this.players)[0];
        const p2Id = Object.keys(this.players)[1];
        this.currentPlayerId = (userId === p1Id) ? p2Id : p1Id;
      }

      this.broadcastState();
    }
  }

  checkDraw() {
    // If the top row is full, the board is full
    return this.board[0].every(cell => cell !== null);
  }

  checkWin(row, col, color) {
    const directions = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal /
      [1, -1]  // Diagonal \
    ];

    for (const [dr, dc] of directions) {
      const winningPieces = [{ r: row, c: col }];
      
      // Check positive direction
      for (let i = 1; i <= 3; i++) {
        const r = row + (dr * i);
        const c = col + (dc * i);
        if (r < 0 || r >= 6 || c < 0 || c >= 7 || this.board[r][c] !== color) break;
        winningPieces.push({ r, c });
      }

      // Check negative direction
      for (let i = 1; i <= 3; i++) {
        const r = row - (dr * i);
        const c = col - (dc * i);
        if (r < 0 || r >= 6 || c < 0 || c >= 7 || this.board[r][c] !== color) break;
        winningPieces.push({ r, c });
      }

      if (winningPieces.length >= 4) {
        return winningPieces.slice(0, 4); // Just return the 4 that caused the win
      }
    }

    return null;
  }

  destroy() {}
}

module.exports = Connect4;
