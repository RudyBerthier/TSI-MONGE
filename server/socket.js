const jwt = require('jsonwebtoken');
const supabase = require('./config/supabase');
const { sendNotificationToUser, sendNotificationToUsers } = require('./routes/push');
const { logActivity } = require('./utils/logger');
const GameManager = require('./games/GameManager');
const TicTacToe = require('./games/TicTacToe');
const Connect4 = require('./games/Connect4');
const RockPaperScissors = require('./games/RockPaperScissors');
const Chess = require('./games/Chess');

const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';
const MAX_MESSAGES = 500;
const MAX_MESSAGE_LENGTH = 2000;

// Allowed emojis for reactions
const ALLOWED_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥'];

// Rate limiting
const messageRates = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 10000;

// Periodic cleanup for rate limiting map
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of messageRates.entries()) {
    const recent = timestamps.filter(t => now - t < RATE_WINDOW);
    if (recent.length === 0) {
      messageRates.delete(userId);
    } else {
      messageRates.set(userId, recent);
    }
  }
}, 60000);

// ========== TRANSFORMATION HELPERS ==========

function chatMessageToFrontend(m) {
  return {
    id: m.id,
    userId: m.user_id,
    username: m.username,
    avatar: m.avatar,
    content: m.content,
    timestamp: m.timestamp,
    reactions: m.reactions || [],
    editHistory: m.edit_history || [],
    readBy: m.read_by || [],
    replyTo: m.reply_to,
    attachment: m.attachment,
    isEdited: m.is_edited || false
  };
}

function privateConversationToFrontend(c, messages) {
  return {
    id: c.id,
    participants: c.participants || [],
    messages: (messages || []).map(privateMessageToFrontend),
    lastMessage: c.last_message,
    updatedAt: c.updated_at
  };
}

function privateMessageToFrontend(m) {
  return {
    id: m.id,
    senderId: m.sender_id,
    senderUsername: m.sender_username,
    senderAvatar: m.sender_avatar,
    content: m.content,
    timestamp: m.timestamp,
    readBy: m.read_by || [],
    replyTo: m.reply_to,
    attachment: m.attachment,
    reactions: m.reactions || [],
    editHistory: m.edit_history || [],
    isEdited: m.is_edited || false
  };
}

function groupToFrontend(g, messages) {
  return {
    id: g.id,
    name: g.name,
    creatorId: g.creator_id,
    members: g.members || [],
    messages: (messages || []).map(groupMessageToFrontend),
    lastMessage: g.last_message,
    createdAt: g.created_at,
    updatedAt: g.updated_at
  };
}

// Helper: insert + broadcast a system message to a group
async function broadcastSystemMessage(io, onlineUsers, supabase, groupId, members, content) {
  const msg = {
    id: Date.now().toString() + '_sys',
    group_id: groupId,
    sender_id: null,
    sender_username: null,
    sender_avatar: null,
    content,
    timestamp: new Date().toISOString(),
    reply_to: null,
    attachment: null,
    reactions: [],
    edit_history: [],
    is_edited: false,
    is_system: true,
  };
  await supabase.from('group_messages').insert(msg);
  const frontend = { ...groupMessageToFrontend(msg), isSystem: true };
  for (const member of members) {
    for (const [socketId, userData] of onlineUsers.entries()) {
      if (userData.id === member.id) {
        io.to(socketId).emit('group:new-message', { groupId, message: frontend });
      }
    }
  }
}

function groupMessageToFrontend(m) {
  return {
    id: m.id,
    senderId: m.sender_id,
    senderUsername: m.sender_username,
    senderAvatar: m.sender_avatar,
    content: m.content,
    timestamp: m.timestamp,
    replyTo: m.reply_to,
    attachment: m.attachment,
    reactions: m.reactions || [],
    editHistory: m.edit_history || [],
    isEdited: m.is_edited || false,
    isSystem: m.is_system || false,
  };
}

function cantineReviewToFrontend(r) {
  return {
    id: r.id,
    pseudo: r.pseudo,
    note: r.note,
    commentaire: r.commentaire,
    plat: r.plat,
    images: r.images || [],
    reactions: r.reactions || [],
    createdAt: r.created_at
  };
}

// ========== CHAT MESSAGE HELPERS ==========

async function loadMessages() {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('timestamp', { ascending: true })
    .limit(MAX_MESSAGES);
  if (error) throw error;
  return (data || []).map(chatMessageToFrontend);
}

async function addMessage(message) {
  const { error } = await supabase.from('chat_messages').insert({
    id: message.id,
    user_id: message.userId,
    username: message.username,
    avatar: message.avatar,
    content: message.content,
    timestamp: message.timestamp,
    reactions: message.reactions || [],
    edit_history: message.editHistory || [],
    read_by: message.readBy || [],
    reply_to: message.replyTo || null,
    attachment: message.attachment || null,
    is_edited: false
  });
  if (error) throw error;

  // Enforce MAX_MESSAGES: count and delete oldest if needed
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true });
  if (count > MAX_MESSAGES) {
    const deleteCount = count - MAX_MESSAGES;
    const { data: oldest } = await supabase
      .from('chat_messages')
      .select('id')
      .order('timestamp', { ascending: true })
      .limit(deleteCount);
    if (oldest && oldest.length > 0) {
      await supabase
        .from('chat_messages')
        .delete()
        .in('id', oldest.map(m => m.id));
    }
  }
}

async function getMessage(messageId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('id', messageId)
    .single();
  if (error) return null;
  return data;
}

async function updateChatMessage(messageId, updates) {
  const { data, error } = await supabase
    .from('chat_messages')
    .update(updates)
    .eq('id', messageId)
    .select()
    .single();
  if (error) return null;
  return data;
}

async function deleteChatMessage(messageId) {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId);
  return !error;
}

// ========== PRIVATE CONVERSATION HELPERS ==========

function getConversationId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

function getOtherUserId(conversationId, myUserId) {
  if (conversationId.startsWith(myUserId + '_')) {
    return conversationId.slice(myUserId.length + 1);
  }
  if (conversationId.endsWith('_' + myUserId)) {
    return conversationId.slice(0, conversationId.length - myUserId.length - 1);
  }
  return null;
}

