const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const supabase = require('../config/supabase')
const jwt = require('jsonwebtoken')
const { sendCarpoolEmail } = require('../services/email')
const { sendNotificationToUser } = require('./push')

const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025'

// Middleware for JWT verification
function jwtWithUser(req, res, next) {
  const token = req.query.token || req.headers['authorization']?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Non autorisé' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(403).json({ error: 'Token invalide' })
  }
}

// ----------------------------------------------------------------------
// GET /api/carpool - List active rides
// ----------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    // We only fetch active rides whose departure_time is in the future
    const { data: rides, error } = await supabase
      .from('carpool_rides')
      .select(`
        *,
        driver:users!driver_id ( username, avatar, google_avatar )
      `)
      .eq('status', 'active')
      .gte('departure_time', new Date().toISOString())
      .order('departure_time', { ascending: true })

    if (error) {
      // If table doesn't exist (PGRST204), return empty array so frontend doesn't break
      if (error.code === 'PGRST204' || error.message?.includes('relation "carpool_rides" does not exist')) {
        return res.json([])
      }
      throw error
    }

    res.json(rides || [])
  } catch (error) {
    console.error('Erreur listage covoiturage:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération des trajets' })
  }
})

// ----------------------------------------------------------------------
// POST /api/carpool - Create a ride (Offer a ride)
// ----------------------------------------------------------------------
router.post('/', jwtWithUser, async (req, res) => {
  const { origin, originLat, originLng, destination, destLat, destLng, departureTime, seatsOffered, price, priceType, description, recurringWeeks, priceDetails } = req.body

  if (!origin || !destination || !departureTime || !seatsOffered || !originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ error: 'Origine, destination (avec coordonnées), heure et nombre de places requis' })
  }

  try {
    const baseRide = {
      driver_id: req.user.id,
      origin,
      origin_lat: parseFloat(originLat),
      origin_lng: parseFloat(originLng),
      destination,
      dest_lat: parseFloat(destLat),
      dest_lng: parseFloat(destLng),
      seats_offered: parseInt(seatsOffered),
      seats_available: parseInt(seatsOffered),
      price: parseInt(price) || 0,
      price_type: priceType === 'divided' ? 'divided' : 'per_person',
      price_details: priceDetails || null,
      description: description || ''
    }

    let ridesToInsert = []
    const weeksCount = recurringWeeks ? parseInt(recurringWeeks) : 0
    const startDate = new Date(departureTime)

    for (let i = 0; i <= weeksCount; i++) {
      const dTime = new Date(startDate)
      dTime.setDate(dTime.getDate() + (i * 7))
      ridesToInsert.push({ ...baseRide, departure_time: dTime.toISOString() })
    }

    const { data: rides, error } = await supabase
      .from('carpool_rides')
      .insert(ridesToInsert)
      .select()

    if (error) throw error

    // Broadcast to connected clients
    const io = req.app.get('io')
    if (io && rides) {
      rides.forEach(r => io.emit('carpool:new', r))
    }

    res.status(201).json(rides[0])
  } catch (error) {
    console.error('Erreur création covoiturage:', error)
    if (error.message?.includes('relation "carpool_rides" does not exist')) {
      return res.status(500).json({ error: 'La base de données doit être mise à jour par l\'administrateur.' })
    }
    res.status(500).json({ error: 'Erreur lors de la création du trajet' })
  }
})

