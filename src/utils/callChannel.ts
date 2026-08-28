// Real-Time WebRTC PeerJS & BroadcastChannel Cloud Signaling Manager
import Peer, { MediaConnection, DataConnection } from 'peerjs';
import { Contact, CallLogItem } from '../types';
import { notificationService } from './notificationService';

export interface SignalingMessage {
  type: 'CALL_INVITE' | 'CALL_ACCEPT' | 'CALL_REJECT' | 'CALL_END' | 'CALL_DRAW' | 'CALL_REACTION' | 'VOICE_MSG';
  senderEmail: string;
  senderName: string;
  senderAvatar: string;
  targetEmail: string;
  callType: 'voice';
  payload?: any;
}

// Convert an email or identifier to a safe PeerJS peer ID
export const emailToPeerId = (email: string): string => {
  return 'snacka_' + email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
};

class RealtimeCallService {
  private peer: Peer | null = null;
  private currentPeerId: string = '';
  private currentEmail: string = '';
  private currentUserName: string = '';
  private activeMediaConnections: Map<string, MediaConnection> = new Map();
  private activeDataConnections: Map<string, DataConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnecting: boolean = false;
  private retryTimeout: any = null;

  private onMessageCallbacks: ((msg: SignalingMessage) => void)[] = [];
  private onRemoteStreamCallbacks: ((stream: MediaStream, peerId: string) => void)[] = [];
  private onCallStateChangeCallbacks: ((state: 'connected' | 'ended' | 'ringing') => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('kompisring_signaling_v2');
        this.broadcastChannel.onmessage = (event) => {
          const msg: SignalingMessage = event.data;
          this.dispatchMessage(msg);
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }

      // Clean up peer on page unload so ID is freed immediately on the server
      window.addEventListener('beforeunload', () => {
        this.destroyCurrentPeer();
      });
      window.addEventListener('pagehide', () => {
        this.destroyCurrentPeer();
      });
    }
  }

  private destroyCurrentPeer() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.peer) {
      try {
        this.peer.disconnect();
        this.peer.destroy();
      } catch (e) {
        // ignore
      }
      this.peer = null;
    }
  }

  // Initialize or update peer connection for current user's email
  public initialize(userEmail: string, userName: string) {
    if (!userEmail) return;
    const cleanEmail = userEmail.trim().toLowerCase();
    const targetPeerId = emailToPeerId(cleanEmail);

    // If already connected with the same ID, keep it
    if (
      this.peer &&
      this.currentEmail === cleanEmail &&
      !this.peer.destroyed &&
      !this.peer.disconnected
    ) {
      return;
    }

    if (this.isConnecting && this.currentEmail === cleanEmail) {
      return;
    }

    this.currentEmail = cleanEmail;
    this.currentUserName = userName;
    this.createPeerInstance(targetPeerId, false);
  }

  private createPeerInstance(peerIdToUse: string, isFallback: boolean = false) {
    this.destroyCurrentPeer();
    this.isConnecting = true;
    this.currentPeerId = peerIdToUse;

    try {
      // Connect to PeerJS Cloud server with Google STUN
      const newPeer = new Peer(peerIdToUse, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' },
          ],
        },
      });

      this.peer = newPeer;

      newPeer.on('open', (id) => {
        this.isConnecting = false;
        console.log(`[Snacka WebRTC] Connected to Cloud signaling as: ${id}`);
      });

      newPeer.on('error', (err: any) => {
        this.isConnecting = false;
        const errType = err?.type || '';

        // If ID is currently held by an unexpired session (e.g. page refresh / multiple tabs)
        if (errType === 'unavailable-id') {
          console.warn(
            `[Snacka WebRTC] ID ${peerIdToUse} is temporarily occupied. Trying fallback session ID...`
          );

          this.destroyCurrentPeer();

          if (!isFallback) {
            // Attempt with randomized session suffix so the peer is immediately reachable
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            const fallbackId = `${peerIdToUse}_${randomSuffix}`;
            this.retryTimeout = setTimeout(() => {
              this.createPeerInstance(fallbackId, true);
            }, 500);
          } else {
            // If fallback also failed, wait 4s and retry base ID
            this.retryTimeout = setTimeout(() => {
              if (this.currentEmail) {
                this.createPeerInstance(emailToPeerId(this.currentEmail), false);
              }
            }, 4000);
          }
          return;
        }

        // For other peer errors, log quietly without crashing
        console.warn('[Snacka WebRTC] Non-fatal peer notice:', errType || err?.message || err);
      });

      // Handle Incoming Data Connection (for instant rings, drawing, reactions)
      newPeer.on('connection', (conn) => {
        this.setupDataConnection(conn);
      });

      // Handle Incoming WebRTC Audio Call
      newPeer.on('call', async (incomingMediaCall) => {
        console.log('[Snacka WebRTC] Incoming media stream call from:', incomingMediaCall.peer);
        const metadata = incomingMediaCall.metadata || {};

        // Dispatch call invite to UI
        const inviteMsg: SignalingMessage = {
          type: 'CALL_INVITE',
          senderEmail: metadata.senderEmail || 'unknown@kompis.se',
          senderName: metadata.senderName || 'Någon',
          senderAvatar: metadata.senderAvatar || '📞',
          targetEmail: this.currentEmail,
          callType: 'voice',
          payload: { mediaCallPeer: incomingMediaCall.peer },
        };
        this.dispatchMessage(inviteMsg);

        // Store media connection so we can answer upon user accept
        this.activeMediaConnections.set(incomingMediaCall.peer, incomingMediaCall);

        incomingMediaCall.on('close', () => {
          this.activeMediaConnections.delete(incomingMediaCall.peer);
          this.remoteStreams.delete(incomingMediaCall.peer);
          this.stopAudioPlayback();
          this.dispatchMessage({
            type: 'CALL_END',
            senderEmail: metadata.senderEmail || '',
            senderName: metadata.senderName || '',
            senderAvatar: '',
            targetEmail: this.currentEmail,
            callType: 'voice',
          });
        });

        incomingMediaCall.on('error', (e) => {
          console.warn('[Snacka WebRTC] Incoming media call error:', e);
        });
      });
    } catch (e) {
      this.isConnecting = false;
      console.warn('[Snacka WebRTC] Peer creation notice:', e);
    }
  }

  // Set up data channel listeners
  private setupDataConnection(conn: DataConnection) {
    this.activeDataConnections.set(conn.peer, conn);

    conn.on('data', (data: any) => {
      if (data && data.type) {
        this.dispatchMessage(data as SignalingMessage);
      }
    });

    conn.on('close', () => {
      this.activeDataConnections.delete(conn.peer);
    });

    conn.on('error', (err) => {
      console.warn('[Snacka WebRTC] Data connection notice:', err);
    });
  }

  // Answer an incoming media call with local audio stream
  public async answerCall(callerEmail: string, stream?: MediaStream): Promise<MediaStream | null> {
    const callerPeerId = emailToPeerId(callerEmail);
    const mediaCall =
      this.activeMediaConnections.get(callerPeerId) ||
      Array.from(this.activeMediaConnections.values())[0];

    const audioStream = stream || (await this.getLocalAudioStream());
    if (audioStream) {
      this.localStream = audioStream;
    }

    if (mediaCall) {
      try {
        mediaCall.answer(audioStream || undefined);

        mediaCall.on('stream', (remoteStream) => {
          console.log('[Snacka WebRTC] Received remote audio stream!');
          this.remoteStreams.set(mediaCall.peer, remoteStream);
          this.playRemoteAudio(remoteStream);
          this.onRemoteStreamCallbacks.forEach((cb) => cb(remoteStream, mediaCall.peer));
        });

        mediaCall.on('close', () => {
          this.activeMediaConnections.delete(mediaCall.peer);
          this.remoteStreams.delete(mediaCall.peer);
          this.stopAudioPlayback();
          this.dispatchMessage({
            type: 'CALL_END',
            senderEmail: callerEmail,
            senderName: '',
            senderAvatar: '',
            targetEmail: this.currentEmail,
            callType: 'voice',
          });
        });
      } catch (err) {
        console.warn('Error during mediaCall.answer:', err);
      }
    }

    // Send accept notification via data connection & broadcast
    this.sendMessage({
      type: 'CALL_ACCEPT',
      senderEmail: this.currentEmail,
      senderName: this.currentUserName,
      senderAvatar: '',
      targetEmail: callerEmail,
      callType: 'voice',
    });

    return audioStream;
  }

  // Start outgoing call to target email
  public async startCall(
    targetEmail: string,
    senderName: string,
    senderAvatar: string
  ): Promise<{ mediaCall: MediaConnection | null; audioStream: MediaStream | null }> {
    const targetPeerId = emailToPeerId(targetEmail);
    const audioStream = await this.getLocalAudioStream();
    if (audioStream) {
      this.localStream = audioStream;
    }

    const messagePayload: SignalingMessage = {
      type: 'CALL_INVITE',
      senderEmail: this.currentEmail,
      senderName,
      senderAvatar,
      targetEmail,
      callType: 'voice',
    };

    // 1. Broadcast locally (for same-browser or local testing)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(messagePayload);
      } catch (e) {}
    }

    // 2. Trigger high-priority Web Push Notification via server so sleeping / standby phones ring
    notificationService.triggerWebPushCallAlert(
      targetEmail,
      this.currentEmail,
      senderName,
      senderAvatar
    );

    // 3. Send over WebRTC Data Channel to target device
    if (this.peer && !this.peer.destroyed && !this.peer.disconnected) {
      try {
        const dataConn = this.peer.connect(targetPeerId, {
          metadata: { senderEmail: this.currentEmail, senderName },
        });

        dataConn.on('open', () => {
          dataConn.send(messagePayload);
          this.activeDataConnections.set(targetPeerId, dataConn);
        });

        dataConn.on('data', (data: any) => {
          if (data && data.type) {
            this.dispatchMessage(data as SignalingMessage);
          }
        });

        dataConn.on('error', () => {
          // Quietly ignore if target peer is currently on sub-session or local
        });
      } catch (err) {
        console.warn('[Snacka WebRTC] Data channel notice:', err);
      }

      // 3. Initiate Media Audio Stream Call to target device
      if (audioStream) {
        try {
          const mediaCall = this.peer.call(targetPeerId, audioStream, {
            metadata: {
              senderEmail: this.currentEmail,
              senderName,
              senderAvatar,
            },
          });

          if (mediaCall) {
            this.activeMediaConnections.set(targetPeerId, mediaCall);

            mediaCall.on('stream', (remoteStream) => {
              console.log('[Snacka WebRTC] Remote stream received from target:', targetPeerId);
              this.remoteStreams.set(targetPeerId, remoteStream);
              this.playRemoteAudio(remoteStream);
              this.onRemoteStreamCallbacks.forEach((cb) => cb(remoteStream, targetPeerId));

              // Dispatch connected message immediately so calling phone stops ringing and connects UI
              this.dispatchMessage({
                type: 'CALL_ACCEPT',
                senderEmail: targetEmail,
                senderName: '',
                senderAvatar: '',
                targetEmail: this.currentEmail,
                callType: 'voice',
              });
            });

            mediaCall.on('close', () => {
              this.activeMediaConnections.delete(targetPeerId);
              this.remoteStreams.delete(targetPeerId);
              this.stopAudioPlayback();
              this.dispatchMessage({
                type: 'CALL_END',
                senderEmail: targetEmail,
                senderName: '',
                senderAvatar: '',
                targetEmail: this.currentEmail,
                callType: 'voice',
              });
            });

            mediaCall.on('error', (e) => {
              console.warn('[Snacka WebRTC] Media call notice:', e);
            });

            return { mediaCall, audioStream };
          }
        } catch (err) {
          console.warn('[Snacka WebRTC] Media call notice:', err);
        }
      }
    }

    return { mediaCall: null, audioStream };
  }

  // Stop remote audio element
  public stopAudioPlayback() {
    try {
      const audioEl = document.getElementById('remote-webrtc-audio') as HTMLAudioElement;
      if (audioEl) {
        audioEl.srcObject = null;
        audioEl.pause();
      }
    } catch (e) {}
  }

  // Reject incoming call and notify caller device immediately
  public rejectCall(callerEmail?: string) {
    const rejectMsg: SignalingMessage = {
      type: 'CALL_REJECT',
      senderEmail: this.currentEmail,
      senderName: this.currentUserName,
      senderAvatar: '',
      targetEmail: callerEmail || '',
      callType: 'voice',
    };

    // Broadcast locally (for same browser / tabs)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(rejectMsg);
      } catch (e) {}
    }

    // Cancel any active push notification on the target device
    if (callerEmail) {
      notificationService.cancelWebPushCallAlert(callerEmail);
    }

    if (callerEmail) {
      const targetPeerId = emailToPeerId(callerEmail);

      // Send rejection on active data connection
      const dataConn = this.activeDataConnections.get(targetPeerId);
      if (dataConn) {
        try {
          if (dataConn.open) {
            dataConn.send(rejectMsg);
          }
          dataConn.close();
        } catch (e) {}
        this.activeDataConnections.delete(targetPeerId);
      } else if (this.peer && !this.peer.destroyed && !this.peer.disconnected) {
        try {
          const newConn = this.peer.connect(targetPeerId, { reliable: true });
          newConn.on('open', () => {
            try {
              newConn.send(rejectMsg);
              setTimeout(() => {
                try {
                  newConn.close();
                } catch (e) {}
              }, 400);
            } catch (e) {}
          });
        } catch (e) {}
      }

      // Close incoming media call so caller's PeerJS mediaCall.on('close') triggers
      const mediaCall = this.activeMediaConnections.get(targetPeerId);
      if (mediaCall) {
        try {
          mediaCall.close();
        } catch (e) {}
        this.activeMediaConnections.delete(targetPeerId);
      }
    } else {
      this.activeDataConnections.forEach((conn) => {
        try {
          if (conn.open) {
            conn.send(rejectMsg);
          }
          conn.close();
        } catch (e) {}
      });
      this.activeDataConnections.clear();

      this.activeMediaConnections.forEach((conn) => {
        try {
          conn.close();
        } catch (e) {}
      });
      this.activeMediaConnections.clear();
    }

    // Stop local mic and remote audio
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      this.localStream = null;
    }
    this.remoteStreams.clear();
    this.stopAudioPlayback();
  }

  // End all active calls and release media
  public endCall(targetEmail?: string) {
    const endMsg: SignalingMessage = {
      type: 'CALL_END',
      senderEmail: this.currentEmail,
      senderName: this.currentUserName,
      senderAvatar: '',
      targetEmail: targetEmail || '',
      callType: 'voice',
    };

    // Broadcast locally
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(endMsg);
      } catch (e) {}
    }

    if (targetEmail) {
      notificationService.cancelWebPushCallAlert(targetEmail);
      const targetPeerId = emailToPeerId(targetEmail);
      const dataConn = this.activeDataConnections.get(targetPeerId);
      if (dataConn) {
        try {
          if (dataConn.open) {
            dataConn.send(endMsg);
          }
          dataConn.close();
        } catch (e) {}
        this.activeDataConnections.delete(targetPeerId);
      }

      const mediaCall = this.activeMediaConnections.get(targetPeerId);
      if (mediaCall) {
        try {
          mediaCall.close();
        } catch (e) {}
        this.activeMediaConnections.delete(targetPeerId);
      }
    } else {
      // Close all connections
      this.activeDataConnections.forEach((conn) => {
        try {
          if (conn.open) {
            conn.send(endMsg);
          }
          conn.close();
        } catch (e) {}
      });
      this.activeDataConnections.clear();

      this.activeMediaConnections.forEach((conn) => {
        try {
          conn.close();
        } catch (e) {}
      });
      this.activeMediaConnections.clear();
    }

    // Stop local microphone tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.localStream = null;
    }
    this.remoteStreams.clear();
    this.stopAudioPlayback();
  }

  // Send generic message (voice msg, draw, reactions, etc.)
  public sendMessage(msg: SignalingMessage) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (e) {}
    }

    if (!msg.targetEmail) return;

    const targetPeerId = emailToPeerId(msg.targetEmail);
    const dataConn = this.activeDataConnections.get(targetPeerId);
    if (dataConn && dataConn.open) {
      try {
        dataConn.send(msg);
      } catch (e) {
        console.warn('Error sending message on active connection:', e);
      }
    } else if (this.peer && !this.peer.destroyed && !this.peer.disconnected) {
      try {
        const newConn = this.peer.connect(targetPeerId, { reliable: true });
        newConn.on('open', () => {
          try {
            newConn.send(msg);
          } catch (e) {}
          this.setupDataConnection(newConn);
        });
        newConn.on('error', (err) => {
          console.warn('[Snacka WebRTC] Target data connect error:', err);
        });
      } catch (e) {
        console.warn('Error connecting to target peer for message:', e);
      }
    }
  }

  // Helper to play remote WebRTC audio stream in background
  private playRemoteAudio(stream: MediaStream) {
    try {
      let audioEl = document.getElementById('remote-webrtc-audio') as HTMLAudioElement;
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = 'remote-webrtc-audio';
        audioEl.autoplay = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
      }
      audioEl.srcObject = stream;
      audioEl.play().catch((e) => console.log('Audio autoplay prevented, click to unmute:', e));
    } catch (e) {
      console.warn('Error attaching remote audio:', e);
    }
  }

  // Get local user microphone
  public async getLocalAudioStream(): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported in this browser');
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      return stream;
    } catch (err) {
      console.warn('Could not access microphone directly (may be simulated):', err);
      return null;
    }
  }

  // Subscribe to remote stream connections
  public onRemoteStream(callback: (stream: MediaStream, peerId: string) => void) {
    this.onRemoteStreamCallbacks.push(callback);
    return () => {
      this.onRemoteStreamCallbacks = this.onRemoteStreamCallbacks.filter((cb) => cb !== callback);
    };
  }

  // Subscribe to all incoming signaling messages
  public subscribe(callback: (msg: SignalingMessage) => void) {
    this.onMessageCallbacks.push(callback);
    return () => {
      this.onMessageCallbacks = this.onMessageCallbacks.filter((cb) => cb !== callback);
    };
  }

  private dispatchMessage(msg: SignalingMessage) {
    this.onMessageCallbacks.forEach((cb) => {
      try {
        cb(msg);
      } catch (err) {
        console.error('Error in message callback:', err);
      }
    });
  }
}

export const callChannel = new RealtimeCallService();

// Clean initial contacts and call logs (only real contacts added by parent)
export const INITIAL_CONTACTS: Contact[] = [];

export const INITIAL_CALL_LOGS: CallLogItem[] = [];

