require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs').promises
const path = require('path')
const supabase = require('../config/supabase')

async function runSQL() {
  const sql = await fs.readFile(path.join(__dirname, '..', 'config', 'schema.sql'), 'utf8')

  // Split by statement and execute each
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Executing ${statements.length} SQL statements...`)

  for (const stmt of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql_string: stmt + ';' })
    if (error) {
      // Try direct query via REST - rpc may not work, use the SQL editor approach
      console.log('Note: rpc exec_sql not available, SQL must be run manually in Supabase SQL Editor')
      console.log('Copy the contents of server/config/schema.sql to your Supabase SQL Editor')
      return false
    }
  }
  return true
}

async function migrateSettings() {
  console.log('\n--- Migrating site_settings ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'site_settings.json'), 'utf8'))

    const rows = [
      { key: 'siteName', value: data.siteName, updated_at: data.lastUpdated },
      { key: 'schoolYear', value: data.schoolYear, updated_at: data.lastUpdated }
    ]

    const { error } = await supabase.from('site_settings').upsert(rows)
    if (error) throw error
    console.log('site_settings migrated successfully')
  } catch (e) {
    console.error('Error migrating site_settings:', e.message)
  }
}

async function migrateLinks() {
  console.log('\n--- Migrating quick_links ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'links.json'), 'utf8'))

    const rows = data.links.map((link, index) => ({
      title: link.title,
      description: link.description,
      url: link.url,
      icon: link.icon,
      emoji: link.emoji,
      display_order: index
    }))

    // Clear existing
    await supabase.from('quick_links').delete().gte('id', 0)

    const { error } = await supabase.from('quick_links').insert(rows)
    if (error) throw error
    console.log(`Migrated ${rows.length} links`)
  } catch (e) {
    console.error('Error migrating links:', e.message)
  }
}

async function migrateUsers() {
  console.log('\n--- Migrating users ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'users.json'), 'utf8'))

    const rows = data.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      password: u.password,
      role: u.role,
      email_verified: u.emailVerified || false,
      google_id: u.googleId || null,
      google_avatar: u.googleAvatar || null,
      avatar: u.avatar || null,
      two_factor_enabled: u.twoFactorEnabled || false,
      created_at: u.createdAt
    }))

    const { error } = await supabase.from('users').upsert(rows)
    if (error) throw error
    console.log(`Migrated ${rows.length} users`)
  } catch (e) {
    console.error('Error migrating users:', e.message)
  }
}

async function migratePolls() {
  console.log('\n--- Migrating polls ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'sondages.json'), 'utf8'))

    for (const s of data.sondages) {
      const { error } = await supabase.from('polls').upsert({
        id: s.id,
        title: s.title,
        description: s.description || '',
        options: s.options,
        votes: s.votes || {},
        user_votes: s.userVotes || {},
        active: s.active,
        created_at: s.createdAt
      })
      if (error) throw error
    }
    console.log(`Migrated ${data.sondages.length} polls`)
  } catch (e) {
    console.error('Error migrating polls:', e.message)
  }
}

async function migrateEvents() {
  console.log('\n--- Migrating events ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'events.json'), 'utf8'))

    const allEvents = [
      ...(data.events || []),
      ...(data.recurring || [])
    ]

    if (allEvents.length === 0) {
      console.log('No events to migrate')
      return
    }

    const rows = allEvents.map(e => ({
      id: e.id,
      type: e.type,
      title: e.title,
      matiere: e.matiere || '',
      jour: e.jour,
      heure: e.heure || '',
      salle: e.salle || '',
      description: e.description || '',
      week_num: e.weekNum || null,
      recurring: e.recurring || false
    }))

    const { error } = await supabase.from('events').upsert(rows)
    if (error) throw error
    console.log(`Migrated ${rows.length} events`)
  } catch (e) {
    console.error('Error migrating events:', e.message)
  }
}

async function migratePlaces() {
  console.log('\n--- Migrating seating_layouts ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'places.json'), 'utf8'))

    for (const [classId, classData] of Object.entries(data)) {
      const { error } = await supabase.from('seating_layouts').upsert({
        class_id: classId,
        start_date: classData.startDate,
        layout: classData.layout
      })
      if (error) throw error
    }
    console.log(`Migrated ${Object.keys(data).length} seating layouts`)
  } catch (e) {
    console.error('Error migrating places:', e.message)
  }
}

async function migrateForum() {
  console.log('\n--- Migrating forum ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'forum.json'), 'utf8'))

    for (const topic of data.topics) {
      const { error: topicError } = await supabase.from('forum_topics').upsert({
        id: topic.id,
        title: topic.title,
        category: topic.category,
        content: topic.content,
        author: topic.author,
        files: topic.files || [],
        likes: topic.likes || 0,
        dislikes: topic.dislikes || 0,
        device_votes: topic.deviceVotes || {},
        created_at: topic.createdAt
      })
      if (topicError) throw topicError

      for (const reply of (topic.replies || [])) {
        const { error: replyError } = await supabase.from('forum_replies').upsert({
          id: reply.id,
          topic_id: topic.id,
          content: reply.content,
          author: reply.author,
          files: reply.files || [],
          created_at: reply.createdAt
        })
        if (replyError) throw replyError
      }
    }
    console.log(`Migrated ${data.topics.length} forum topics`)
  } catch (e) {
    console.error('Error migrating forum:', e.message)
  }
}

async function migrateCantine() {
  console.log('\n--- Migrating cantine ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'cantine_avis.json'), 'utf8'))

    if (data.avis.length === 0) {
      console.log('No cantine reviews to migrate')
      return
    }

    for (const avis of data.avis) {
      const { error } = await supabase.from('cantine_reviews').upsert({
        id: avis.id,
        pseudo: avis.pseudo || 'Anonyme',
        note: avis.note,
        commentaire: avis.commentaire || '',
        plat: avis.plat || '',
        images: avis.images || [],
        reactions: avis.reactions || [],
        created_at: avis.createdAt
      })
      if (error) throw error
    }
    console.log(`Migrated ${data.avis.length} cantine reviews`)
  } catch (e) {
    console.error('Error migrating cantine:', e.message)
  }
}

async function migrateColloscope() {
  console.log('\n--- Migrating colloscope ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'colloscope.json'), 'utf8'))

    const colleurs = data.colleurs || data
    for (const [code, kholles] of Object.entries(colleurs)) {
      const { error } = await supabase.from('colloscope').upsert({
        code: code,
        kholles: kholles
      })
      if (error) throw error
    }
    console.log(`Migrated ${Object.keys(colleurs).length} colloscope entries`)
  } catch (e) {
    console.error('Error migrating colloscope:', e.message)
  }
}

async function migrateChatMessages() {
  console.log('\n--- Migrating chat messages ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'chat_messages.json'), 'utf8'))

    if (!data.messages || data.messages.length === 0) {
      console.log('No chat messages to migrate')
      return
    }

    // Insert in batches of 50
    const batch = 50
    for (let i = 0; i < data.messages.length; i += batch) {
      const chunk = data.messages.slice(i, i + batch).map(m => ({
        id: m.id,
        user_id: m.userId,
        username: m.username,
        avatar: m.avatar || null,
        content: m.content,
        timestamp: m.timestamp,
        reactions: m.reactions || [],
        edit_history: m.editHistory || [],
        read_by: m.readBy || [],
        reply_to: m.replyTo || null,
        attachment: m.attachment || null,
        is_edited: m.isEdited || false
      }))

      const { error } = await supabase.from('chat_messages').upsert(chunk)
      if (error) throw error
    }
    console.log(`Migrated ${data.messages.length} chat messages`)
  } catch (e) {
    console.error('Error migrating chat messages:', e.message)
  }
}

async function migratePrivateMessages() {
  console.log('\n--- Migrating private messages ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'private_messages.json'), 'utf8'))

    if (!data.conversations || data.conversations.length === 0) {
      console.log('No private conversations to migrate')
      return
    }

    for (const conv of data.conversations) {
      // Insert conversation
      const { error: convError } = await supabase.from('private_conversations').upsert({
        id: conv.id,
        participants: conv.participants,
        last_message: conv.lastMessage || null,
        updated_at: conv.updatedAt
      })
      if (convError) throw convError

      // Insert messages in batches
      if (conv.messages && conv.messages.length > 0) {
        const batch = 50
        for (let i = 0; i < conv.messages.length; i += batch) {
          const chunk = conv.messages.slice(i, i + batch).map(m => ({
            id: m.id,
            conversation_id: conv.id,
            sender_id: m.senderId,
            sender_username: m.senderUsername,
            sender_avatar: m.senderAvatar || null,
            content: m.content,
            timestamp: m.timestamp,
            read_by: m.readBy || [],
            reply_to: m.replyTo || null,
            attachment: m.attachment || null,
            reactions: m.reactions || [],
            edit_history: m.editHistory || [],
            is_edited: m.isEdited || false
          }))

          const { error } = await supabase.from('private_messages').upsert(chunk)
          if (error) throw error
        }
      }
    }
    console.log(`Migrated ${data.conversations.length} private conversations`)
  } catch (e) {
    console.error('Error migrating private messages:', e.message)
  }
}

async function migrateGroups() {
  console.log('\n--- Migrating groups ---')
  try {
    const data = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'groups.json'), 'utf8'))

    if (!data.groups || data.groups.length === 0) {
      console.log('No groups to migrate')
      return
    }

    for (const group of data.groups) {
      const { error: groupError } = await supabase.from('groups').upsert({
        id: group.id,
        name: group.name,
        creator_id: group.creatorId,
        members: group.members,
        last_message: group.lastMessage || null,
        created_at: group.createdAt,
        updated_at: group.updatedAt
      })
      if (groupError) throw groupError

      // Insert group messages
      if (group.messages && group.messages.length > 0) {
        const batch = 50
        for (let i = 0; i < group.messages.length; i += batch) {
          const chunk = group.messages.slice(i, i + batch).map(m => ({
            id: m.id,
            group_id: group.id,
            sender_id: m.userId || m.senderId,
            sender_username: m.username || m.senderUsername,
            sender_avatar: m.avatar || m.senderAvatar || null,
            content: m.content,
            timestamp: m.timestamp,
            reply_to: m.replyTo || null,
            attachment: m.attachment || null,
            reactions: m.reactions || [],
            edit_history: m.editHistory || [],
            is_edited: m.isEdited || false
          }))

          const { error } = await supabase.from('group_messages').upsert(chunk)
          if (error) throw error
        }
      }
    }
    console.log(`Migrated ${data.groups.length} groups`)
  } catch (e) {
    console.error('Error migrating groups:', e.message)
  }
}

async function main() {
  console.log('=== TSI-MONGE: Migration vers Supabase ===\n')
  console.log('NOTE: Vous devez d\'abord exécuter le SQL dans server/config/schema.sql')
  console.log('via le SQL Editor de Supabase (https://supabase.com/dashboard)\n')

  // Migrate all data
  await migrateSettings()
  await migrateLinks()
  await migrateUsers()
  await migratePolls()
  await migrateEvents()
  await migratePlaces()
  await migrateForum()
  await migrateCantine()
  await migrateColloscope()
  await migrateChatMessages()
  await migratePrivateMessages()
  await migrateGroups()

  console.log('\n=== Migration terminée ===')
}

main().catch(console.error)