// ----------------------------------------------------------------------
// PUT /api/carpool/:id - Modify a ride (driver only, > 24h before departure)
// ----------------------------------------------------------------------
router.put('/:id', jwtWithUser, async (req, res) => {
  const { id } = req.params
  const { origin, originLat, originLng, destination, destLat, destLng, departureTime, seatsOffered, price, priceType, description, priceDetails } = req.body

  try {
    // 1. Fetch current ride
    const { data: ride, error: fetchError } = await supabase
      .from('carpool_rides')
      .select('*, driver:driver_id(id, name, email)')
      .eq('id', id)
      .single()

    if (fetchError || !ride) return res.status(404).json({ error: 'Trajet introuvable' })
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })
    if (ride.status !== 'active') return res.status(400).json({ error: 'Trajet non modifiable' })

    // 2. Check 24h constraint
    const now = new Date()
    const departure = new Date(ride.departure_time)
    const hoursDifference = (departure - now) / (1000 * 60 * 60)
    
    if (hoursDifference < 24) {
      return res.status(400).json({ error: 'Impossible de modifier un trajet à moins de 24h du départ.' })
    }

    // 3. Calculate new seats_available based on existing passengers
    const differenceInSeats = parseInt(seatsOffered) - ride.seats_offered
    const newSeatsAvailable = ride.seats_available + differenceInSeats
    if (newSeatsAvailable < 0) {
      return res.status(400).json({ error: 'Vous ne pouvez pas réduire le nombre de places en dessous du nombre de passagers déjà acceptés.' })
    }

    // 4. Update the ride
    const { data: updatedRide, error: updateError } = await supabase
      .from('carpool_rides')
      .update({
        origin,
        origin_lat: parseFloat(originLat),
        origin_lng: parseFloat(originLng),
        destination,
        dest_lat: parseFloat(destLat),
        dest_lng: parseFloat(destLng),
        departure_time: departureTime,
        seats_offered: parseInt(seatsOffered),
        seats_available: newSeatsAvailable,
        price: parseInt(price) || 0,
        price_type: priceType === 'divided' ? 'divided' : 'per_person',
        price_details: priceDetails || null,
        description: description || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // 5. Notify all pending and accepted passengers
    const { data: passengers } = await supabase
      .from('carpool_passengers')
      .select('status, user:user_id(name, email)')
      .eq('ride_id', id)
      .in('status', ['pending', 'accepted'])

    if (passengers && passengers.length > 0) {
      passengers.forEach(p => {
        if (p.user?.email) {
          sendCarpoolEmail(p.user.email, 'modified', {
            driverName: ride.driver?.name || 'Le conducteur',
            passengerName: p.user.name,
            origin: updatedRide.origin,
            destination: updatedRide.destination,
            rideId: id
          }).catch(console.error)
        }
      })
    }

    // Broadcast update
    const io = req.app.get('io')
    if (io) {
      io.emit('carpool:updated', updatedRide)
    }

    res.json(updatedRide)
  } catch (error) {
    console.error('Erreur modification covoiturage:', error)
    res.status(500).json({ error: 'Erreur lors de la modification' })
  }
})

// ----------------------------------------------------------------------
// GET /api/carpool/fuel-prices
router.get('/fuel-prices', (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../data/fuel_prices.json')
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      res.json(data)
    } else {
      res.json({ Gazole: 1.8, SP95: 1.85, E85: 0.85, E10: 1.8, SP98: 1.9 }) // fallback
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read fuel prices' })
  }
})

// GET /api/carpool/history - Get user's past rides (driver or passenger)
// ----------------------------------------------------------------------
router.get('/history', jwtWithUser, async (req, res) => {
  try {
    const userId = req.user.id
    
    // Get rides where user is driver
    const { data: driverRides, error: driverError } = await supabase
      .from('carpool_rides')
      .select('*, driver:users!driver_id ( username, avatar, google_avatar ), passengers:carpool_passengers(status, user_id, user:users!user_id(id, username, avatar, google_avatar))')
      .eq('driver_id', userId)
      .order('departure_time', { ascending: false })

    if (driverError) throw driverError

    // Get rides where user is passenger
    const { data: passengerRequests, error: passError } = await supabase
      .from('carpool_passengers')
      .select('ride_id, status')
      .eq('user_id', userId)

    if (passError) throw passError

    let passengerRides = []
    if (passengerRequests && passengerRequests.length > 0) {
      const rideIds = passengerRequests.map(p => p.ride_id)
      const { data: pRides, error: pRidesError } = await supabase
        .from('carpool_rides')
        .select('*, driver:users!driver_id ( username, avatar, google_avatar )')
        .in('id', rideIds)
        .order('departure_time', { ascending: false })
      
      if (pRidesError) throw pRidesError
      
      // Merge passenger status into the ride object for the frontend
      passengerRides = pRides.map(r => {
        const reqStat = passengerRequests.find(p => p.ride_id === r.id)
        return { ...r, myPassengerStatus: reqStat ? reqStat.status : null }
      })
    }

    // Get reviews written by this user
    const { data: userReviews, error: revError } = await supabase
      .from('carpool_reviews')
      .select('ride_id, reviewee_id')
      .eq('reviewer_id', userId)

    if (revError) throw revError

    res.json({
      driverRides: driverRides || [],
      passengerRides: passengerRides || [],
      userReviews: userReviews || []
    })

  } catch (error) {
    console.error('Erreur historique covoiturage:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' })
  }
})

