const PokerGame = require('./PokerGame');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Assuming SUPABASE_URL and SUPABASE_SERVICE_KEY are in process.env
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
  }
);

class PokerRoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> PokerGame instance
  }

  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new PokerGame(roomId));
    }
    return this.rooms.get(roomId);
  }

  async handleConnection(socket) {
    let currentRoom = null;
    let currentUser = null;

    socket.on('poker:join', async ({ roomId, user }) => {
      if (!roomId || !user) return;

      socket.join(`poker:${roomId}`);
      currentRoom = roomId;
      currentUser = user;

      // Fetch user poker profile (chips) from Supabase
      let chips = 10000;
      try {
        const { data: profile, error } = await supabase
          .from('poker_profiles')
          .select('chips')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          chips = profile.chips;
        } else {
          // Create profile if doesn't exist
          await supabase.from('poker_profiles').insert({
            user_id: user.id,
            chips: 10000
          });
        }
      } catch (err) {
        console.error('Error fetching poker profile:', err);
      }

      const game = this.getRoom(roomId);
      game.addPlayer({
        id: user.id,
        socketId: socket.id,
        username: user.username,
        avatar: user.avatar || user.google_avatar || null,
        chips: chips
      });

      this.broadcastState(roomId);
    });

    socket.on('poker:action', ({ roomId, action, amount }) => {
      const game = this.rooms.get(roomId);
      if (!game || !currentUser) return;

      let success = false;
      if (action === 'fold') success = game.fold(currentUser.id);
      if (action === 'call') success = game.call(currentUser.id);
      if (action === 'raise') success = game.raise(currentUser.id, amount);

      if (success) {
        this.broadcastState(roomId);
      }
    });

    socket.on('poker:start', ({ roomId }) => {
      const game = this.rooms.get(roomId);
      if (game && game.status === 'WAITING') {
        const started = game.startGame();
        if (started) {
          this.broadcastState(roomId);
        }
      }
    });

    socket.on('disconnect', () => {
      if (currentRoom && currentUser) {
        const game = this.rooms.get(currentRoom);
        if (game) {
          game.removePlayer(currentUser.id);
          this.broadcastState(currentRoom);

          // Cleanup empty rooms
          if (game.players.length === 0) {
            this.rooms.delete(currentRoom);
          }
        }
      }
    });
  }

  broadcastState(roomId) {
    const game = this.rooms.get(roomId);
    if (!game) return;

    // Send state to each player individually so they only see their own cards
    const clients = this.io.sockets.adapter.rooms.get(`poker:${roomId}`);
    if (clients) {
      for (const clientId of clients) {
        const clientSocket = this.io.sockets.sockets.get(clientId);
        if (clientSocket) {
          // Find which user this socket belongs to
          const player = game.players.find(p => p.socketId === clientId);
          if (player) {
            clientSocket.emit('poker:state', game.getState(player.id));
          } else {
            // Spectator
            clientSocket.emit('poker:state', game.getState('spectator'));
          }
        }
      }
    }
  }
}

module.exports = PokerRoomManager;
