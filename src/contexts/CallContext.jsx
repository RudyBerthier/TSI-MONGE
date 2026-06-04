import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { useSocket } from './SocketContext'
import { useAuth } from './AuthContext'

const CallContext = createContext(null)

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function CallProvider({ children }) {
  const { socket } = useSocket()
  const { user } = useAuth()

  const [incomingCall, setIncomingCall] = useState(null)
  const [activeCall, setActiveCall] = useState(null)

  const localStreamRef = useRef(null)
  const peerConnectionsRef = useRef({}) // peerId → RTCPeerConnection
  const pendingCandidatesRef = useRef({}) // peerId → ICECandidate[]

  // ─── Helpers ──────────────────────────────────────────────────────────

  function stopLocalStream() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
  }

  function closeAllPCs() {
    for (const pc of Object.values(peerConnectionsRef.current)) {
      pc.close()
    }
    peerConnectionsRef.current = {}
    pendingCandidatesRef.current = {}
  }

  function createPeerConnection(peerId, callId, onRemoteStream) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peerConnectionsRef.current[peerId] = pc

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('call:signal', { callId, to: peerId, signal: { candidate } })
      }
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0]
      setActiveCall(prev => {
        if (!prev) return prev
        return {
          ...prev,
          remoteStreams: { ...(prev.remoteStreams || {}), [peerId]: stream }
        }
      })
    }

    return pc
  }

  async function flushPendingCandidates(peerId) {
    const candidates = pendingCandidatesRef.current[peerId] || []
    const pc = peerConnectionsRef.current[peerId]
    if (!pc || !pc.remoteDescription) return
    for (const c of candidates) {
      try { await pc.addIceCandidate(c) } catch (_) { }
    }
    pendingCandidatesRef.current[peerId] = []
  }

  // ─── Exposed actions ─────────────────────────────────────────────────

  const initiateCall = useCallback(async (targetId, callType, isGroup, groupMembers, groupName) => {
    if (!socket || !user) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      })
      localStreamRef.current = stream

      const callId = `${user.id}-${Date.now()}`
      setActiveCall({
        callId,
        callType,
        isGroup,
        targetId,
        groupMembers: groupMembers || [],
        groupName: groupName || '',
        status: 'calling',
        remoteStreams: {},
        muted: false,
        cameraOff: false,
      })

      socket.emit('call:invite', {
        callId,
        callType,
        toUserId: isGroup ? undefined : targetId,
        groupId: isGroup ? targetId : undefined,
        callerName: user.username,
        callerAvatar: user.avatar || user.google_avatar,
        groupName: groupName || '',
      })
    } catch (err) {
      console.error('getUserMedia error:', err)
    }
  }, [socket, user])

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !socket || !user) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'video'
      })
      localStreamRef.current = stream

      const { callId, fromUserId, callType, isGroup, groupId, groupName } = incomingCall

      setActiveCall({
        callId,
        callType,
        isGroup,
        targetId: isGroup ? groupId : fromUserId,
        groupMembers: [],
        groupName: groupName || '',
        status: 'connected',
        remoteStreams: {},
        muted: false,
        cameraOff: false,
        isReceiver: true,
        callerId: fromUserId,
      })
      setIncomingCall(null)

      socket.emit('call:accept', { callId, to: fromUserId })
    } catch (err) {
      console.error('getUserMedia error (accept):', err)
    }
  }, [incomingCall, socket, user])

  const declineCall = useCallback(() => {
    if (!incomingCall || !socket) return
    socket.emit('call:decline', { callId: incomingCall.callId, to: incomingCall.fromUserId })
    setIncomingCall(null)
  }, [incomingCall, socket])

  const endCall = useCallback((suppressEmit = false) => {
    if (!suppressEmit && socket && activeCall) {
      if (activeCall.isGroup) {
        socket.emit('call:end', { callId: activeCall.callId, groupId: activeCall.targetId })
      } else {
        const toId = activeCall.isReceiver ? activeCall.callerId : activeCall.targetId
        socket.emit('call:end', { callId: activeCall.callId, to: toId })
      }
    }
    stopLocalStream()
    closeAllPCs()
    setActiveCall(null)
  }, [socket, activeCall])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const enabled = localStreamRef.current.getAudioTracks()[0]?.enabled ?? false
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !enabled })
    setActiveCall(prev => prev ? { ...prev, muted: enabled } : prev)
  }, [])

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return
    const enabled = localStreamRef.current.getVideoTracks()[0]?.enabled ?? false
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !enabled })
    setActiveCall(prev => prev ? { ...prev, cameraOff: enabled } : prev)
  }, [])

  // ─── Socket listeners ─────────────────────────────────────────────────

  // Automatic timeout for unanswered calls
  useEffect(() => {
    let timeoutId;
    if (activeCall?.status === 'calling' && !activeCall.isReceiver) {
      timeoutId = setTimeout(() => {
        if (socket) {
          socket.emit('call:timeout', {
            callId: activeCall.callId,
            to: activeCall.targetId,
            isGroup: activeCall.isGroup,
            groupId: activeCall.targetId
          })
        }
        stopLocalStream()
        closeAllPCs()
        setActiveCall(null)
      }, 10000) // 10 seconds timeout
    }
    return () => clearTimeout(timeoutId)
  }, [activeCall?.status, activeCall?.callId, activeCall?.targetId, activeCall?.isGroup, socket])

  useEffect(() => {
    if (!socket) return

    const onInvite = (data) => {
      // Busy: already in a call
      if (activeCall) {
        socket.emit('call:busy', { callId: data.callId, to: data.fromUserId })
        return
      }
      setIncomingCall(data)
    }

    const onAccept = async ({ callId, from }) => {
      // We are the initiator — create PC, add tracks, createOffer
      const pc = createPeerConnection(from, callId)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current))
      }
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : prev)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('call:signal', { callId, to: from, signal: { sdp: pc.localDescription } })
      } catch (err) {
        console.error('createOffer error:', err)
      }
    }

    const onDecline = () => {
      setActiveCall(prev => prev?.status === 'calling' ? null : prev)
      stopLocalStream()
    }

    const onEnd = () => {
      stopLocalStream()
      closeAllPCs()
      setActiveCall(null)
    }

    const onSignal = async ({ callId, from, signal }) => {
      let pc = peerConnectionsRef.current[from]

      if (signal.sdp) {
        const desc = new RTCSessionDescription(signal.sdp)

        if (desc.type === 'offer') {
          // We are receiver — create PC if needed
          if (!pc) {
            pc = createPeerConnection(from, callId)
            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current))
            }
          }
          await pc.setRemoteDescription(desc)
          await flushPendingCandidates(from)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('call:signal', { callId, to: from, signal: { sdp: pc.localDescription } })
        } else if (desc.type === 'answer') {
          if (pc) {
            await pc.setRemoteDescription(desc)
            await flushPendingCandidates(from)
          }
        }
      } else if (signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate)
        if (pc && pc.remoteDescription) {
          try { await pc.addIceCandidate(candidate) } catch (_) { }
        } else {
          if (!pendingCandidatesRef.current[from]) pendingCandidatesRef.current[from] = []
          pendingCandidatesRef.current[from].push(candidate)
        }
      }
    }

    const onBusy = () => {
      setActiveCall(prev => prev?.status === 'calling' ? { ...prev, status: 'busy' } : prev)
      setTimeout(() => {
        setActiveCall(prev => prev?.status === 'busy' ? null : prev)
        stopLocalStream()
      }, 3000)
    }

    const onUnavailable = () => {
      setActiveCall(prev => prev ? { ...prev, status: 'unavailable' } : prev)
      setTimeout(() => {
        setActiveCall(prev => prev?.status === 'unavailable' ? null : prev)
        stopLocalStream()
      }, 2000)
    }

    const onTimeout = ({ callId }) => {
      setIncomingCall(prev => prev?.callId === callId ? null : prev)
      setActiveCall(prev => (prev?.callId === callId && prev.status === 'calling') ? null : prev)
      stopLocalStream()
    }

    socket.on('call:invite', onInvite)
    socket.on('call:accept', onAccept)
    socket.on('call:decline', onDecline)
    socket.on('call:end', onEnd)
    socket.on('call:signal', onSignal)
    socket.on('call:busy', onBusy)
    socket.on('call:unavailable', onUnavailable)
    socket.on('call:timeout', onTimeout)

    return () => {
      socket.off('call:invite', onInvite)
      socket.off('call:accept', onAccept)
      socket.off('call:decline', onDecline)
      socket.off('call:end', onEnd)
      socket.off('call:signal', onSignal)
      socket.off('call:busy', onBusy)
      socket.off('call:unavailable', onUnavailable)
      socket.off('call:timeout', onTimeout)
    }
  }, [socket, activeCall]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CallContext.Provider value={{
      incomingCall,
      activeCall,
      localStreamRef,
      initiateCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleCamera,
    }}>
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used inside CallProvider')
  return ctx
}