// ----------------------------------------------------------------------
// GET /api/carpool/:id - Get ride details + passengers
// ----------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    // 1. Fetch ride
    const { data: ride, error: rideError } = await supabase
      .from('carpool_rides')
      .select(`
        *,
        driver:users!driver_id ( id, username, avatar, google_avatar, links )
      `)
      .eq('id', req.params.id)
      .single()

    if (rideError) throw rideError

    // 2. Fetch passengers
    const { data: passengers, error: passError } = await supabase
      .from('carpool_passengers')
      .select(`
        *,
        user:users!user_id ( id, username, avatar, google_avatar, links )
      `)
      .eq('ride_id', req.params.id)

    if (passError) throw passError

    ride.passengers = passengers || []

    // 3. Fetch reviews for this ride to prevent duplicate reviews in UI
    const { data: reviews, error: reviewsError } = await supabase
      .from('carpool_reviews')
      .select('reviewer_id, reviewee_id, rating')
      .eq('ride_id', req.params.id)

    ride.reviews = (!reviewsError && reviews) ? reviews : []

    res.json(ride)
  } catch (error) {
    console.error('Erreur détails covoiturage:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération des détails' })
  }
})

// ----------------------------------------------------------------------
// POST /api/carpool/:id/start - Start a ride
// ----------------------------------------------------------------------
router.post('/:id/start', jwtWithUser, async (req, res) => {
  try {
    const { data: ride } = await supabase.from('carpool_rides').select('driver_id, origin, destination').eq('id', req.params.id).single()
    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })

    const { error } = await supabase.from('carpool_rides').update({ status: 'in_progress' }).eq('id', req.params.id)
    if (error) throw error

    const io = req.app.get('io')
    if (io) io.to(`carpool_${req.params.id}`).emit('carpool:update')

    // Notify accepted passengers
    const { data: passengers } = await supabase.from('carpool_passengers').select('user_id').eq('ride_id', req.params.id).eq('status', 'accepted')
    if (passengers) {
      for (const p of passengers) {
        sendNotificationToUser(p.user_id, {
          title: 'Covoiturage : En route !',
          body: `Votre conducteur pour ${ride.destination} a démarré le trajet.`,
          icon: '/icon-192.svg',
          data: { url: `/covoiturage/${req.params.id}` }
        }).catch(e => console.error(e))
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Erreur start:', err)
    res.status(500).json({ error: 'Erreur lors du démarrage' })
  }
})

// ----------------------------------------------------------------------
// POST /api/carpool/:id/finish - Finish a ride
// ----------------------------------------------------------------------
router.post('/:id/finish', jwtWithUser, async (req, res) => {
  try {
    const { data: ride } = await supabase.from('carpool_rides').select('driver_id').eq('id', req.params.id).single()
    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })

    const { error } = await supabase.from('carpool_rides').update({ status: 'completed' }).eq('id', req.params.id)
    if (error) throw error

    const io = req.app.get('io')
    if (io) io.to(`carpool_${req.params.id}`).emit('carpool:update')

    res.json({ success: true })
  } catch (err) {
    console.error('Erreur finish:', err)
    res.status(500).json({ error: 'Erreur lors de la fin' })
  }
})

// ----------------------------------------------------------------------
// POST /api/carpool/:id/request - Request a seat
// ----------------------------------------------------------------------
router.post('/:id/request', jwtWithUser, async (req, res) => {
  const { message } = req.body

  try {
    // Verify ride has seats and is active
    const { data: ride } = await supabase
      .from('carpool_rides')
      .select('seats_available, status, driver_id, origin, destination')
      .eq('id', req.params.id)
      .single()

    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })
    if (ride.status !== 'active') return res.status(400).json({ error: 'Trajet non disponible' })
    if (ride.seats_available <= 0) return res.status(400).json({ error: 'Plus de place disponible' })
    if (ride.driver_id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas réserver votre propre trajet' })

    const { data: request, error } = await supabase
      .from('carpool_passengers')
      .insert({
        ride_id: req.params.id,
        user_id: req.user.id,
        message: message || ''
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Demande déjà envoyée' })
      throw error
    }

    // --- Notifications ---
    try {
      const { data: driver } = await supabase.from('users').select('email, username').eq('id', ride.driver_id).single()
      if (driver) {
        // Send email
        await sendCarpoolEmail(driver.email, 'request', {
          passengerName: req.user.username,
          origin: ride.origin,
          destination: ride.destination,
          rideId: req.params.id,
          message: request.message
        })
        // Send Push Notification
        await sendNotificationToUser(ride.driver_id, {
          title: 'Covoiturage : Nouvelle demande',
          body: `${req.user.username} veut réserver une place.`,
          icon: '/icon-192.svg',
          data: { url: `/covoiturage/${req.params.id}` }
        })
      }
    } catch (err) {
      console.error('Erreur notification demande:', err)
    }

    const io = req.app.get('io')
    if (io) io.to(`carpool_${req.params.id}`).emit('carpool:update')

    res.status(201).json(request)
  } catch (error) {
    console.error('Erreur demande covoiturage:', error)
    res.status(500).json({ error: 'Erreur lors de la réservation' })
  }
})