async function getOrCreateConversation(userId1, userId2, user1Data, user2Data) {
  const convId = getConversationId(userId1, userId2);

  const { data: existing } = await supabase
    .from('private_conversations')
    .select('*')
    .eq('id', convId)
    .single();

  if (existing) return existing;

  const conversation = {
    id: convId,
    participants: [
      { id: userId1, username: user1Data.username, avatar: user1Data.avatar || user1Data.google_avatar || null },
      { id: userId2, username: user2Data.username, avatar: user2Data.avatar || user2Data.google_avatar || null }
    ],
    last_message: null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('private_conversations')
    .insert(conversation)
    .select()
    .single();

  if (error) {
    // Race condition: another request created it
    const { data: retry } = await supabase
      .from('private_conversations')
      .select('*')
      .eq('id', convId)
      .single();
    return retry;
  }
  return data;
}

async function addPrivateMessage(userId1, userId2, message) {
  const convId = getConversationId(userId1, userId2);

  // Insert the message
  const { error: msgError } = await supabase.from('private_messages').insert({
    id: message.id,
    conversation_id: convId,
    sender_id: message.senderId,
    sender_username: message.senderUsername,
    sender_avatar: message.senderAvatar,
    content: message.content,
    timestamp: message.timestamp,
    read_by: message.readBy || [],
    reply_to: message.replyTo || null,
    attachment: message.attachment || null,
    reactions: [],
    edit_history: [],
    is_edited: false
  });
  if (msgError) throw msgError;

  // Update conversation last_message and updated_at
  const lastMessage = {
    content: message.attachment ? (message.content || '📎 Fichier') : message.content,
    senderId: message.senderId,
    timestamp: message.timestamp,
    hasAttachment: !!message.attachment
  };

  await supabase
    .from('private_conversations')
    .update({ last_message: lastMessage, updated_at: new Date().toISOString() })
    .eq('id', convId);

  // Enforce MAX_MESSAGES per conversation
  const { count } = await supabase
    .from('private_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', convId);
  if (count > MAX_MESSAGES) {
    const deleteCount = count - MAX_MESSAGES;
    const { data: oldest } = await supabase
      .from('private_messages')
      .select('id')
      .eq('conversation_id', convId)
      .order('timestamp', { ascending: true })
      .limit(deleteCount);
    if (oldest && oldest.length > 0) {
      await supabase
        .from('private_messages')
        .delete()
        .in('id', oldest.map(m => m.id));
    }
  }

  // Return the full conversation with messages for frontend
  return await getFullConversation(convId);
}

// Refresh participant avatars from users table (avatar → google_avatar → null)
async function refreshParticipantAvatars(participants) {
  if (!participants?.length) return participants;
  const ids = participants.map(p => p.id);
  const { data: users } = await supabase
    .from('users')
    .select('id, avatar, google_avatar')
    .in('id', ids);
  if (!users) return participants;
  return participants.map(p => {
    const u = users.find(u => u.id === p.id);
    return u ? { ...p, avatar: u.avatar || u.google_avatar || null } : p;
  });
}

async function getFullConversation(convId) {
  const { data: conv } = await supabase
    .from('private_conversations')
    .select('*')
    .eq('id', convId)
    .single();
  if (!conv) return null;

  conv.participants = await refreshParticipantAvatars(conv.participants);

  const { data: messages } = await supabase
    .from('private_messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('timestamp', { ascending: true });

  return privateConversationToFrontend(conv, messages || []);
}

async function getConversationsForUser(userId) {
  const { data: convs, error } = await supabase
    .from('private_conversations')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  // Filter conversations where user is a participant
  const userConvs = (convs || []).filter(c =>
    c.participants && c.participants.some(p => p.id === userId)
  );

  // Collect all unique participant IDs for a single batch avatar refresh
  const allIds = [...new Set(userConvs.flatMap(c => (c.participants || []).map(p => p.id)))];
  let avatarMap = {};
  if (allIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, avatar, google_avatar')
      .in('id', allIds);
    (users || []).forEach(u => {
      avatarMap[u.id] = u.avatar || u.google_avatar || null;
    });
  }

  // Load messages for each conversation
  const results = [];
  for (const conv of userConvs) {
    conv.participants = (conv.participants || []).map(p => ({
      ...p,
      avatar: avatarMap[p.id] !== undefined ? avatarMap[p.id] : p.avatar
    }));
    const { data: messages } = await supabase
      .from('private_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('timestamp', { ascending: true });
    results.push(privateConversationToFrontend(conv, messages || []));
  }
  return results;
}

async function markPrivateMessagesAsRead(convId, userId) {
  // Get all unread messages in this conversation not sent by this user
  const { data: messages } = await supabase
    .from('private_messages')
    .select('id, sender_id, read_by')
    .eq('conversation_id', convId)
    .neq('sender_id', userId);

  if (!messages) return;

  for (const msg of messages) {
    const readBy = msg.read_by || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await supabase
        .from('private_messages')
        .update({ read_by: readBy })
        .eq('id', msg.id);
    }
  }
}

// ========== GROUP HELPERS ==========

async function getGroupsForUser(userId) {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const userGroups = (groups || []).filter(g =>
    g.members && g.members.some(m => m.id === userId)
  );

  // Load messages for each group
  const results = [];
  for (const group of userGroups) {
    const { data: messages } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('timestamp', { ascending: true });
    results.push(groupToFrontend(group, messages || []));
  }
  return results;
}

async function getFullGroup(groupId) {
  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();
  if (!group) return null;

  const { data: messages } = await supabase
    .from('group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('timestamp', { ascending: true });

  return groupToFrontend(group, messages || []);
}

function checkRateLimit(userId) {
  const now = Date.now();
  const userRates = messageRates.get(userId) || [];
  const recentRates = userRates.filter(time => now - time < RATE_WINDOW);

  if (recentRates.length >= RATE_LIMIT) {
    return false;
  }

  recentRates.push(now);
  messageRates.set(userId, recentRates);
  return true;
}

// ========== FOCUS SESSIONS (multi-session system) ==========

const focusSessions = new Map(); // sessionId → session object
const userSessionMap = new Map(); // userId → sessionId (for persistence across refresh)

function createSession({ id, name, duration, creatorId, creatorName }) {
  const session = {
    id,
    name,
    duration, // total duration in seconds
    timeRemaining: duration,
    mode: 'work', // 'work' | 'break'
    creatorId,
    creatorName,
    participants: new Map(), // userId → { username, avatar }
    createdAt: Date.now(),
  };
  focusSessions.set(id, session);
  return session;
}

function sessionToJSON(session) {
  return {
    id: session.id,
    name: session.name,
    duration: session.duration,
    timeRemaining: session.timeRemaining,
    mode: session.mode,
    creatorId: session.creatorId,
    creatorName: session.creatorName,
    participants: Array.from(session.participants.entries()).map(([id, info]) => ({ id, ...info })),
    createdAt: session.createdAt,
  };
}

function getAllSessionsJSON() {
  return Array.from(focusSessions.values()).map(sessionToJSON);
}

// Global tick loop — ticks all active sessions
setInterval(() => {
  for (const [id, session] of focusSessions.entries()) {
    if (session.participants.size === 0) continue; // Don't tick empty sessions
    if (session.timeRemaining > 0) {
      session.timeRemaining -= 1;
    } else {
      // Switch modes
      if (session.mode === 'work') {
        session.mode = 'break';
        session.timeRemaining = Math.min(Math.floor(session.duration / 5), 10 * 60); // Break = 1/5 of work, max 10min
      } else {
        session.mode = 'work';
        session.timeRemaining = session.duration;
      }
    }
  }
}, 1000);

// ========== RADIO MONGE ==========
let radioQueue = []; // { id, name, artist, image, audioUrl, addedBy }
let currentRadioTrack = null;
let radioStartTime = 0;
const radioSkipVotes = new Set();

(async () => {
    try {
        const { data, error } = await supabase.from('radio_monge_state').select('*').eq('id', 1).single();
        if (data && !error && data.queue) {
            radioQueue = data.queue;
            currentRadioTrack = data.current_track || null;
            radioStartTime = data.start_time_ms || 0;
            console.log(`📻 Radio Monge: état restauré (Queue: ${radioQueue.length})`);
        }
    } catch(e) {
        console.error('Erreur restauration Radio Monge:', e);
    }
})();

async function saveRadioStateToSupabase() {
    try {
        await supabase.from('radio_monge_state').upsert({
            id: 1,
            queue: radioQueue,
            current_track: currentRadioTrack,
            start_time_ms: radioStartTime,
            updated_at: new Date()
        });
    } catch(e) {
        console.error('Erreur save Radio Monge:', e);
    }
}
function getRadioState() {
  const elapsed = currentRadioTrack ? (Date.now() - radioStartTime) / 1000 : 0;
  return {
    currentTrack: currentRadioTrack,
    queue: radioQueue,
    elapsed
  };
}

// ========== SOCKET.IO ==========

module.exports = (io) => {
  const gameManager = new GameManager(io);

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentification requise'));
    }

    try {
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Token invalide ou expiré'));
    }
  });

  const onlineUsers = new Map();
  const typingUsers = new Map();
  const dmTypingUsers = new Map();
  const userReadStatus = new Map();
  const callStartTimes = new Map(); // callId → { startedAt: Date, callType, initiatorId, toUserId }

  const getUniqueOnlineUsers = () => {
    const usersById = new Map();
    for (const userData of onlineUsers.values()) {
      if (!usersById.has(userData.id) || new Date(userData.connectedAt) > new Date(usersById.get(userData.id).connectedAt)) {
        usersById.set(userData.id, userData);
      }
    }
    return Array.from(usersById.values());
  };

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`✅ Chat: ${user.username} connecté`);

    // Radio Monge Handlers
    socket.on('radio:join', () => {
      console.log(`[Radio] ${user.username} joined radio_monge`);
      socket.join('radio_monge');
      socket.emit('radio:sync', getRadioState());
    });
    
    socket.on('radio:leave', () => {
      socket.leave('radio_monge');
    });
    
    socket.on('radio:add_to_queue', (track) => {
      const newTrack = {
        ...track,
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
        addedBy: user.username
      };
      radioQueue.push(newTrack);
      
      if (!currentRadioTrack) {
        currentRadioTrack = radioQueue.shift();
        radioStartTime = Date.now();
      }
      io.to('radio_monge').emit('radio:sync', getRadioState());
      saveRadioStateToSupabase();
    });
    
    socket.on('radio:remove_track', (trackId) => {
      const index = radioQueue.findIndex(t => t.id === trackId);
      if (index !== -1) {
        radioQueue.splice(index, 1);
        io.to('radio_monge').emit('radio:sync', getRadioState());
        saveRadioStateToSupabase();
      }
    });

    socket.on('radio:move_track', ({ trackId, step }) => {
      const index = radioQueue.findIndex(t => t.id === trackId);
      if (index !== -1) {
        const newIndex = index + step;
        if (newIndex >= 0 && newIndex < radioQueue.length) {
          const temp = radioQueue[index];
          radioQueue[index] = radioQueue[newIndex];
          radioQueue[newIndex] = temp;
          io.to('radio_monge').emit('radio:sync', getRadioState());
          saveRadioStateToSupabase();
        }
      }
    });

    socket.on('radio:play_track', (trackId) => {
      const index = radioQueue.findIndex(t => t.id === trackId);
      if (index !== -1) {
        currentRadioTrack = radioQueue[index];
        radioQueue.splice(0, index + 1);
        radioStartTime = Date.now();
        radioSkipVotes.clear();
        io.to('radio_monge').emit('radio:sync', getRadioState());
        saveRadioStateToSupabase();
      }
    });
    
    socket.on('radio:track_ended', ({ trackId }) => {
      if (currentRadioTrack && currentRadioTrack.id === trackId) {
        if (radioQueue.length > 0) {
          currentRadioTrack = radioQueue.shift();
          radioStartTime = Date.now();
        } else {
          currentRadioTrack = null;
          radioStartTime = 0;
        }
        radioSkipVotes.clear();
        io.to('radio_monge').emit('radio:sync', getRadioState());
        saveRadioStateToSupabase();
      }
    });

    socket.on('radio:vote_skip', () => {
      if (!currentRadioTrack) return;
      radioSkipVotes.add(user.id);
      
      const radioClients = io.sockets.adapter.rooms.get('radio_monge');
      const listenersCount = radioClients ? radioClients.size : 1;
      
      let requiredVotes = 1;
      if (listenersCount >= 2) requiredVotes = Math.max(2, Math.ceil(listenersCount / 2));
      
      if (radioSkipVotes.size >= requiredVotes) {
        // Skip track
        radioSkipVotes.clear();
        if (radioQueue.length > 0) {
          currentRadioTrack = radioQueue.shift();
          radioStartTime = Date.now();
        } else {
          currentRadioTrack = null;
          radioStartTime = 0;
        }
        io.to('radio_monge').emit('radio:sync', getRadioState());
        saveRadioStateToSupabase();
      } else {
        socket.emit('error', { message: `Vote pris en compte ! (${radioSkipVotes.size}/${requiredVotes} requis pour passer)` });
      }
    });

    socket.on('radio:leave', () => {
      socket.leave('radio_monge');
      radioSkipVotes.delete(user.id);
    });

    // Register handlers that clients may emit immediately after connect,
    // BEFORE any await so they are never missed due to async init latency.
    socket.on('dm:get-conversations', async () => {
      try {
        const conversations = await getConversationsForUser(user.id);
        console.log(`📨 Sending ${conversations.length} conversations to ${user.username} (${user.id})`);
        socket.emit('dm:conversations', conversations);
      } catch (err) {
        console.error('Erreur récupération conversations:', err);
        socket.emit('error', { message: 'Erreur lors de la récupération des conversations' });
      }
    });

    socket.on('group:get-all', async () => {
      try {
        const groups = await getGroupsForUser(user.id);
        socket.emit('group:list', groups);
      } catch (err) {
        console.error('Erreur récupération groupes:', err);
        socket.emit('error', { message: 'Erreur lors de la récupération des groupes' });
      }
    });

    // Get user avatar from Supabase
    let userAvatar = null;
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('avatar, google_avatar')
        .eq('id', user.id)
        .single();
      if (dbUser) {
        userAvatar = dbUser.avatar || dbUser.google_avatar || null;
      }
    } catch (err) {
      // Ignore
    }

    // Add to online users
    onlineUsers.set(socket.id, {
      id: user.id,
      username: user.username,
      avatar: userAvatar,
      connectedAt: new Date().toISOString()
    });

    // Broadcast user joined
    socket.broadcast.emit('user:joined', {
      username: user.username,
      timestamp: new Date().toISOString()
    });

    // Send online users list
    io.emit('users:online', getUniqueOnlineUsers());

    // ─── Focus Sessions ─────────────────────────────────────────────────
    // Send all sessions + check if user was in one (persistence)
    socket.emit('focus:sessions_list', getAllSessionsJSON());
    const previousSessionId = userSessionMap.get(user.id);
    if (previousSessionId && focusSessions.has(previousSessionId)) {
      socket.join(`focus_${previousSessionId}`);
      socket.emit('focus:rejoined', { sessionId: previousSessionId });
    }

    socket.on('focus:get_sessions', () => {
      socket.emit('focus:sessions_list', getAllSessionsJSON());
    });

    socket.on('focus:create', ({ name, duration }) => {
      if (!name || !duration || duration < 60 || duration > 180 * 60) return;
      const id = `focus_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      createSession({ id, name: name.substring(0, 50), duration, creatorId: user.id, creatorName: user.username });
      io.emit('focus:sessions_list', getAllSessionsJSON());
    });

    socket.on('focus:join', ({ sessionId }) => {
      const session = focusSessions.get(sessionId);
      if (!session) return;

      // Leave any current session first
      const currentSessionId = userSessionMap.get(user.id);
      if (currentSessionId && currentSessionId !== sessionId) {
        const oldSession = focusSessions.get(currentSessionId);
        if (oldSession) {
          oldSession.participants.delete(user.id);
          socket.leave(`focus_${currentSessionId}`);
        }
      }

      session.participants.set(user.id, { username: user.username, avatar: userAvatar });
      userSessionMap.set(user.id, sessionId);
      socket.join(`focus_${sessionId}`);

      // Broadcast updated session list to everyone
      io.emit('focus:sessions_list', getAllSessionsJSON());
      // Send sync to the joiner
      socket.emit('focus:sync', sessionToJSON(session));
    });

    socket.on('focus:leave', () => {
      const sessionId = userSessionMap.get(user.id);
      if (!sessionId) return;

      const session = focusSessions.get(sessionId);
      if (session) {
        session.participants.delete(user.id);
        // Delete empty sessions (except if they still have time)
        if (session.participants.size === 0 && Date.now() - session.createdAt > 5 * 60 * 1000) {
          focusSessions.delete(sessionId);
        }
      }

      userSessionMap.delete(user.id);
      socket.leave(`focus_${sessionId}`);
      io.emit('focus:sessions_list', getAllSessionsJSON());
    });

    socket.on('focus:delete', ({ sessionId }) => {
      const session = focusSessions.get(sessionId);
      if (!session || session.creatorId !== user.id) return;
      focusSessions.delete(sessionId);
      // Remove all users from this session
      for (const [uid, sid] of userSessionMap.entries()) {
        if (sid === sessionId) userSessionMap.delete(uid);
      }
      io.emit('focus:sessions_list', getAllSessionsJSON());
    });

    socket.on('focus:get_state', ({ sessionId }) => {
      const session = focusSessions.get(sessionId);
      if (session) socket.emit('focus:sync', sessionToJSON(session));
    });

    // Send message history
    try {
      const messages = await loadMessages();
      socket.emit('messages:history', messages);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
      socket.emit('messages:history', []);
    }

    // Re-request history
    socket.on('messages:request-history', async () => {
      try {
        const messages = await loadMessages();
        socket.emit('messages:history', messages);
        socket.emit('users:online', getUniqueOnlineUsers());
      } catch (err) {
        console.error('Erreur chargement messages:', err);
        socket.emit('messages:history', []);
      }
    });

    // Send a new message
    socket.on('message:send', async ({ content, replyTo, attachment }) => {
      const trimmedContent = (content || '').trim();
      if (!trimmedContent && !attachment) {
        return socket.emit('error', { message: 'Message vide' });
      }

      if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
        return socket.emit('error', {
          message: `Message trop long (max ${MAX_MESSAGE_LENGTH} caractères)`
        });
      }

      if (!checkRateLimit(user.id)) {
        return socket.emit('error', {
          message: 'Trop de messages. Attendez quelques secondes.'
        });
      }

      const message = {
        id: Date.now().toString(),
        userId: user.id,
        username: user.username,
        avatar: userAvatar,
        content: trimmedContent,
        timestamp: new Date().toISOString(),
        reactions: [],
        editHistory: [],
        readBy: [],
        replyTo: replyTo || null,
        attachment: attachment || null
      };

      try {
        await addMessage(message);
        io.emit('message:new', message);

        logActivity({
          actorId: user.id,
          actorUsername: user.username,
          action: 'chat.message.send',
          targetType: 'chat_message',
          targetId: message.id,
          details: { content: trimmedContent, hasAttachment: !!attachment }
        });

        // Stop typing indicator
        typingUsers.delete(socket.id);
        socket.broadcast.emit('typing:update', Array.from(typingUsers.values()));

        // Check for mentions and send push notifications to offline users
        const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
        const mentions = [...trimmedContent.matchAll(mentionRegex)].map(m => m[1].toLowerCase());

        if (mentions.length > 0) {
          try {
            for (const mention of mentions) {
              const { data: mentionedUser } = await supabase
                .from('users')
                .select('id, username')
                .ilike('username', mention)
                .single();

              if (mentionedUser && mentionedUser.id !== user.id) {
                const isOnline = [...onlineUsers.values()].some(u => u.id === mentionedUser.id);
                if (!isOnline) {
                  sendNotificationToUser(mentionedUser.id, {
                    title: `${user.username} vous a mentionné`,
                    body: trimmedContent.substring(0, 100),
                    icon: '/icon-192.svg',
                    badge: '/favicon.svg',
                    tag: 'group-mention',
                    data: { url: '/chat', type: 'mention' }
                  }).catch(err => console.error('Push notification error:', err));
                }
              }
            }
          } catch (err) {
            console.error('Error checking mentions:', err);
          }
        }
      } catch (err) {
        console.error('Erreur sauvegarde message:', err);
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
      }
    });

    // Edit a message
    socket.on('message:edit', async ({ messageId, newContent }) => {
      if (!newContent || typeof newContent !== 'string') {
        return socket.emit('error', { message: 'Contenu invalide' });
      }

      const trimmedContent = newContent.trim();
      if (!trimmedContent) {
        return socket.emit('error', { message: 'Message vide' });
      }

      if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
        return socket.emit('error', {
          message: `Message trop long (max ${MAX_MESSAGE_LENGTH} caractères)`
        });
      }

      try {
        const message = await getMessage(messageId);

        if (!message) {
          return socket.emit('error', { message: 'Message non trouvé' });
        }

        if (message.user_id !== user.id) {
          return socket.emit('error', { message: 'Vous ne pouvez modifier que vos propres messages' });
        }

        const editHistory = message.edit_history || [];
        editHistory.push({
          content: message.content,
          editedAt: new Date().toISOString()
        });

        const updatedMessage = await updateChatMessage(messageId, {
          content: trimmedContent,
          edit_history: editHistory,
          is_edited: true
        });

        if (updatedMessage) {
          io.emit('message:edited', chatMessageToFrontend(updatedMessage));
          logActivity({
            actorId: user.id,
            actorUsername: user.username,
            action: 'chat.message.edit',
            targetType: 'chat_message',
            targetId: messageId,
            details: { oldContent: message.content, newContent: trimmedContent }
          });
        }
      } catch (err) {
        console.error('Erreur modification message:', err);
        socket.emit('error', { message: 'Erreur lors de la modification' });
      }
    });

    // Add/remove a reaction
    socket.on('message:react', async ({ messageId, emoji }) => {
      if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
        return socket.emit('error', { message: 'Emoji invalide' });
      }

      try {
        const message = await getMessage(messageId);

        if (!message) {
          return socket.emit('error', { message: 'Message non trouvé' });
        }

        const reactions = message.reactions || [];
        const existingIndex = reactions.findIndex(
          r => r.userId === user.id && r.emoji === emoji
        );

        if (existingIndex !== -1) {
          reactions.splice(existingIndex, 1);
        } else {
          reactions.push({
            userId: user.id,
            username: user.username,
            emoji,
            timestamp: new Date().toISOString()
          });
        }

        const updatedMessage = await updateChatMessage(messageId, { reactions });

        if (updatedMessage) {
          io.emit('message:reacted', {
            messageId,
            reactions: updatedMessage.reactions
          });
        }
      } catch (err) {
        console.error('Erreur réaction:', err);
        socket.emit('error', { message: 'Erreur lors de la réaction' });
      }
    });

    // Delete a message
    socket.on('message:delete', async ({ messageId }) => {
      try {
        const message = await getMessage(messageId);

        if (!message) {
          return socket.emit('error', { message: 'Message non trouvé' });
        }

        if (message.user_id !== user.id) {
          return socket.emit('error', { message: 'Vous ne pouvez supprimer que vos propres messages' });
        }

        const deleted = await deleteChatMessage(messageId);

        if (deleted) {
          io.emit('message:deleted', { messageId });
          logActivity({
            actorId: user.id,
            actorUsername: user.username,
            action: 'chat.message.delete',
            targetType: 'chat_message',
            targetId: messageId,
            details: { content: message.content }
          });
        }
      } catch (err) {
        console.error('Erreur suppression message:', err);
        socket.emit('error', { message: 'Erreur lors de la suppression' });
      }
    });

    // Mark messages as read
    socket.on('message:read', async ({ messageId }) => {
      try {
        // Get messages up to and including the given messageId
        const { data: allMessages } = await supabase
          .from('chat_messages')
          .select('id, user_id, read_by, timestamp')
          .order('timestamp', { ascending: true });

        if (!allMessages) return;

        const messageIndex = allMessages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        let updated = false;

        for (let i = 0; i <= messageIndex; i++) {
          const msg = allMessages[i];
          if (msg.user_id === user.id) continue;

          const readBy = msg.read_by || [];
          const alreadyRead = readBy.some(r => r.userId === user.id);
          if (!alreadyRead) {
            readBy.push({
              userId: user.id,
              username: user.username,
              avatar: userAvatar,
              readAt: new Date().toISOString()
            });
            await supabase
              .from('chat_messages')
              .update({ read_by: readBy })
              .eq('id', msg.id);
            updated = true;
          }
        }

        if (updated) {
          io.emit('messages:read-update', {
            userId: user.id,
            username: user.username,
            avatar: userAvatar,
            lastReadMessageId: messageId
          });
        }
      } catch (err) {
        console.error('Erreur marquage lu:', err);
      }
    });

    // Typing indicators
    socket.on('typing:start', () => {
      typingUsers.set(socket.id, user.username);
      socket.broadcast.emit('typing:update', Array.from(typingUsers.values()));
    });

    socket.on('typing:stop', () => {
      typingUsers.delete(socket.id);
      socket.broadcast.emit('typing:update', Array.from(typingUsers.values()));
    });

    // ========== PRIVATE MESSAGES ==========

    // Start or get a conversation with another user
    socket.on('dm:start-conversation', async ({ targetUserId }) => {
      try {
        const { data: targetUser } = await supabase
          .from('users')
          .select('id, username, avatar, google_avatar')
          .eq('id', targetUserId)
          .single();

        if (!targetUser) {
          return socket.emit('error', { message: 'Utilisateur non trouvé' });
        }

        const targetAvatar = targetUser.avatar || targetUser.google_avatar || null;

        await getOrCreateConversation(
          user.id,
          targetUserId,
          { username: user.username, avatar: userAvatar },
          { username: targetUser.username, avatar: targetAvatar }
        );

        const convId = getConversationId(user.id, targetUserId);
        const conversation = await getFullConversation(convId);

        socket.emit('dm:conversation', conversation);
      } catch (err) {
        console.error('Erreur création conversation:', err);
        socket.emit('error', { message: 'Erreur lors de la création de la conversation' });
      }
    });

    // Send a private message
    socket.on('dm:send', async ({ targetUserId, content, replyTo, attachment }) => {
      const trimmedContent = (content || '').trim();
      if (!trimmedContent && !attachment) {
        return socket.emit('error', { message: 'Message vide' });
      }

      if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
        return socket.emit('error', { message: 'Message trop long' });
      }

      if (!checkRateLimit(user.id)) {
        return socket.emit('error', { message: 'Trop de messages. Attendez quelques secondes.' });
      }

      try {
        const message = {
          id: Date.now().toString(),
          senderId: user.id,
          senderUsername: user.username,
          senderAvatar: userAvatar,
          content: trimmedContent,
          timestamp: new Date().toISOString(),
          readBy: [],
          replyTo: replyTo || null,
          attachment: attachment || null
        };

        // Get target user info (including their blocked list)
        const { data: targetUser } = await supabase
          .from('users')
          .select('id, username, avatar, google_avatar, blocked_users')
          .eq('id', targetUserId)
          .single();

        if (!targetUser) {
          return socket.emit('error', { message: 'Utilisateur non trouvé' });
        }

        // Check if sender is blocked by the target
        const targetBlocked = Array.isArray(targetUser.blocked_users) ? targetUser.blocked_users : [];
        if (targetBlocked.includes(user.id)) {
          return socket.emit('error', { message: 'Vous ne pouvez pas envoyer de message à cet utilisateur.' });
        }

        const targetAvatar = targetUser.avatar || targetUser.google_avatar || null;

        // Ensure conversation exists
        await getOrCreateConversation(
          user.id,
          targetUserId,
          { username: user.username, avatar: userAvatar },
          { username: targetUser.username, avatar: targetAvatar }
        );

        const conversation = await addPrivateMessage(user.id, targetUserId, message);

        if (conversation) {
          const convId = getConversationId(user.id, targetUserId);
          const frontendMessage = privateMessageToFrontend({
            id: message.id,
            sender_id: message.senderId,
            sender_username: message.senderUsername,
            sender_avatar: message.senderAvatar,
            content: message.content,
            timestamp: message.timestamp,
            read_by: message.readBy,
            reply_to: message.replyTo,
            attachment: message.attachment,
            reactions: [],
            edit_history: [],
            is_edited: false
          });

          // Send to sender
          socket.emit('dm:new-message', { conversationId: convId, message: frontendMessage });
          socket.emit('dm:conversation', conversation);

          // Find target user's socket and send to them
          let targetIsOnline = false;
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === targetUserId) {
              targetIsOnline = true;
              io.to(socketId).emit('dm:conversation', conversation);
              io.to(socketId).emit('dm:new-message', { conversationId: convId, message: frontendMessage });
              io.to(socketId).emit('dm:notification', {
                conversationId: convId,
                from: user.username,
                content: trimmedContent.substring(0, 50)
              });
            }
          }

          if (!targetIsOnline) {
            sendNotificationToUser(targetUserId, {
              title: `Message de ${user.username}`,
              body: attachment ? '📎 ' + (trimmedContent || 'Fichier') : trimmedContent.substring(0, 100),
              icon: '/icon-192.svg',
              badge: '/favicon.svg',
              tag: `dm-${convId}`,
              data: { url: '/chat', type: 'dm', conversationId: convId }
            }).catch(err => console.error('Push notification error:', err));
          }

          logActivity({
            actorId: user.id,
            actorUsername: user.username,
            action: 'dm.message.send',
            targetType: 'private_message',
            targetId: message.id,
            targetLabel: `Conversation w/ ${targetUser.username}`,
            details: { content: trimmedContent, hasAttachment: !!attachment, targetUserId }
          });
        }
      } catch (err) {
        console.error('Erreur envoi DM:', err);
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
      }
    });

    // Mark DM conversation as read
    socket.on('dm:mark-read', async ({ conversationId }) => {
      try {
        await markPrivateMessagesAsRead(conversationId, user.id);

        const otherUserId = getOtherUserId(conversationId, user.id);

        for (const [socketId, userData] of onlineUsers.entries()) {
          if (userData.id === otherUserId) {
            io.to(socketId).emit('dm:read', {
              conversationId,
              readBy: {
                id: user.id,
                username: user.username,
                avatar: userAvatar,
                readAt: new Date().toISOString()
              }
            });
          }
        }
      } catch (err) {
        console.error('Erreur marquage DM lu:', err);
      }
    });

    // DM typing indicators
    socket.on('dm:typing:start', ({ targetUserId }) => {
      const convId = getConversationId(user.id, targetUserId);

      if (!dmTypingUsers.has(convId)) {
        dmTypingUsers.set(convId, new Map());
      }
      dmTypingUsers.get(convId).set(socket.id, user.username);

      for (const [socketId, userData] of onlineUsers.entries()) {
        if (userData.id === targetUserId) {
          io.to(socketId).emit('dm:typing:update', {
            conversationId: convId,
            typingUsers: Array.from(dmTypingUsers.get(convId).values())
          });
        }
      }
    });

    socket.on('dm:typing:stop', ({ targetUserId }) => {
      const convId = getConversationId(user.id, targetUserId);

      if (dmTypingUsers.has(convId)) {
        dmTypingUsers.get(convId).delete(socket.id);

        for (const [socketId, userData] of onlineUsers.entries()) {
          if (userData.id === targetUserId) {
            io.to(socketId).emit('dm:typing:update', {
              conversationId: convId,
              typingUsers: Array.from(dmTypingUsers.get(convId).values())
            });
          }
        }
      }
    });

    // Get messages for a specific conversation
    socket.on('dm:get-messages', async ({ targetUserId }) => {
      try {
        const convId = getConversationId(user.id, targetUserId);
        const { data: messages } = await supabase
          .from('private_messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('timestamp', { ascending: true });

        socket.emit('dm:messages', {
          conversationId: convId,
          messages: (messages || []).map(privateMessageToFrontend)
        });
      } catch (err) {
        console.error('Erreur récupération DMs:', err);
        socket.emit('error', { message: 'Erreur lors de la récupération des messages' });
      }
    });

    // DM React
    socket.on('dm:react', async ({ visavis, messageId, emoji }) => {
      if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
        return socket.emit('error', { message: 'Emoji invalide' });
      }
      if (!checkRateLimit(user.id)) {
        return socket.emit('error', { message: 'Trop de requêtes.' });
      }
      try {
        const convId = getConversationId(user.id, visavis);

        const { data: msg } = await supabase
          .from('private_messages')
          .select('id, reactions')
          .eq('id', messageId)
          .eq('conversation_id', convId)
          .single();

        if (!msg) return;

        const reactions = msg.reactions || [];
        const existingIndex = reactions.findIndex(r => r.emoji === emoji && r.userId === user.id);
        if (existingIndex !== -1) {
          reactions.splice(existingIndex, 1);
        } else {
          reactions.push({ emoji, userId: user.id, username: user.username });
        }

        await supabase
          .from('private_messages')
          .update({ reactions })
          .eq('id', messageId);

        socket.emit('dm:reacted', { conversationId: convId, messageId, reactions });
        for (const [socketId, userData] of onlineUsers.entries()) {
          if (userData.id === visavis) {
            io.to(socketId).emit('dm:reacted', { conversationId: convId, messageId, reactions });
          }
        }
      } catch (err) {
        console.error('Erreur réaction DM:', err);
      }
    });

    // DM Edit
    socket.on('dm:edit', async ({ visavis, messageId, newContent }) => {
      if (!checkRateLimit(user.id)) {
        return socket.emit('error', { message: 'Trop de requêtes.' });
      }
      try {
        const convId = getConversationId(user.id, visavis);

        const { data: msg } = await supabase
          .from('private_messages')
          .select('*')
          .eq('id', messageId)
          .eq('conversation_id', convId)
          .eq('sender_id', user.id)
          .single();

        if (!msg) return;

        const editHistory = msg.edit_history || [];
        editHistory.push({ content: msg.content, editedAt: new Date().toISOString() });

        const { data: updated } = await supabase
          .from('private_messages')
          .update({
            content: newContent.trim().substring(0, MAX_MESSAGE_LENGTH),
            edit_history: editHistory,
            is_edited: true
          })
          .eq('id', messageId)
          .select()
          .single();

        if (updated) {
          const frontendMsg = privateMessageToFrontend(updated);
          socket.emit('dm:edited', { conversationId: convId, message: frontendMsg });
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === visavis) {
              io.to(socketId).emit('dm:edited', { conversationId: convId, message: frontendMsg });
            }
          }

          logActivity({
            actorId: user.id,
            actorUsername: user.username,
            action: 'dm.message.edit',
            targetType: 'private_message',
            targetId: messageId,
            details: { oldContent: msg.content, newContent: newContent.trim().substring(0, MAX_MESSAGE_LENGTH) }
          });
        }
      } catch (err) {
        console.error('Erreur édition DM:', err);
      }
    });

    // DM Delete
    socket.on('dm:delete', async ({ visavis, messageId }) => {
      try {
        const convId = getConversationId(user.id, visavis);

        // Verify ownership
        const { data: msg } = await supabase
          .from('private_messages')
          .select('id')
          .eq('id', messageId)
          .eq('conversation_id', convId)
          .eq('sender_id', user.id)
          .single();

        if (!msg) return;

        await supabase
          .from('private_messages')
          .delete()
          .eq('id', messageId);

        // Get new last message
        const { data: lastMessages } = await supabase
          .from('private_messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('timestamp', { ascending: false })
          .limit(1);

        let newLastMessage = null;
        if (lastMessages && lastMessages.length > 0) {
          const lastMsg = lastMessages[0];
          newLastMessage = {
            content: lastMsg.content,
            senderId: lastMsg.sender_id,
            timestamp: lastMsg.timestamp,
            attachment: lastMsg.attachment || null
          };
        }

        await supabase
          .from('private_conversations')
          .update({ last_message: newLastMessage })
          .eq('id', convId);

        socket.emit('dm:deleted', { conversationId: convId, messageId, lastMessage: newLastMessage });
        for (const [socketId, userData] of onlineUsers.entries()) {
          if (userData.id === visavis) {
            io.to(socketId).emit('dm:deleted', { conversationId: convId, messageId, lastMessage: newLastMessage });
          }
        }

        logActivity({
          actorId: user.id,
          actorUsername: user.username,
          action: 'dm.message.delete',
          targetType: 'private_message',
          targetId: messageId,
          details: { content: msg.content || 'deleted' }
        });
      } catch (err) {
        console.error('Erreur suppression DM:', err);
      }
    });

    // Delete entire conversation
    socket.on('dm:delete-conversation', async ({ visavis }) => {
      try {
        const convId = getConversationId(user.id, visavis);

        // Delete all messages in the conversation
        await supabase
          .from('private_messages')
          .delete()
          .eq('conversation_id', convId);

        // Delete the conversation
        const { error } = await supabase
          .from('private_conversations')
          .delete()
          .eq('id', convId);

        if (!error) {
          socket.emit('dm:conversation-deleted', { conversationId: convId });
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === visavis) {
              io.to(socketId).emit('dm:conversation-deleted', { conversationId: convId });
            }
          }
        }
      } catch (err) {
        console.error('Erreur suppression conversation:', err);
      }
    });

    // ========== CUSTOM GROUPS ==========

    // Create a new group
    socket.on('group:create', async ({ name, memberIds }) => {
      try {
        if (!name || typeof name !== 'string' || name.trim().length < 1) {
          return socket.emit('error', { message: 'Nom du groupe requis' });
        }

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 1) {
          return socket.emit('error', { message: 'Ajoutez au moins un membre' });
        }

        // Get member info from Supabase
        const { data: users } = await supabase
          .from('users')
          .select('id, username, avatar, google_avatar')
          .in('id', memberIds.filter(id => id !== user.id));

        const members = (users || []).map(u => ({
          id: u.id,
          username: u.username,
          avatar: u.avatar || u.google_avatar || null
        }));

        if (members.length === 0) {
          return socket.emit('error', { message: 'Membres invalides' });
        }

        const groupId = `group_${Date.now()}`;
        const now = new Date().toISOString();

        const groupData = {
          id: groupId,
          name: name.trim().substring(0, 50),
          creator_id: user.id,
          members: [
            { id: user.id, username: user.username, avatar: userAvatar, role: 'admin' },
            ...members.map(m => ({ ...m, role: 'member' }))
          ],
          last_message: null,
          created_at: now,
          updated_at: now
        };

        const { error } = await supabase.from('groups').insert(groupData);
        if (error) throw error;

        const group = groupToFrontend(groupData, []);

        // Notify creator
        socket.emit('group:created', group);

        // Notify all members
        for (const member of members) {
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === member.id) {
              io.to(socketId).emit('group:created', group);
            }
          }
        }
      } catch (err) {
        console.error('Erreur création groupe:', err);
        socket.emit('error', { message: 'Erreur lors de la création du groupe' });
      }
    });

    // Send message to group
    socket.on('group:send', async ({ groupId, content, replyTo, attachment }) => {
      const trimmedContent = (content || '').trim();
      if (!trimmedContent && !attachment) {
        return socket.emit('error', { message: 'Message vide' });
      }

      if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
        return socket.emit('error', { message: 'Message trop long' });
      }

      if (!checkRateLimit(user.id)) {
        return socket.emit('error', { message: 'Trop de messages. Attendez quelques secondes.' });
      }

      try {
        const { data: group } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (!group) {
          return socket.emit('error', { message: 'Groupe non trouvé' });
        }

        if (!group.members.some(m => m.id === user.id)) {
          return socket.emit('error', { message: 'Vous n\'êtes pas membre de ce groupe' });
        }

        const messageId = Date.now().toString();
        const now = new Date().toISOString();

        const messageData = {
          id: messageId,
          group_id: groupId,
          sender_id: user.id,
          sender_username: user.username,
          sender_avatar: userAvatar,
          content: trimmedContent,
          timestamp: now,
          reply_to: replyTo || null,
          attachment: attachment || null,
          reactions: [],
          edit_history: [],
          is_edited: false
        };

        const { error: msgError } = await supabase.from('group_messages').insert(messageData);
        if (msgError) throw msgError;

        // Update group lastMessage and updatedAt
        const lastMessage = {
          content: attachment ? (trimmedContent || '📎 Fichier') : trimmedContent,
          senderId: user.id,
          senderUsername: user.username,
          timestamp: now,
          hasAttachment: !!attachment
        };

        await supabase
          .from('groups')
          .update({ last_message: lastMessage, updated_at: now })
          .eq('id', groupId);

        // Enforce MAX_MESSAGES per group
        const { count } = await supabase
          .from('group_messages')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId);
        if (count > MAX_MESSAGES) {
          const deleteCount = count - MAX_MESSAGES;
          const { data: oldest } = await supabase
            .from('group_messages')
            .select('id')
            .eq('group_id', groupId)
            .order('timestamp', { ascending: true })
            .limit(deleteCount);
          if (oldest && oldest.length > 0) {
            await supabase
              .from('group_messages')
              .delete()
              .in('id', oldest.map(m => m.id));
          }
        }

        const frontendMessage = groupMessageToFrontend(messageData);

        // Notify all group members
        for (const member of group.members) {
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === member.id) {
              io.to(socketId).emit('group:new-message', { groupId, message: frontendMessage });
            }
          }
        }

        logActivity({
          actorId: user.id,
          actorUsername: user.username,
          action: 'group.message.send',
          targetType: 'group_message',
          targetId: messageId,
          targetLabel: group.name,
          details: { content: trimmedContent, hasAttachment: !!attachment, groupId }
        });
      } catch (err) {
        console.error('Erreur envoi message groupe:', err);
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
      }
    });

    // Get messages for a specific group
    socket.on('group:get-messages', async ({ groupId }) => {
      try {
        const { data: group } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (!group || !group.members.some(m => m.id === user.id)) {
          return socket.emit('error', { message: 'Groupe non trouvé ou accès refusé' });
        }

        const { data: messages } = await supabase
          .from('group_messages')
          .select('*')
          .eq('group_id', groupId)
          .order('timestamp', { ascending: true });

        socket.emit('group:messages', {
          groupId,
          messages: (messages || []).map(groupMessageToFrontend)
        });
      } catch (err) {
        console.error('Erreur récupération messages groupe:', err);
      }
    });

    // Add member to group
    socket.on('group:add-member', async ({ groupId, memberId }) => {
      try {
        const { data: group } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (!group) {
          return socket.emit('error', { message: 'Groupe non trouvé' });
        }

        const userMember = group.members.find(m => m.id === user.id);
        if (!userMember || userMember.role !== 'admin') {
          return socket.emit('error', { message: 'Seul un admin peut ajouter des membres' });
        }

        if (group.members.some(m => m.id === memberId)) {
          return socket.emit('error', { message: 'Cet utilisateur est déjà membre' });
        }

        const { data: newMember } = await supabase
          .from('users')
          .select('id, username, avatar, google_avatar')
          .eq('id', memberId)
          .single();

        if (!newMember) {
          return socket.emit('error', { message: 'Utilisateur non trouvé' });
        }

        const memberAvatar = newMember.avatar || newMember.google_avatar || null;
        const newMemberObj = { id: newMember.id, username: newMember.username, avatar: memberAvatar, role: 'member' };

        const updatedMembers = [...group.members, newMemberObj];

        await supabase
          .from('groups')
          .update({ members: updatedMembers })
          .eq('id', groupId);

        // Notify all members including new one
        for (const member of updatedMembers) {
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === member.id) {
              io.to(socketId).emit('group:member-added', {
                groupId,
                member: newMemberObj
              });
            }
          }
        }

        // Send full group to new member
        const fullGroup = await getFullGroup(groupId);
        for (const [socketId, userData] of onlineUsers.entries()) {
          if (userData.id === memberId) {
            io.to(socketId).emit('group:created', fullGroup);
          }
        }

        // System message
        await broadcastSystemMessage(io, onlineUsers, supabase, groupId, updatedMembers,
          `${user.username} a ajouté ${newMemberObj.username}`);
      } catch (err) {
        console.error('Erreur ajout membre:', err);
      }
    });

    // Leave group
    // Kick a member (admin only)
    socket.on('group:kick', async ({ groupId, memberId }) => {
      try {
        const { data: group } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (!group) return socket.emit('error', { message: 'Groupe non trouvé' });

        // Only admin/creator can kick
        if (group.creator_id !== user.id) {
          return socket.emit('error', { message: 'Seul l\'admin peut exclure des membres' });
        }

        // Can't kick yourself (use leave instead)
        if (memberId === user.id) return;

        const memberExists = group.members.some(m => m.id === memberId);
        if (!memberExists) return;

        const updatedMembers = group.members.filter(m => m.id !== memberId);

        await supabase
          .from('groups')
          .update({ members: updatedMembers })
          .eq('id', groupId);

        // Notify kicked user
        for (const [socketId, userData] of onlineUsers.entries()) {
          if (userData.id === memberId) {
            io.to(socketId).emit('group:kicked', { groupId });
          }
        }

        // Notify remaining members
        for (const member of updatedMembers) {
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === member.id) {
              io.to(socketId).emit('group:member-left', { groupId, userId: memberId, username: '' });
            }
          }
        }

        // Confirm to admin
        socket.emit('group:kick-success', { groupId, memberId });

        // System message
        const kickedMember = group.members.find(m => m.id === memberId);
        if (kickedMember) {
          await broadcastSystemMessage(io, onlineUsers, supabase, groupId, updatedMembers,
            `${user.username} a exclu ${kickedMember.username}`);
        }
      } catch (err) {
        console.error('Erreur kick membre:', err);
      }
    });

    // Rename group (admin only)
    socket.on('group:rename', async ({ groupId, name }) => {
      const trimmed = (name || '').trim();
      if (!trimmed || trimmed.length > 50) return socket.emit('error', { message: 'Nom invalide' });
      try {
        const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
        if (!group) return socket.emit('error', { message: 'Groupe non trouvé' });
        if (group.creator_id !== user.id) return socket.emit('error', { message: 'Seul l\'admin peut renommer le groupe' });
        const oldName = group.name;
        await supabase.from('groups').update({ name: trimmed }).eq('id', groupId);

        // Broadcast updated group info to all members
        for (const member of group.members) {
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === member.id) {
              io.to(socketId).emit('group:updated', { groupId, name: trimmed });
            }
          }
        }
        // System message
        await broadcastSystemMessage(io, onlineUsers, supabase, groupId, group.members,
          `${user.username} a renommé le groupe en « ${trimmed} »`);
      } catch (err) {
        console.error('Erreur rename groupe:', err);
      }
    });

    socket.on('group:leave', async ({ groupId }) => {
      try {
        const { data: group } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (!group) return;

        const memberIndex = group.members.findIndex(m => m.id === user.id);
        if (memberIndex === -1) return;

        group.members.splice(memberIndex, 1);

        if (group.members.length === 0) {
          // Delete all group messages then the group
          await supabase.from('group_messages').delete().eq('group_id', groupId);
          await supabase.from('groups').delete().eq('id', groupId);
        } else {
          if (group.creator_id === user.id) {
            group.members[0].role = 'admin';
            group.creator_id = group.members[0].id;
          }
          await supabase
            .from('groups')
            .update({ members: group.members, creator_id: group.creator_id })
            .eq('id', groupId);
        }

        // Notify user who left
        socket.emit('group:left', { groupId });

        // Notify remaining members
        for (const member of group.members) {
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === member.id) {
              io.to(socketId).emit('group:member-left', { groupId, userId: user.id, username: user.username });
            }
          }
        }

        // System message
        if (group.members.length > 0) {
          await broadcastSystemMessage(io, onlineUsers, supabase, groupId, group.members,
            `${user.username} a quitté le groupe`);
        }
      } catch (err) {
        console.error('Erreur quitter groupe:', err);
      }
    });

    // Group message reactions
    socket.on('group:react', async ({ groupId, messageId, emoji }) => {
      if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
        return socket.emit('error', { message: 'Emoji invalide' });
      }
      if (!checkRateLimit(user.id)) {
        return socket.emit('error', { message: 'Trop de requêtes.' });
      }
      try {
        const { data: group } = await supabase
          .from('groups')
          .select('members')
          .eq('id', groupId)
          .single();

        if (!group || !group.members.some(m => m.id === user.id)) return;

        const { data: msg } = await supabase
          .from('group_messages')
          .select('id, reactions')
          .eq('id', messageId)
          .eq('group_id', groupId)
          .single();

        if (!msg) return;

        const reactions = msg.reactions || [];
        const existingIndex = reactions.findIndex(
          r => r.userId === user.id && r.emoji === emoji
        );

        if (existingIndex !== -1) {
          reactions.splice(existingIndex, 1);
        } else {
          reactions.push({ userId: user.id, username: user.username, emoji });
        }

        await supabase
          .from('group_messages')
          .update({ reactions })
          .eq('id', messageId);

        for (const member of group.members) {
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === member.id) {
              io.to(socketId).emit('group:reacted', { groupId, messageId, reactions });
            }
          }
        }
      } catch (err) {
        console.error('Erreur réaction groupe:', err);
      }
    });

    // Group message edit
    socket.on('group:edit', async ({ groupId, messageId, newContent }) => {
      try {
        const { data: group } = await supabase
          .from('groups')
          .select('members')
          .eq('id', groupId)
          .single();

        if (!group) return;

        const { data: msg } = await supabase
          .from('group_messages')
          .select('*')
          .eq('id', messageId)
          .eq('group_id', groupId)
          .eq('sender_id', user.id)
          .single();

        if (!msg) return;

        const editHistory = msg.edit_history || [];
        editHistory.push({
          content: msg.content,
          editedAt: new Date().toISOString()
        });

        const { data: updated } = await supabase
          .from('group_messages')
          .update({
            content: newContent.trim().substring(0, MAX_MESSAGE_LENGTH),
            edit_history: editHistory,
            is_edited: true
          })
          .eq('id', messageId)
          .select()
          .single();

        if (updated) {
          const frontendMsg = groupMessageToFrontend(updated);
          for (const member of group.members) {
            for (const [socketId, userData] of onlineUsers.entries()) {
              if (userData.id === member.id) {
                io.to(socketId).emit('group:edited', { groupId, message: frontendMsg });
              }
            }
          }

          logActivity({
            actorId: user.id,
            actorUsername: user.username,
            action: 'group.message.edit',
            targetType: 'group_message',
            targetId: messageId,
            targetLabel: group.name,
            details: { oldContent: msg.content, newContent: newContent.trim().substring(0, MAX_MESSAGE_LENGTH) }
          });
        }
      } catch (err) {
        console.error('Erreur édition message groupe:', err);
      }
    });

    // Group message delete
    socket.on('group:delete', async ({ groupId, messageId }) => {
      try {
        const { data: group } = await supabase
          .from('groups')
          .select('members')
          .eq('id', groupId)
          .single();

        if (!group) return;

        // Verify ownership
        const { data: msg } = await supabase
          .from('group_messages')
          .select('id')
          .eq('id', messageId)
          .eq('group_id', groupId)
          .eq('sender_id', user.id)
          .single();

        if (!msg) return;

        await supabase
          .from('group_messages')
          .delete()
          .eq('id', messageId);

        // Get new last message
        const { data: lastMessages } = await supabase
          .from('group_messages')
          .select('*')
          .eq('group_id', groupId)
          .order('timestamp', { ascending: false })
          .limit(1);

        let newLastMessage = null;
        if (lastMessages && lastMessages.length > 0) {
          const lastMsg = lastMessages[0];
          newLastMessage = {
            content: lastMsg.content,
            senderId: lastMsg.sender_id,
            senderUsername: lastMsg.sender_username,
            timestamp: lastMsg.timestamp,
            attachment: lastMsg.attachment || null
          };
        }

        await supabase
          .from('groups')
          .update({ last_message: newLastMessage })
          .eq('id', groupId);

        for (const member of group.members) {
          for (const [socketId, userData] of onlineUsers.entries()) {
            if (userData.id === member.id) {
              io.to(socketId).emit('group:deleted', { groupId, messageId, lastMessage: newLastMessage });
            }
          }
        }

        logActivity({
          actorId: user.id,
          actorUsername: user.username,
          action: 'group.message.delete',
          targetType: 'group_message',
          targetId: messageId,
          targetLabel: group.name,
          details: { content: msg.content || 'deleted' }
        });
      } catch (err) {
        console.error('Erreur suppression message groupe:', err);
      }
    });

    // ========== CANTINE REACTIONS ==========
    socket.on('cantine:react', async ({ avisId, emoji }) => {
      if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
        return socket.emit('error', { message: 'Emoji invalide' });
      }
      if (!checkRateLimit(user.id)) {
        return socket.emit('error', { message: 'Trop de requêtes.' });
      }

      try {
        const { data: avis } = await supabase
          .from('cantine_reviews')
          .select('id, reactions')
          .eq('id', avisId)
          .single();

        if (!avis) return;

        const reactions = avis.reactions || [];
        const existingIndex = reactions.findIndex(
          r => r.userId === user.id && r.emoji === emoji
        );

        if (existingIndex !== -1) {
          reactions.splice(existingIndex, 1);
        } else {
          reactions.push({
            emoji,
            userId: user.id,
            username: user.username,
            avatar: userAvatar
          });
        }

        await supabase
          .from('cantine_reviews')
          .update({ reactions })
          .eq('id', avisId);

        io.emit('cantine:reacted', { avisId, reactions });
      } catch (err) {
        console.error('Erreur réaction cantine:', err);
        socket.emit('error', { message: 'Erreur lors de la réaction' });
      }
    });

    // ─── Audio / Video calls ───────────────────────────────────────────

    function findSocketsForUser(userId) {
      const sockets = [];
      for (const [socketId, userData] of onlineUsers.entries()) {
        if (userData.id === userId) sockets.push(socketId);
      }
      return sockets;
    }

    // Save a call system message to a DM conversation and notify both parties
    async function saveDmCallMessage(userId1, userId2, callMsgData) {
      try {
        console.log(`📞 saveDmCallMessage: ${callMsgData.status} between ${userId1} and ${userId2}`);

        // Fetch both users to get their info (needed to create conversation if missing)
        const { data: users } = await supabase
          .from('users')
          .select('id, username, avatar, google_avatar')
          .in('id', [userId1, userId2]);

        const u1 = (users || []).find(u => u.id === userId1);
        const u2 = (users || []).find(u => u.id === userId2);
        if (!u1 || !u2) {
          console.error('saveDmCallMessage: users not found', userId1, userId2);
          return;
        }

        // Ensure conversation exists (creates it if it doesn't)
        await getOrCreateConversation(
          userId1, userId2,
          { username: u1.username, avatar: u1.avatar || u1.google_avatar || null },
          { username: u2.username, avatar: u2.avatar || u2.google_avatar || null }
        );

        const convId = getConversationId(userId1, userId2);
        const msgId = `call-${callMsgData.callId}-${Date.now()}`;
        const ts = new Date().toISOString();

        const attachment = {
          type: 'call',
          callType: callMsgData.callType,
          status: callMsgData.status,  // 'ended' | 'missed' | 'cancelled'
          duration: callMsgData.duration || 0,
          initiatorId: callMsgData.initiatorId,
          initiatorName: callMsgData.initiatorName,
        };

        const { error: insertError } = await supabase.from('private_messages').insert({
          id: msgId,
          conversation_id: convId,
          sender_id: callMsgData.initiatorId,
          sender_username: callMsgData.initiatorName,
          sender_avatar: null,
          content: '',
          timestamp: ts,
          read_by: [],
          reply_to: null,
          attachment,
          reactions: [],
          edit_history: [],
          is_edited: false
        });

        if (insertError) {
          console.error('saveDmCallMessage insert error:', insertError);
          return;
        }

        const lastContent = attachment.status === 'ended'
          ? `📞 Appel ${attachment.callType === 'video' ? 'vidéo' : 'audio'}`
          : `📵 Appel manqué`;

        await supabase
          .from('private_conversations')
          .update({
            last_message: { content: lastContent, senderId: callMsgData.initiatorId, timestamp: ts, hasAttachment: true },
            updated_at: ts
          })
          .eq('id', convId);

        const frontendMsg = privateMessageToFrontend({
          id: msgId,
          sender_id: callMsgData.initiatorId,
          sender_username: callMsgData.initiatorName,
          sender_avatar: null,
          content: '',
          timestamp: ts,
          read_by: [],
          reply_to: null,
          attachment,
          reactions: [],
          edit_history: [],
          is_edited: false
        });

        // Emit to both users: new message + full conversation (so it appears in sidebar even if new)
        const fullConv = await getFullConversation(convId);
        for (const uid of [userId1, userId2]) {
          for (const sid of findSocketsForUser(uid)) {
            io.to(sid).emit('dm:new-message', { conversationId: convId, message: frontendMsg });
            if (fullConv) io.to(sid).emit('dm:conversation', fullConv);
          }
        }

        console.log(`✅ Call message saved (${callMsgData.status}, ${callMsgData.duration}s) in conv ${convId}`);
      } catch (err) {
        console.error('saveDmCallMessage error:', err);
      }
    }

    socket.on('call:invite', async ({ callId, callType, toUserId, groupId, callerName, callerAvatar, groupName }) => {
      try {
        if (toUserId) {
          // DM call — store pending info for future status update
          callStartTimes.set(callId, {
            startedAt: null,
            callType,
            initiatorId: user.id,
            initiatorName: user.username,
            toUserId,
          });
          const targetSockets = findSocketsForUser(toUserId);
          for (const sid of targetSockets) {
            io.to(sid).emit('call:invite', {
              callId, callType, fromUserId: user.id, callerName, callerAvatar, isGroup: false
            });
          }
        } else if (groupId) {
          // Custom group call
          const { data: group } = await supabase
            .from('groups').select('members').eq('id', groupId).single();
          if (!group) return;
          for (const member of group.members) {
            if (member.id === user.id) continue;
            const memberSockets = findSocketsForUser(member.id);
            for (const sid of memberSockets) {
              io.to(sid).emit('call:invite', {
                callId, callType, fromUserId: user.id, callerName, callerAvatar, isGroup: true, groupId, groupName
              });
            }
          }
        }
      } catch (err) {
        console.error('Erreur call:invite:', err);
      }
    });

    socket.on('call:accept', ({ callId, to }) => {
      const info = callStartTimes.get(callId);
      if (info) {
        callStartTimes.set(callId, { ...info, startedAt: Date.now() });
      }
      const targetSockets = findSocketsForUser(to);
      for (const sid of targetSockets) {
        io.to(sid).emit('call:accept', { callId, from: user.id });
      }
    });

    socket.on('call:decline', async ({ callId, to }) => {
      const targetSockets = findSocketsForUser(to);
      for (const sid of targetSockets) {
        io.to(sid).emit('call:decline', { callId, from: user.id });
      }
      // Save missed-call message in DM
      const info = callStartTimes.get(callId);
      if (info && info.toUserId) {
        await saveDmCallMessage(info.initiatorId, info.toUserId, {
          callId,
          callType: info.callType,
          status: 'missed',
          duration: 0,
          initiatorId: info.initiatorId,
          initiatorName: info.initiatorName,
        });
        callStartTimes.delete(callId);
      }
    });

    socket.on('call:end', async ({ callId, to, groupId }) => {
      try {
        if (to) {
          const targetSockets = findSocketsForUser(to);
          for (const sid of targetSockets) {
            io.to(sid).emit('call:end', { callId });
          }
          // Save call-ended message in DM
          const info = callStartTimes.get(callId);
          if (info && info.toUserId) {
            const duration = info.startedAt ? Math.round((Date.now() - info.startedAt) / 1000) : 0;
            const status = info.startedAt ? 'ended' : 'cancelled';
            await saveDmCallMessage(info.initiatorId, info.toUserId, {
              callId,
              callType: info.callType,
              status,
              duration,
              initiatorId: info.initiatorId,
              initiatorName: info.initiatorName,
            });
            callStartTimes.delete(callId);
          }
        } else if (groupId) {
          const { data: group } = await supabase
            .from('groups').select('members').eq('id', groupId).single();
          if (!group) return;
          for (const member of group.members) {
            if (member.id === user.id) continue;
            const memberSockets = findSocketsForUser(member.id);
            for (const sid of memberSockets) {
              io.to(sid).emit('call:end', { callId });
            }
          }
        }
      } catch (err) {
        console.error('Erreur call:end:', err);
      }
    });

    socket.on('call:timeout', async ({ callId, to, isGroup, groupId }) => {
      try {
        if (!isGroup && to) {
          const targetSockets = findSocketsForUser(to);
          for (const sid of targetSockets) {
            io.to(sid).emit('call:timeout', { callId });
          }
          const info = callStartTimes.get(callId);
          if (info && info.toUserId) {
            await saveDmCallMessage(info.initiatorId, info.toUserId, {
              callId,
              callType: info.callType,
              status: 'missed',
              duration: 0,
              initiatorId: info.initiatorId,
              initiatorName: info.initiatorName,
            });
            callStartTimes.delete(callId);
          }
        } else if (isGroup && groupId) {
          const { data: group } = await supabase.from('groups').select('members').eq('id', groupId).single();
          if (!group) return;
          for (const member of group.members) {
            if (member.id === user.id) continue;
            const targetSockets = findSocketsForUser(member.id);
            for (const sid of targetSockets) {
              io.to(sid).emit('call:timeout', { callId });
            }
          }
        }
      } catch (err) {
        console.error('Erreur call:timeout:', err);
      }
    });

    socket.on('call:signal', ({ callId, to, signal }) => {
      const targetSockets = findSocketsForUser(to);
      for (const sid of targetSockets) {
        io.to(sid).emit('call:signal', { callId, from: user.id, signal });
      }
    });

    socket.on('call:busy', ({ callId, to }) => {
      const targetSockets = findSocketsForUser(to);
      for (const sid of targetSockets) {
        io.to(sid).emit('call:busy', { callId });
      }
    });

    // ─── Multiplayer Minigames ─────────────────────────────────────────
    
    socket.on('game:find_match', ({ gameType }) => {
      let GameClass;
      if (gameType === 'tictactoe') GameClass = TicTacToe;
      else if (gameType === 'connect4') GameClass = Connect4;
      else if (gameType === 'rps') GameClass = RockPaperScissors;
      else if (gameType === 'chess') GameClass = Chess;

      if (GameClass && socket.user) {
        gameManager.joinQueue(socket, socket.user, gameType, GameClass);
      }
    });

    socket.on('game:invite', ({ targetId, gameType }) => {
      let GameClass;
      if (gameType === 'tictactoe') GameClass = TicTacToe;
      else if (gameType === 'connect4') GameClass = Connect4;
      else if (gameType === 'rps') GameClass = RockPaperScissors;
      else if (gameType === 'chess') GameClass = Chess;

      if (GameClass && socket.user) {
        gameManager.invitePlayer(socket, socket.user, targetId, gameType, GameClass);
        
        // Notify target user on all their active sockets
        const targetSockets = findSocketsForUser(targetId);
        for (const sid of targetSockets) {
          io.to(sid).emit('game:invited', {
            inviterId: socket.user.id,
            inviterName: socket.user.username,
            gameType
          });
        }
      }
    });

    socket.on('game:accept_invite', ({ inviterId }) => {
      if (socket.user) {
        gameManager.acceptInvite(socket, socket.user, inviterId);
      }
    });

    socket.on('game:reject_invite', ({ inviterId }) => {
      if (socket.user) {
        gameManager.rejectInvite(socket.user, inviterId);
      }
    });

    socket.on('game:cancel_match', () => {
      gameManager.leaveQueue(socket);
    });

    socket.on('game:action', (action) => {
      socket.user = user; // Ensure user object is present
      gameManager.handleAction(socket, action);
    });

    socket.on('game:leave', () => {
      gameManager.handleLeaveRoom(socket);
    });

    // ────────────────────────────────────────────────────────────────────

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Chat: ${user.username} déconnecté`);

      onlineUsers.delete(socket.id);
      typingUsers.delete(socket.id);

      // Focus session cleanup
      const sessionId = userSessionMap.get(user.id);
      if (sessionId) {
        const session = focusSessions.get(sessionId);
        if (session) {
          session.participants.delete(user.id);
        }
        // Keep userSessionMap entry for reconnection persistence
        // It will be cleaned up when they explicitly leave
      }

      // Clean up DM typing
      for (const [convId, typingMap] of dmTypingUsers.entries()) {
        if (typingMap.has(socket.id)) {
          typingMap.delete(socket.id);
          const otherUserId = getOtherUserId(convId, user.id);
          if (otherUserId) {
            for (const [socketId, userData] of onlineUsers.entries()) {
              if (userData.id === otherUserId) {
                io.to(socketId).emit('dm:typing:update', {
                  conversationId: convId,
                  typingUsers: Array.from(typingMap.values())
                });
              }
            }
          }
        }
        if (typingMap.size === 0) {
          dmTypingUsers.delete(convId);
        }
      }

      // Clean up multiplayer minigames
      gameManager.handleDisconnect(socket);

      socket.broadcast.emit('user:left', {
        username: user.username,
        timestamp: new Date().toISOString()
      });

      io.emit('users:online', getUniqueOnlineUsers());
      socket.broadcast.emit('typing:update', Array.from(typingUsers.values()));
    });
  });

  // Focus sessions broadcast loop (every second to each session room)
  setInterval(() => {
    for (const [id, session] of focusSessions.entries()) {
      if (session.participants.size > 0) {
        io.to(`focus_${id}`).emit('focus:tick', sessionToJSON(session));
      }
    }
  }, 1000);
};
