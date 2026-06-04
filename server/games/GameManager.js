const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// gameType -> queue (array of socket/user objects)
const queues = {};
// roomId -> game instance
const activeGames = {};
// socketId -> roomId
const socketToRoom = {};
// targetUserId -> { inviterSocket, inviterUser, gameType, GameClass, timeoutTimer }
const pendingInvites = {};

class GameManager {
  constructor(io) {
    this.io = io;
  }

  joinQueue(socket, user, gameType, GameClass) {
    console.log('!!!!!!! JOIN QUEUE !!!!!!!', user.username, gameType);
    if (!queues[gameType]) {
      queues[gameType] = [];
    }

    // Check if player is already in queue
    if (queues[gameType].find(p => p.socket.id === socket.id)) {
      console.log('!!!!!!! ALREADY IN QUEUE !!!!!!!');
      return; // Already in queue
    }

    console.log(`[GameManager] User ${user.username} joined queue for ${gameType}`);

    // If there is someone waiting, match them!
    if (queues[gameType].length > 0) {
      const opponent = queues[gameType].shift();
      console.log('!!!!!!! FOUND OPPONENT !!!!!!!', opponent.user.username);
      // We allow the same user to play against themselves if they open 2 tabs (for testing)
      
      this.createMatch(opponent, { socket, user }, gameType, GameClass);
    } else {
      console.log('!!!!!!! NOBODY IN QUEUE, WAITING !!!!!!!');
      // Nobody waiting, jump in queue
      queues[gameType].push({ socket, user });
    }
  }

  leaveQueue(socket) {
    for (const gameType in queues) {
      queues[gameType] = queues[gameType].filter(p => p.socket.id !== socket.id);
    }
  }

  createMatch(player1, player2, gameType, GameClass) {
    console.log('!!!!!!! CREATING MATCH !!!!!!!', player1.user.username, player2.user.username);
    const roomId = `game_${uuidv4()}`;
    
    // Join socket.io room
    player1.socket.join(roomId);
    player2.socket.join(roomId);

    socketToRoom[player1.socket.id] = roomId;
    socketToRoom[player2.socket.id] = roomId;

    console.log(`[GameManager] Match created: ${player1.user.username} vs ${player2.user.username} in ${roomId}`);

    const gameUser1 = { ...player1.user, socketId: player1.socket.id };
    const gameUser2 = { ...player2.user, socketId: player2.socket.id };

    const onGameEnd = (endedRoomId, winnerId, loserId, isDraw) => {
      this.handleGameEnd(endedRoomId, winnerId, loserId, isDraw, gameType);
    };

    const gameInstance = new GameClass(roomId, this.io, gameUser1, gameUser2, onGameEnd);
    activeGames[roomId] = gameInstance;

    console.log('!!!!!!! EMITTING GAME:MATCH_FOUND !!!!!!!');
    // Notify players that a match was found and game is starting
    this.io.to(roomId).emit('game:match_found', {
      roomId,
      gameType,
      players: [gameUser1, gameUser2]
    });

    // Start the game logic
    gameInstance.start();
  }

  async handleGameEnd(roomId, winnerId, loserId, isDraw, gameType) {
    console.log(`[GameManager] Game ${roomId} ended. Winner: ${winnerId}, Loser: ${loserId}, Draw: ${isDraw}`);
    
    // Helper to get or create score record
    const fetchOrInitScore = async (userId) => {
      const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('game', gameType)
        .maybeSingle();
        
      if (data) return data;
      
      // Auto-insert if no record exists
      const newRecord = { user_id: userId, game: gameType, elo_score: 1200, wins: 0, losses: 0, draws: 0 };
      await supabase.from('game_scores').insert(newRecord);
      return newRecord;
    };

    try {
      if (winnerId === loserId) {
        console.log('[GameManager] Skipping ELO update for self-play test game.');
        return;
      }

      const winnerRecord = await fetchOrInitScore(winnerId);
      const loserRecord = await fetchOrInitScore(loserId);

      // Simple ELO parameters
      const K = 32;
      const expectedA = 1 / (1 + Math.pow(10, (loserRecord.elo_score - winnerRecord.elo_score) / 400));
      const expectedB = 1 / (1 + Math.pow(10, (winnerRecord.elo_score - loserRecord.elo_score) / 400));

      let newWinnerElo, newLoserElo;
      
      if (isDraw) {
        newWinnerElo = Math.round(winnerRecord.elo_score + K * (0.5 - expectedA));
        newLoserElo = Math.round(loserRecord.elo_score + K * (0.5 - expectedB));
        
        await supabase.from('game_scores').update({ 
          elo_score: newWinnerElo, draws: winnerRecord.draws + 1, updated_at: new Date().toISOString()
        }).eq('user_id', winnerId).eq('game', gameType);

        await supabase.from('game_scores').update({ 
          elo_score: newLoserElo, draws: loserRecord.draws + 1, updated_at: new Date().toISOString()
        }).eq('user_id', loserId).eq('game', gameType);
      } else {
        newWinnerElo = Math.round(winnerRecord.elo_score + K * (1 - expectedA));
        newLoserElo = Math.round(loserRecord.elo_score + K * (0 - expectedB));
        
        await supabase.from('game_scores').update({ 
          elo_score: newWinnerElo, wins: winnerRecord.wins + 1, updated_at: new Date().toISOString()
        }).eq('user_id', winnerId).eq('game', gameType);

        await supabase.from('game_scores').update({ 
          elo_score: newLoserElo, losses: loserRecord.losses + 1, updated_at: new Date().toISOString()
        }).eq('user_id', loserId).eq('game', gameType);
      }
    } catch (err) {
      console.error('[GameManager] Error updating ranks:', err);
    }
    
    // We do NOT destroy the room automatically here because clients may want to see the "You Win / You Lose" screen.
    // The clients will hit `handleLeaveRoom` when they exit the modal.
  }