// ----------------------------------------------------------------------
// PUT /api/carpool/:id/request/:reqId - Accept/Reject request (Driver only)
// ----------------------------------------------------------------------
router.put('/:id/request/:reqId', jwtWithUser, async (req, res) => {
  const { status } = req.body // 'accepted' or 'rejected'

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' })
  }

  try {
    // Ensure the current user is the driver of the ride
    const { data: ride } = await supabase
      .from('carpool_rides')
      .select('driver_id, seats_available, origin, destination')
      .eq('id', req.params.id)
      .single()

    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })

    // If accepting, check seats
    if (status === 'accepted' && ride.seats_available <= 0) {
      return res.status(400).json({ error: 'Plus de place disponible' })
    }

    // Update the request
    const { data: passenger, error } = await supabase
      .from('carpool_passengers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.reqId)
      .eq('ride_id', req.params.id)
      .select()
      .single()

    if (error) throw error

    // If accepted, decrement seats_available
    if (status === 'accepted') {
      const newSeats = ride.seats_available - 1
      const updateData = { seats_available: newSeats }
      if (newSeats === 0) updateData.status = 'full'
      
      await supabase
        .from('carpool_rides')
        .update(updateData)
        .eq('id', req.params.id)
    }

    // --- Notifications ---
    try {
      const { data: passengerUser } = await supabase.from('users').select('email').eq('id', passenger.user_id).single()
      if (passengerUser) {
        await sendCarpoolEmail(passengerUser.email, status, {
          driverName: req.user.username,
          origin: ride.origin,
          destination: ride.destination,
          rideId: req.params.id
        })
        await sendNotificationToUser(passenger.user_id, {
          title: status === 'accepted' ? 'Covoiturage accepté !' : 'Covoiturage refusé',
          body: status === 'accepted' ? `Votre place est confirmée avec ${req.user.username}.` : `Désolé, votre demande a été refusée par ${req.user.username}.`,
          icon: '/icon-192.svg',
          data: { url: `/covoiturage/${req.params.id}` }
        })
      }
    } catch (err) {
      console.error('Erreur notification réponse:', err)
    }

    const io = req.app.get('io')
    if (io) io.to(`carpool_${req.params.id}`).emit('carpool:update')

    res.json(passenger)
  } catch (error) {
    console.error('Erreur mise à jour demande covoiturage:', error)
    res.status(500).json({ error: 'Erreur lors de la mise à jour' })
  }
})

// ----------------------------------------------------------------------
// PUT /api/carpool/:id/passenger/:userId/payment - Toggle payment status
// ----------------------------------------------------------------------
router.put('/:id/passenger/:userId/payment', jwtWithUser, async (req, res) => {
  try {
    const { id: rideId, userId: passengerId } = req.params

    const { data: ride } = await supabase.from('carpool_rides').select('driver_id').eq('id', rideId).single()
    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })

    const isDriver = ride.driver_id === req.user.id
    const isPassenger = passengerId === req.user.id

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ error: 'Non autorisé' })
    }

    const { data: request } = await supabase
      .from('carpool_passengers')
      .select('id, has_paid')
      .eq('ride_id', rideId)
      .eq('user_id', passengerId)
      .single()

    if (!request) return res.status(404).json({ error: 'Passager introuvable' })

    const { data: updated, error } = await supabase
      .from('carpool_passengers')
      .update({ has_paid: !request.has_paid })
      .eq('id', request.id)
      .select()
      .single()

    if (error) throw error

    const io = req.app.get('io')
    if (io) io.to(`carpool_${rideId}`).emit('carpool:update')

    res.json({ success: true, has_paid: updated.has_paid })
  } catch (error) {
    console.error('Erreur bascule paiement:', error)
    res.status(500).json({ error: 'Erreur lors de la mise à jour du paiement' })
  }
})

// ----------------------------------------------------------------------
// POST /api/carpool/:id/scan - Scan QR Code for boarding
// ----------------------------------------------------------------------
router.post('/:id/scan', jwtWithUser, async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Passager manquant' })

    const { data: ride } = await supabase.from('carpool_rides').select('driver_id').eq('id', req.params.id).single()
    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })

    // Only driver can scan
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })

    // Update boarded status
    const { data: request } = await supabase
      .from('carpool_passengers')
      .select('id, status')
      .eq('ride_id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!request || request.status !== 'accepted') {
      return res.status(400).json({ error: 'Passager non accepté pour ce trajet' })
    }

    const { data: updated, error } = await supabase
      .from('carpool_passengers')
      .update({ boarded: true, has_paid: true })
      .eq('id', request.id)
      .select()
      .single()

    if (error) throw error

    const io = req.app.get('io')
    if (io) io.to(`carpool_${req.params.id}`).emit('carpool:update')

    res.json({ success: true, passenger: updated })
  } catch (error) {
    console.error('Erreur scan:', error)
    res.status(500).json({ error: 'Erreur lors du scan' })
  }
})

// ----------------------------------------------------------------------
// DELETE /api/carpool/:id/request/:reqId - Cancel request (Passenger or Driver)
// ----------------------------------------------------------------------
router.delete('/:id/request/:reqId', jwtWithUser, async (req, res) => {
  try {
    const { data: ride } = await supabase
      .from('carpool_rides')
      .select('driver_id, seats_available, origin, destination')
      .eq('id', req.params.id)
      .single()

    const { data: request } = await supabase
      .from('carpool_passengers')
      .select('user_id, status')
      .eq('id', req.params.reqId)
      .single()

    if (!ride || !request) return res.status(404).json({ error: 'Introuvable' })
    
    const isDriver = req.user.id === ride.driver_id;
    const isPassenger = req.user.id === request.user_id;

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ error: 'Non autorisé' })
    }

    // Delete request
    const { error } = await supabase
      .from('carpool_passengers')
      .delete()
      .eq('id', req.params.reqId)

    if (error) throw error

    // Restore seat if it was accepted
    if (request.status === 'accepted') {
      const newSeats = ride.seats_available + 1
      await supabase
        .from('carpool_rides')
        .update({ seats_available: newSeats, status: 'active' }) // no longer full
        .eq('id', req.params.id)
    }

    const io = req.app.get('io')
    if (io) io.to(`carpool_${req.params.id}`).emit('carpool:update')

    // Send email to driver if passenger cancelled
    if (isPassenger) {
      try {
        const { data: driver } = await supabase.from('users').select('email').eq('id', ride.driver_id).single()
        if (driver) {
          await sendCarpoolEmail(driver.email, 'cancelled', {
            passengerName: req.user.username,
            origin: ride.origin,
            destination: ride.destination,
            rideId: req.params.id
          })
          await sendNotificationToUser(ride.driver_id, {
            title: 'Un passager a annulé',
            body: `${req.user.username} s'est désisté(e) du trajet.`,
            icon: '/icon-192.svg',
            data: { url: `/covoiturage/${req.params.id}` }
          })
        }
      } catch (err) {
        console.error('Erreur notif annulation passager:', err)
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur annulation demande:', error)
    res.status(500).json({ error: 'Erreur lors de l\'annulation' })
  }
})

// ----------------------------------------------------------------------
// DELETE /api/carpool/:id - Cancel ride (Driver only)
// ----------------------------------------------------------------------
router.delete('/:id', jwtWithUser, async (req, res) => {
  try {
    const { data: ride } = await supabase
      .from('carpool_rides')
      .select('driver_id')
      .eq('id', req.params.id)
      .single()

    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })
    if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })

    const { error } = await supabase
      .from('carpool_rides')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (error) throw error

    const io = req.app.get('io')
    if (io) io.to(`carpool_${req.params.id}`).emit('carpool:update')

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur annulation trajet:', error)
    res.status(500).json({ error: 'Erreur lors de l\'annulation' })
  }
})