  handleAction(socket, action) {
    const roomId = socketToRoom[socket.id];
    if (roomId && activeGames[roomId]) {
      activeGames[roomId].handleAction(socket.user.id, action);
    }
  }

  handleDisconnect(socket) {
    this.leaveQueue(socket);
    
    const roomId = socketToRoom[socket.id];
    if (roomId && activeGames[roomId]) {
      const game = activeGames[roomId];
      this.io.to(roomId).emit('game:opponent_left', { message: "Ton adversaire s'est déconnecté." });
      
      // Cleanup
      game.destroy();
      const p1Socket = Array.from(this.io.sockets.adapter.rooms.get(roomId) || [])[0];
      const p2Socket = Array.from(this.io.sockets.adapter.rooms.get(roomId) || [])[1];
      
      if(p1Socket) { delete socketToRoom[p1Socket]; this.io.sockets.sockets.get(p1Socket)?.leave(roomId); }
      if(p2Socket) { delete socketToRoom[p2Socket]; this.io.sockets.sockets.get(p2Socket)?.leave(roomId); }
      
      delete activeGames[roomId];
    }
    delete socketToRoom[socket.id];
  }

  // Handle a player manually leaving a room
  handleLeaveRoom(socket) {
    const roomId = socketToRoom[socket.id];
    if (roomId && activeGames[roomId]) {
      const game = activeGames[roomId];
      socket.to(roomId).emit('game:opponent_left', { message: "Ton adversaire a quitté la partie." });
      
      game.destroy();
      
      // Remove all players from this room
      this.io.in(roomId).socketsJoin('dummy_room'); // Quick workaround to get sockets in room
      const clients = this.io.sockets.adapter.rooms.get(roomId);
      if (clients) {
        for (const clientId of clients) {
          this.io.sockets.sockets.get(clientId)?.leave(roomId);
          delete socketToRoom[clientId];
        }
      }
      
      delete activeGames[roomId];
    }
    delete socketToRoom[socket.id];
  }

  // -------------------------------------------------------------------------------------------------
  // Private Invites
  // -------------------------------------------------------------------------------------------------
  
  invitePlayer(inviterSocket, inviterUser, targetUserId, gameType, GameClass) {
    // If target has a pending invite from someone else, overwrite it or ignore? Overwrite for simplicity.
    if (pendingInvites[targetUserId]) {
      clearTimeout(pendingInvites[targetUserId].timeoutTimer);
    }

    // Auto-expire invite after 60 seconds
    const timeoutTimer = setTimeout(() => {
      if (pendingInvites[targetUserId]) {
        // Notify inviter it expired
        inviterSocket.emit('game:invite_expired', { targetId: targetUserId });
        delete pendingInvites[targetUserId];
      }
    }, 60000);

    pendingInvites[targetUserId] = {
      inviterSocket,
      inviterUser,
      gameType,
      GameClass,
      timeoutTimer
    };

    console.log(`[GameManager] ${inviterUser.username} invited ${targetUserId} to play ${gameType}`);
  }

  acceptInvite(targetSocket, targetUser, inviterId) {
    const invite = pendingInvites[targetUser.id];
    
    // Ensure invite exists and matches the inviter
    if (invite && invite.inviterUser.id === inviterId) {
      clearTimeout(invite.timeoutTimer);
      delete pendingInvites[targetUser.id];
      
      console.log(`[GameManager] ${targetUser.username} accepted invite from ${invite.inviterUser.username}`);

      // We have both sockets, let's create the match directly!
      this.createMatch(
        { socket: invite.inviterSocket, user: invite.inviterUser },
        { socket: targetSocket, user: targetUser },
        invite.gameType,
        invite.GameClass
      );
      
      // Tell inviter that it was accepted so their UI can route to /social/games
      invite.inviterSocket.emit('game:invite_accepted', { targetId: targetUser.id });
    } else {
      // Invite expired or invalid
      targetSocket.emit('error', { message: "L'invitation a expiré ou n'est plus valide." });
    }
  }

  rejectInvite(targetUser, inviterId) {
    const invite = pendingInvites[targetUser.id];
    if (invite && invite.inviterUser.id === inviterId) {
      clearTimeout(invite.timeoutTimer);
      delete pendingInvites[targetUser.id];
      // Notify inviter
      invite.inviterSocket.emit('game:invite_rejected', { targetId: targetUser.id, targetName: targetUser.username });
    }
  }
}

module.exports = GameManager;