// ----------------------------------------------------------------------
// GET /api/carpool/:id/messages - Get chat messages (Driver and accepted passengers only)
// ----------------------------------------------------------------------
router.get('/:id/messages', jwtWithUser, async (req, res) => {
  try {
    // 1. Check if user is authorized (driver or accepted passenger)
    const { data: ride } = await supabase.from('carpool_rides').select('driver_id').eq('id', req.params.id).single()
    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })

    const { data: request } = await supabase.from('carpool_passengers').select('status').eq('ride_id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    
    const isDriver = ride.driver_id === req.user.id
    const isAcceptedPassenger = request && request.status === 'accepted'

    if (!isDriver && !isAcceptedPassenger) {
      return res.status(403).json({ error: 'Non autorisé à voir le chat de ce trajet' })
    }

    // 2. Fetch messages
    const { data: messages, error } = await supabase
      .from('carpool_messages')
      .select('*, user:user_id(username, avatar, google_avatar)')
      .eq('ride_id', req.params.id)
      .order('created_at', { ascending: true })

    if (error) {
      // If table doesn't exist yet, just return empty array instead of crashing
      if (error.code === '42P01') return res.json([])
      throw error
    }

    res.json(messages || [])
  } catch (error) {
    console.error('Erreur chat GET:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' })
  }
})

// ----------------------------------------------------------------------
// POST /api/carpool/:id/messages - Send a message
// ----------------------------------------------------------------------
router.post('/:id/messages', jwtWithUser, async (req, res) => {
  const { message, reply_to } = req.body
  if (!message || message.trim() === '') return res.status(400).json({ error: 'Message vide' })

  try {
    // 1. Check authorization
    const { data: ride } = await supabase.from('carpool_rides').select('driver_id').eq('id', req.params.id).single()
    if (!ride) return res.status(404).json({ error: 'Trajet introuvable' })

    const { data: passengerReq } = await supabase.from('carpool_passengers').select('status').eq('ride_id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    
    const isDriver = ride.driver_id === req.user.id
    const isAcceptedPassenger = passengerReq && passengerReq.status === 'accepted'

    if (!isDriver && !isAcceptedPassenger) {
      return res.status(403).json({ error: 'Non autorisé à envoyer des messages' })
    }

    // 2. Insert message
    const { data: insertedMsg, error } = await supabase
      .from('carpool_messages')
      .insert({
        ride_id: req.params.id,
        user_id: req.user.id,
        message: message.trim(),
        reply_to: reply_to || null
      })
      .select('*, user:user_id(username, avatar, google_avatar)')
      .single()

    if (error) throw error

    // 3. Send Push Notifications to other members
    const { data: allPassengers } = await supabase.from('carpool_passengers').select('user_id').eq('ride_id', req.params.id).eq('status', 'accepted')
    
    const userIdsToNotify = []
    if (!isDriver) userIdsToNotify.push(ride.driver_id)
    if (allPassengers) {
      for (const p of allPassengers) {
        if (p.user_id !== req.user.id) userIdsToNotify.push(p.user_id)
      }
    }

    for (const uid of userIdsToNotify) {
      sendNotificationToUser(uid, {
        title: `Nouveau message de ${req.user.username} (Covoiturage)`,
        body: message,
        icon: '/icon-192.svg',
        data: { url: `/covoiturage/${req.params.id}` }
      }).catch(err => console.error('Notif err:', err))
    }

    res.json(insertedMsg)
  } catch (error) {
    console.error('Erreur chat POST:', error)
    if (error.code === '42P01') return res.status(500).json({ error: 'La table carpool_messages n\'a pas encore été créée sur Supabase.' })
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' })
  }
})

// ----------------------------------------------------------------------
// POST /api/carpool/:id/messages/read - Mark messages as read
// ----------------------------------------------------------------------
router.post('/:id/messages/read', jwtWithUser, async (req, res) => {
  try {
    const { data: msgs } = await supabase.from('carpool_messages')
      .select('id, read_by')
      .eq('ride_id', req.params.id)
      .neq('user_id', req.user.id)
      
    if (!msgs) return res.json({ success: true })

    const unreadMsgs = msgs.filter(m => !(m.read_by || []).includes(req.user.id))
    
    for (const m of unreadMsgs) {
      await supabase.from('carpool_messages')
        .update({ read_by: [...(m.read_by || []), req.user.id] })
        .eq('id', m.id)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur chat read:', error)
    res.status(500).json({ error: 'Erreur mark as read' })
  }
})

// ----------------------------------------------------------------------
// POST /api/carpool/:id/messages/:msgId/react - Toggle reaction
// ----------------------------------------------------------------------
router.post('/:id/messages/:msgId/react', jwtWithUser, async (req, res) => {
  const { emoji } = req.body
  if (!emoji) return res.status(400).json({ error: 'Emoji manquant' })

  try {
    const { data: msg } = await supabase.from('carpool_messages').select('reactions').eq('id', req.params.msgId).single()
    if (!msg) return res.status(404).json({ error: 'Message introuvable' })

    const reactions = msg.reactions || {}
    if (!reactions[emoji]) reactions[emoji] = []
    
    const userIdx = reactions[emoji].indexOf(req.user.id)
    if (userIdx > -1) {
      reactions[emoji].splice(userIdx, 1)
      if (reactions[emoji].length === 0) delete reactions[emoji]
    } else {
      reactions[emoji].push(req.user.id)
    }
    
    await supabase.from('carpool_messages').update({ reactions }).eq('id', req.params.msgId)

    res.json({ success: true, reactions })
  } catch (error) {
    console.error('Erreur chat react:', error)
    res.status(500).json({ error: 'Erreur reaction' })
  }
})

// ----------------------------------------------------------------------
// REVIEWS
// ----------------------------------------------------------------------

// POST /api/carpool/reviews
router.post('/reviews', jwtWithUser, async (req, res) => {
  const { rideId, revieweeId, tags, rating } = req.body

  if (!rideId || !revieweeId) {
    return res.status(400).json({ error: 'Données manquantes' })
  }

  try {
    // 1. Verify that the ride is completed
    const { data: ride } = await supabase.from('carpool_rides').select('status, driver_id').eq('id', rideId).single()
    if (!ride || ride.status !== 'completed') {
      return res.status(400).json({ error: 'Le trajet doit être terminé pour laisser un avis' })
    }

    // Insert or update review
    const { error } = await supabase
      .from('carpool_reviews')
      .upsert({
        ride_id: rideId,
        reviewer_id: req.user.id,
        reviewee_id: revieweeId,
        tags: tags || [],
        rating: rating || null
      }, { onConflict: 'ride_id,reviewer_id,reviewee_id' })

    if (error) throw error
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur ajout review:', error)
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'avis' })
  }
})

// GET /api/carpool/user/:id/tags
router.get('/user/:id/tags', async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('carpool_reviews')
      .select('tags, rating, created_at, reviewer:users!reviewer_id(id, username, avatar, google_avatar)')
      .eq('reviewee_id', req.params.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('relation "carpool_reviews" does not exist')) {
        return res.json({ tagCounts: {}, averageRating: 0, reviewCount: 0 })
      }
      throw error
    }

    const tagCounts = {}
    let totalRating = 0
    let ratingCount = 0

    if (reviews) {
      reviews.forEach(r => {
        if (Array.isArray(r.tags)) {
          r.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        }
        if (r.rating) {
          totalRating += r.rating
          ratingCount += 1
        }
      })
    }

    res.json({
      tagCounts,
      averageRating: ratingCount > 0 ? (totalRating / ratingCount) : 0,
      reviewCount: ratingCount,
      reviews: reviews || []
    })
  } catch (error) {
    console.error('Erreur récupération tags:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération des tags' })
  }
})

// ----------------------------------------------------------------------
// GET /api/carpool/driver-stats/:id - Driver stats
// ----------------------------------------------------------------------
router.get('/driver-stats/:id', async (req, res) => {
  try {
    const { data: rides, error } = await supabase
      .from('carpool_rides')
      .select('id, status, departure_time')
      .eq('driver_id', req.params.id)

    if (error) {
      if (error.code === '42P01') return res.json({ totalRides: 0, reliability: 100 })
      throw error
    }

    const pastRides = rides.filter(r => new Date(r.departure_time) < new Date())
    const totalPast = pastRides.length
    const cancelledPast = pastRides.filter(r => r.status === 'cancelled').length

    let reliability = 100
    if (totalPast > 0) {
      reliability = Math.round(((totalPast - cancelledPast) / totalPast) * 100)
    }

    res.json({
      totalRides: rides.length,
      reliability
    })
  } catch (error) {
    console.error('Erreur driver stats:', error)
    res.status(500).json({ error: 'Erreur driver stats' })
  }
})

module.exports = router
