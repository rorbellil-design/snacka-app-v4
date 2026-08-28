/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Contact, ParentSettings, CallLogItem, VoiceMessage, ActiveCallState } from './types';
import { INITIAL_CONTACTS, INITIAL_CALL_LOGS, callChannel, SignalingMessage } from './utils/callChannel';
import { sounds } from './utils/audioEffects';
import { notificationService } from './utils/notificationService';
import { KidModeView } from './components/KidModeView';
import { ParentDashboard } from './components/ParentDashboard';
import { ParentPinModal } from './components/ParentPinModal';
import { ActiveCallScreen } from './components/ActiveCallScreen';
import { IncomingCallModal } from './components/IncomingCallModal';
import { OnboardingModal } from './components/OnboardingModal';

const DEFAULT_SETTINGS: ParentSettings = {
  pin: '123456',
  childName: '',
  childEmail: '',
  childAvatar: '🧒',
  childColor: 'amber',
  bedtimeLockEnabled: false,
  bedtimeStart: '20:00',
  bedtimeEnd: '07:00',
  onlyAllowApprovedContacts: true,
  maxCallDurationMinutes: 30,
  ringtone: 'playful',
  soundVolume: 80,
  theme: 'system',
};

export default function App() {
  // Persistent State - Keep all user contacts securely
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('kompisring_contacts');
      if (saved) {
        const parsed: Contact[] = JSON.parse(saved);
        // Only filter out old internal demo bot placeholders if explicitly marked
        const realContacts = parsed.filter(
          (c) => !c.isDemoBot && !['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)
        );
        return realContacts;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<ParentSettings>(() => {
    try {
      const saved = localStorage.getItem('kompisring_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [callLogs, setCallLogs] = useState<CallLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('kompisring_logs');
      if (saved) {
        const parsed: CallLogItem[] = JSON.parse(saved);
        return parsed.filter(
          (l) =>
            !['l1', 'l2'].includes(l.id) &&
            !l.contactEmail?.endsWith('@familjen.se') &&
            !l.contactEmail?.endsWith('@skolan.se')
        );
      }
      return [];
    } catch {
      return [];
    }
  });

  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>(() => {
    try {
      const saved = localStorage.getItem('kompisring_voicemsgs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Navigation & Mode
  const [isParentMode, setIsParentMode] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      const hasOnboarded = localStorage.getItem('kompisring_onboarded_v1');
      return !hasOnboarded;
    } catch {
      return false;
    }
  });

  // Active & Incoming Calls
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ contact: Contact; callType: 'voice' } | null>(null);
  const [delayedCallCountdown, setDelayedCallCountdown] = useState<number | null>(null);
  const delayedCallTimerRef = useRef<number | null>(null);

  // Timer Ref for call duration
  const callTimerRef = useRef<number | null>(null);
  const outgoingRingStopRef = useRef<(() => void) | null>(null);

  // Save to LocalStorage & Server Sync
  useEffect(() => {
    localStorage.setItem('kompisring_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('kompisring_settings', JSON.stringify(settings));
    if (settings.parentEmail || settings.childEmail) {
      // Sync in background to cloud server
      fetch('/api/family/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: settings.parentEmail || settings.childEmail || '',
          settings,
          contacts,
          callLogs,
        }),
      }).catch(() => {});
    }
  }, [settings, contacts, callLogs]);

  useEffect(() => {
    localStorage.setItem('kompisring_logs', JSON.stringify(callLogs));
  }, [callLogs]);

  useEffect(() => {
    localStorage.setItem('kompisring_voicemsgs', JSON.stringify(voiceMessages));
  }, [voiceMessages]);

  // Initialize Real-time WebRTC PeerJS cloud service and register Web Push for this device
  useEffect(() => {
    if (settings.childEmail) {
      callChannel.initialize(settings.childEmail, settings.childName);
      notificationService.registerPushSubscription(settings.childEmail).catch(() => {});
    }
  }, [settings.childEmail, settings.childName]);

  // Listen for Service Worker Notification click actions (e.g. answering from Lock Screen / Background)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CALL_ACTION') {
        const { action, callerEmail, callerName } = event.data;
        if (!callerEmail) return;

        const matched = contacts.find((c) => c.email.toLowerCase() === callerEmail.toLowerCase()) || {
          id: 'c_push_' + Date.now(),
          name: callerName || 'Kompis',
          email: callerEmail,
          avatar: '📞',
          color: 'from-emerald-400 to-teal-600',
          relation: 'Annan' as const,
          allowedCallType: 'voice_only' as const,
          isFavorite: false,
          isQuickDial: false,
          status: 'online' as const,
        };

        if (action === 'answer') {
          // Immediately show and answer incoming call
          setIncomingCall({ contact: matched, callType: 'voice' });
          setTimeout(() => {
            handleAcceptIncomingCall();
          }, 300);
        } else if (action === 'reject') {
          handleRejectIncomingCall();
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [contacts]);

  // System/Manual Dark Mode Theme Management
  useEffect(() => {
    const currentTheme = settings.theme || 'system';
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (currentTheme === 'dark') {
      applyTheme(true);
    } else if (currentTheme === 'light') {
      applyTheme(false);
    } else {
      // Follow System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  // Check URL parameters (e.g. ?incoming_caller=... or ?callTo=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingCaller = params.get('incoming_caller') || params.get('callFrom');
    const autoAnswer = params.get('autoAnswer') === 'true';

    if (incomingCaller) {
      const matchingContact = contacts.find(
        (c) => c.email.toLowerCase() === incomingCaller.toLowerCase()
      ) || {
        id: 'c_url_' + Date.now(),
        name: 'Kompis',
        email: incomingCaller,
        avatar: '📞',
        color: 'from-emerald-400 to-teal-600',
        relation: 'Annan' as const,
        allowedCallType: 'voice_only' as const,
        isFavorite: false,
        isQuickDial: false,
        status: 'online' as const,
      };

      setIncomingCall({ contact: matchingContact, callType: 'voice' });
      if (autoAnswer) {
        setTimeout(() => {
          handleAcceptIncomingCall();
        }, 400);
      }
    } else {
      const target = params.get('callTo');
      if (target && target.toLowerCase() === settings.childEmail.toLowerCase()) {
        const matchingContact = contacts[0] || INITIAL_CONTACTS[0];
        setIncomingCall({ contact: matchingContact, callType: 'voice' });
      }
    }
  }, [contacts, settings.childEmail]);

  // Central handler to mark active call as connected and stop ringtone
  const transitionToConnected = () => {
    if (outgoingRingStopRef.current) {
      try {
        outgoingRingStopRef.current();
      } catch (e) {}
      outgoingRingStopRef.current = null;
    }
    sounds.playConnectTone();
    setActiveCall((prev) => {
      if (!prev) return null;
      if (prev.status === 'connected') return prev;
      return {
        ...prev,
        status: 'connected',
        startedAt: Date.now(),
        participants: prev.participants.map((p) => ({ ...p, status: 'connected' })),
      };
    });
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = window.setInterval(() => {
      setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
    }, 1000);
  };

  // Listen to cross-tab & WebRTC Cloud signaling
  useEffect(() => {
    const unsubStream = callChannel.onRemoteStream(() => {
      // Whenever remote audio stream connects, transition active outgoing call to connected immediately
      transitionToConnected();
    });

    const unsubscribe = callChannel.subscribe((msg: SignalingMessage) => {
      const isForMe = !msg.targetEmail || msg.targetEmail.toLowerCase() === settings.childEmail.toLowerCase();
      if (isForMe) {
        if (msg.type === 'CALL_INVITE') {
          // Check if sender is in whitelist
          const senderContact = contacts.find((c) => c.email.toLowerCase() === msg.senderEmail.toLowerCase()) || {
            id: 'c_unknown_' + Date.now(),
            name: msg.senderName,
            email: msg.senderEmail,
            avatar: msg.senderAvatar || '👤',
            color: 'from-blue-400 to-indigo-600',
            relation: 'Annan' as const,
            allowedCallType: 'voice_only' as const,
            isFavorite: false,
            isQuickDial: false,
            status: 'online' as const,
          };

          if (settings.onlyAllowApprovedContacts && !contacts.some((c) => c.email.toLowerCase() === msg.senderEmail.toLowerCase())) {
            // Block unapproved caller and log
            const blockedLog: CallLogItem = {
              id: 'l_' + Date.now(),
              contactId: senderContact.id,
              contactName: senderContact.name,
              contactEmail: senderContact.email,
              contactAvatar: senderContact.avatar,
              type: 'voice',
              direction: 'blocked',
              timestamp: Date.now(),
              durationSeconds: 0,
            };
            setCallLogs((prev) => [blockedLog, ...prev]);
            return;
          }

          setIncomingCall({ contact: senderContact, callType: 'voice' });
        } else if (msg.type === 'CALL_ACCEPT') {
          // Other party answered the live call!
          transitionToConnected();
        } else if (msg.type === 'CALL_REJECT') {
          // Other party pressed red phone to decline the incoming call
          handleCallRejected(msg.senderName);
        } else if (msg.type === 'CALL_END') {
          handleEndCall();
        } else if (msg.type === 'VOICE_MSG') {
          const vmPayload = msg.payload;
          if (vmPayload) {
            const senderContact = contacts.find((c) => c.email.toLowerCase() === msg.senderEmail.toLowerCase());
            const receivedMsg: VoiceMessage = {
              id: vmPayload.id || ('vm_' + Date.now()),
              contactId: senderContact ? senderContact.id : ('c_unknown_' + Date.now()),
              contactName: msg.senderName || senderContact?.name || 'Kompis',
              senderEmail: msg.senderEmail,
              senderName: msg.senderName,
              senderAvatar: msg.senderAvatar || senderContact?.avatar || '🎙️',
              sender: 'contact',
              timestamp: vmPayload.timestamp || Date.now(),
              durationSeconds: vmPayload.durationSeconds || 5,
              audioBlobUrl: vmPayload.audioBase64 || vmPayload.audioBlobUrl,
              audioBase64: vmPayload.audioBase64,
              listened: false,
            };

            setVoiceMessages((prev) => [receivedMsg, ...prev.filter((m) => m.id !== receivedMsg.id)]);
            try {
              sounds.playReactionSound('magic');
            } catch (e) {}
            notificationService.showVoiceMessageNotification(
              msg.senderName || 'En kompis',
              vmPayload.durationSeconds || 5
            );
          }
        }
      }
    });

    return () => {
      unsubStream();
      unsubscribe();
    };
  }, [contacts, settings.childEmail, settings.onlyAllowApprovedContacts]);

  // Trigger System Push Notification & Vibration when incoming call arrives
  useEffect(() => {
    if (incomingCall) {
      const ringtone = incomingCall.contact.ringtone || settings.ringtone || 'marimba';
      notificationService.showIncomingCall(
        incomingCall.contact,
        ringtone,
        () => {
          handleAcceptIncomingCall();
        }
      );
    } else {
      notificationService.closeActiveNotification();
    }
  }, [incomingCall]);

  // Check bedtime
  const checkIsBedtime = () => {
    if (!settings.bedtimeLockEnabled) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.bedtimeStart.split(':').map(Number);
    const [endH, endM] = settings.bedtimeEnd.split(':').map(Number);

    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins > endMins) {
      // Overnight (e.g. 20:00 to 07:00)
      return currentMins >= startMins || currentMins < endMins;
    } else {
      return currentMins >= startMins && currentMins < endMins;
    }
  };

  const isBedtime = checkIsBedtime();

  // Start Outgoing Voice Call (Single)
  const handleStartCall = async (contact: Contact, type: 'voice' = 'voice') => {
    if (isBedtime && settings.bedtimeLockEnabled) {
      alert('Det är sovdags! Samtal kan inte startas just nu enligt föräldrainställningarna.');
      return;
    }

    // Play ringing tone
    const ringtone = contact.ringtone || settings.ringtone || 'marimba';
    outgoingRingStopRef.current = sounds.playRingtone(ringtone, settings.soundVolume || 0.8);

    const newCall: ActiveCallState = {
      sessionId: 'call_' + Date.now(),
      contact,
      participants: [{ contact, status: 'calling' }],
      isGroupCall: false,
      type: 'voice',
      status: 'calling',
      duration: 0,
      isMuted: false,
      isSpeakerOn: true,
      isDrawingOpen: false,
    };
    setActiveCall(newCall);

    // Send real-time WebRTC PeerJS & broadcast call invite
    try {
      await callChannel.startCall(contact.email, settings.childName, settings.childAvatar);
    } catch (e) {
      console.warn('Error initiating WebRTC startCall:', e);
    }
  };

  // Start Direct Group Call (Multiple participants at once)
  const handleStartGroupCall = (selectedContacts: Contact[]) => {
    if (selectedContacts.length === 0) return;
    if (isBedtime && settings.bedtimeLockEnabled) {
      alert('Det är sovdags! Samtal kan inte startas just nu enligt föräldrainställningarna.');
      return;
    }

    // Play ringing tone
    const primary = selectedContacts[0];
    const ringtone = primary?.ringtone || settings.ringtone || 'marimba';
    outgoingRingStopRef.current = sounds.playRingtone(ringtone, settings.soundVolume || 0.8);

    const participants = selectedContacts.map((c) => ({
      contact: c,
      status: 'calling' as const,
    }));

    const newCall: ActiveCallState = {
      sessionId: 'call_' + Date.now(),
      contact: primary,
      participants,
      isGroupCall: selectedContacts.length > 1,
      type: 'voice',
      status: 'calling',
      duration: 0,
      isMuted: false,
      isSpeakerOn: true,
      isDrawingOpen: false,
    };
    setActiveCall(newCall);

    // Send invite to each contact
    selectedContacts.forEach((c) => {
      callChannel.sendMessage({
        type: 'CALL_INVITE',
        senderEmail: settings.childEmail,
        senderName: settings.childName,
        senderAvatar: settings.childAvatar,
        targetEmail: c.email,
        callType: 'voice',
      });
    });

    // Auto-pickup for group call
    setTimeout(() => {
      if (outgoingRingStopRef.current) {
        outgoingRingStopRef.current();
        outgoingRingStopRef.current = null;
      }
      sounds.playConnectTone();
      setActiveCall((prev) =>
        prev
          ? {
              ...prev,
              status: 'connected',
              startedAt: Date.now(),
              participants: prev.participants.map((p) => ({ ...p, status: 'connected' })),
            }
          : null
      );

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = window.setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
    }, 2200);
  };

  // Add person to already ongoing call
  const handleAddParticipantToCall = (newContact: Contact) => {
    if (!activeCall) return;

    // Check if already in participants
    if (activeCall.participants.some((p) => p.contact.id === newContact.id)) return;

    sounds.playReactionSound('boing');

    // Add to participants with calling status
    setActiveCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isGroupCall: true,
        participants: [...prev.participants, { contact: newContact, status: 'calling' }],
      };
    });

    // Send invite
    callChannel.sendMessage({
      type: 'CALL_INVITE',
      senderEmail: settings.childEmail,
      senderName: settings.childName,
      senderAvatar: settings.childAvatar,
      targetEmail: newContact.email,
      callType: 'voice',
    });

    // Simulate join pickup after 1.8s
    setTimeout(() => {
      sounds.playReactionSound('magic');
      sounds.speakSwedish(`${newContact.name} anslöt till samtalet!`);
      setActiveCall((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.contact.id === newContact.id ? { ...p, status: 'connected' } : p
          ),
        };
      });
    }, 1800);
  };

  // Remove individual participant from active call
  const handleRemoveParticipant = (contactId: string) => {
    if (!activeCall) return;
    setActiveCall((prev) => {
      if (!prev) return null;
      const updated = prev.participants.filter((p) => p.contact.id !== contactId);
      if (updated.length === 0) {
        handleEndCall();
        return null;
      }
      return {
        ...prev,
        isGroupCall: updated.length > 1,
        participants: updated,
      };
    });
  };

  // Accept Incoming Call
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;

    sounds.playConnectTone();
    const newCall: ActiveCallState = {
      sessionId: 'call_' + Date.now(),
      contact: incomingCall.contact,
      participants: [{ contact: incomingCall.contact, status: 'connected' }],
      isGroupCall: false,
      type: 'voice',
      status: 'connected',
      startedAt: Date.now(),
      duration: 0,
      isMuted: false,
      isSpeakerOn: true,
      isDrawingOpen: false,
    };
    setActiveCall(newCall);

    // Answer via WebRTC PeerJS to establish two-way audio
    try {
      await callChannel.answerCall(incomingCall.contact.email);
    } catch (e) {
      console.warn('Error answering WebRTC call:', e);
    }

    setIncomingCall(null);

    // Start duration ticker
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = window.setInterval(() => {
      setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
    }, 1000);
  };

  // Reject Incoming Call
  const handleRejectIncomingCall = () => {
    if (incomingCall) {
      const log: CallLogItem = {
        id: 'l_' + Date.now(),
        contactId: incomingCall.contact.id,
        contactName: incomingCall.contact.name,
        contactEmail: incomingCall.contact.email,
        contactAvatar: incomingCall.contact.avatar,
        type: 'voice',
        direction: 'missed',
        timestamp: Date.now(),
        durationSeconds: 0,
      };
      setCallLogs((prev) => [log, ...prev]);

      // Inform calling device over WebRTC and cloud signaling that the call was rejected
      try {
        callChannel.rejectCall(incomingCall.contact.email);
      } catch (e) {
        console.warn('Error sending call rejection:', e);
      }

      sounds.playHangupTone();
      setIncomingCall(null);
      notificationService.closeActiveNotification();
    }
  };

  // Called when the other device declines / rejects our outgoing call
  const handleCallRejected = (declinerName?: string) => {
    if (outgoingRingStopRef.current) {
      try {
        outgoingRingStopRef.current();
      } catch (e) {}
      outgoingRingStopRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    sounds.playBusyTone();

    setActiveCall((currentCall) => {
      if (currentCall) {
        const newLog: CallLogItem = {
          id: 'l_' + Date.now(),
          contactId: currentCall.contact.id,
          contactName: currentCall.contact.name,
          contactEmail: currentCall.contact.email,
          contactAvatar: currentCall.contact.avatar,
          type: 'voice',
          direction: 'missed',
          timestamp: Date.now(),
          durationSeconds: 0,
          isGroupCall: currentCall.isGroupCall,
        };
        setCallLogs((prev) => [newLog, ...prev]);
      }
      return null;
    });

    setIncomingCall(null);
    notificationService.closeActiveNotification();
  };

  // End Call
  const handleEndCall = () => {
    if (outgoingRingStopRef.current) {
      try {
        outgoingRingStopRef.current();
      } catch (e) {}
      outgoingRingStopRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (activeCall) {
      sounds.playHangupTone();
      const participantNames = activeCall.participants.map((p) => p.contact.name);
      const newLog: CallLogItem = {
        id: 'l_' + Date.now(),
        contactId: activeCall.contact.id,
        contactName: activeCall.isGroupCall
          ? `Gruppsamtal (${participantNames.join(', ')})`
          : activeCall.contact.name,
        contactEmail: activeCall.contact.email,
        contactAvatar: activeCall.contact.avatar,
        type: 'voice',
        direction: 'outgoing',
        timestamp: Date.now(),
        durationSeconds: activeCall.duration,
        isGroupCall: activeCall.isGroupCall,
        participantNames,
      };
      setCallLogs((prev) => [newLog, ...prev]);

      callChannel.endCall(activeCall.contact.email);
    } else {
      callChannel.endCall();
    }

    setActiveCall(null);
    setIncomingCall(null);
  };

  // Toggle Controls in Voice Call
  const handleToggleMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const handleToggleSpeaker = () => {
    setActiveCall((prev) => (prev ? { ...prev, isSpeakerOn: !prev.isSpeakerOn } : null));
  };

  // Simulate Incoming Call helper
  const handleSimulateIncoming = (contact: Contact) => {
    setIncomingCall({ contact, callType: 'voice' });
  };

  // Delayed test call for background ringing / push notifications testing
  const handleStartDelayedTestCall = (delaySeconds: number = 5, customContact?: Contact) => {
    const targetContact: Contact =
      customContact ||
      contacts[0] || {
        id: 'test_parent',
        name: settings.secondParentName || 'Mamma / Pappa',
        email: settings.parentEmail || 'foralder@test.se',
        avatar: '👩‍👧',
        color: 'from-amber-400 to-orange-500',
        relation: 'Mamma',
        isFavorite: true,
        isQuickDial: true,
        status: 'online',
        ringtone: settings.ringtone || 'marimba',
      };

    if (delayedCallTimerRef.current) {
      clearInterval(delayedCallTimerRef.current);
      delayedCallTimerRef.current = null;
    }

    setDelayedCallCountdown(delaySeconds);
    sounds.playReactionSound('coin');

    let remaining = delaySeconds;
    delayedCallTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (delayedCallTimerRef.current) {
          clearInterval(delayedCallTimerRef.current);
          delayedCallTimerRef.current = null;
        }
        setDelayedCallCountdown(null);
        handleSimulateIncoming(targetContact);
      } else {
        setDelayedCallCountdown(remaining);
      }
    }, 1000);
  };

  const handleCancelDelayedTestCall = () => {
    if (delayedCallTimerRef.current) {
      clearInterval(delayedCallTimerRef.current);
      delayedCallTimerRef.current = null;
    }
    setDelayedCallCountdown(null);
  };

  // Send Voice Message (walkie-talkie cloud broadcast)
  const handleSendVoiceMessage = (msg: VoiceMessage, targetContactEmail?: string) => {
    setVoiceMessages((prev) => [msg, ...prev.filter((m) => m.id !== msg.id)]);
    const targetEmail = targetContactEmail || contacts.find((c) => c.id === msg.contactId)?.email;
    if (targetEmail) {
      callChannel.sendMessage({
        type: 'VOICE_MSG',
        senderEmail: settings.childEmail,
        senderName: settings.childName,
        senderAvatar: settings.childAvatar,
        targetEmail: targetEmail,
        callType: 'voice',
        payload: msg,
      });
    }
  };

  const handleMarkVoiceMessageListened = (id: string) => {
    setVoiceMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, listened: true } : m))
    );
  };

  const handleMarkAllVoiceMessagesListened = () => {
    setVoiceMessages((prev) =>
      prev.map((m) => ({ ...m, listened: true }))
    );
  };

  const handleDeleteVoiceMessage = (id: string) => {
    setVoiceMessages((prev) => prev.filter((m) => m.id !== id));
  };

  // Add contact with PIN verification (from QR scanner or friend sharing)
  const handleAddContactWithPin = (newContact: Partial<Contact>) => {
    const contactToAdd: Contact = {
      id: 'c_' + Date.now(),
      name: newContact.name || 'Kompis',
      email: (newContact.email || '').toLowerCase(),
      avatar: newContact.avatar || '👦',
      color: 'from-blue-400 to-indigo-600',
      relation: (newContact.relation as any) || 'Kompis',
      category: newContact.category || 'kompisar',
      allowedCallType: 'voice_only',
      isFavorite: false,
      isQuickDial: !!newContact.isQuickDial,
      status: 'online',
      notes: 'Tillagd via QR-kod',
    };
    setContacts((prev) => [...prev, contactToAdd]);
  };

  // Complete onboarding
  const handleCompleteOnboarding = (updatedSettings: ParentSettings) => {
    setSettings(updatedSettings);
    localStorage.setItem('kompisring_onboarded_v1', 'true');
    setIsOnboardingOpen(false);
  };

  // Import family from sync/login
  const handleImportFamily = (importedSettings: ParentSettings, importedContacts?: Contact[], importedLogs?: CallLogItem[]) => {
    if (importedSettings) setSettings(importedSettings);
    if (importedContacts && importedContacts.length > 0) setContacts(importedContacts);
    if (importedLogs) setCallLogs(importedLogs);
    localStorage.setItem('kompisring_onboarded_v1', 'true');
    setIsOnboardingOpen(false);
  };

  // Google Play Data Deletion / Factory reset
  const handleResetAllData = () => {
    localStorage.removeItem('kompisring_contacts');
    localStorage.removeItem('kompisring_settings');
    localStorage.removeItem('kompisring_logs');
    localStorage.removeItem('kompisring_voicemsgs');
    localStorage.removeItem('kompisring_onboarded_v1');
    setContacts(INITIAL_CONTACTS);
    setSettings(DEFAULT_SETTINGS);
    setCallLogs(INITIAL_CALL_LOGS);
    setVoiceMessages([]);
    setIsParentMode(false);
  };

  return (
    <div id="kompisring-app-root" className="min-h-screen bg-slate-950 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Background Call Test Countdown Banner */}
      {delayedCallCountdown !== null && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-lg bg-slate-900 text-white p-4 rounded-3xl border-2 border-amber-400 shadow-2xl shadow-amber-500/20 animate-bounce flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 shadow-md">
              {delayedCallCountdown}s
            </div>
            <div>
              <span className="text-sm font-black text-amber-300 block leading-tight">
                ⏱️ Testsamtal rings om {delayedCallCountdown}s!
              </span>
              <span className="text-xs text-slate-300 font-medium leading-tight block mt-0.5">
                Minimera appen, byt flik eller lås telefonen nu för att testa bakgrundssignalen!
              </span>
            </div>
          </div>
          <button
            onClick={handleCancelDelayedTestCall}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold shrink-0 transition-colors border border-slate-700"
          >
            Avbryt ✕
          </button>
        </div>
      )}

      {/* Main View Router */}
      {isParentMode ? (
        <ParentDashboard
          contacts={contacts}
          settings={settings}
          callLogs={callLogs}
          onUpdateContacts={setContacts}
          onUpdateSettings={setSettings}
          onExitParentMode={() => setIsParentMode(false)}
          onClearLogs={() => setCallLogs([])}
          onResetAllData={handleResetAllData}
          onOpenOnboardingGuide={() => setIsOnboardingOpen(true)}
          onStartDelayedTestCall={handleStartDelayedTestCall}
        />
      ) : (
        <KidModeView
          contacts={contacts}
          settings={settings}
          voiceMessages={voiceMessages}
          onStartCall={handleStartCall}
          onStartGroupCall={handleStartGroupCall}
          onOpenParentMode={() => setIsPinModalOpen(true)}
          onSaveVoiceMessage={handleSendVoiceMessage}
          onMarkVoiceMessageListened={handleMarkVoiceMessageListened}
          onMarkAllVoiceMessagesListened={handleMarkAllVoiceMessagesListened}
          onDeleteVoiceMessage={handleDeleteVoiceMessage}
          isBedtime={isBedtime}
          onSimulateIncomingCall={handleSimulateIncoming}
          onStartDelayedTestCall={handleStartDelayedTestCall}
          onUpdateChildStatus={(newStatus) =>
            setSettings((prev) => ({ ...prev, childStatus: newStatus }))
          }
          onUpdateRingtone={(newRingtone) =>
            setSettings((prev) => ({ ...prev, ringtone: newRingtone }))
          }
          onToggleTheme={() =>
            setSettings((prev) => {
              const current = prev.theme || 'system';
              const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
              return { ...prev, theme: next };
            })
          }
          onAddContactWithPin={handleAddContactWithPin}
        />
      )}

      {/* First-time Onboarding Guide Modal */}
      {isOnboardingOpen && (
        <OnboardingModal
          initialSettings={settings}
          onComplete={handleCompleteOnboarding}
          onImportFamily={handleImportFamily}
          onClose={() => setIsOnboardingOpen(false)}
        />
      )}

      {/* Parent PIN Security Gate */}
      {isPinModalOpen && (
        <ParentPinModal
          currentPin={settings.pin}
          parentEmail={settings.parentEmail}
          childName={settings.childName}
          onSuccess={() => {
            setIsPinModalOpen(false);
            setIsParentMode(true);
          }}
          onClose={() => setIsPinModalOpen(false)}
          onResetPin={(newPin) => setSettings((prev) => ({ ...prev, pin: newPin }))}
        />
      )}

      {/* Incoming Voice Call Ringing Modal */}
      {incomingCall && (
        <IncomingCallModal
          contact={incomingCall.contact}
          callType="voice"
          defaultRingtone={settings.ringtone || 'marimba'}
          volume={settings.soundVolume || 0.8}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
        />
      )}

      {/* Full Screen Dedicated Voice In-Call Interface */}
      {activeCall && (
        <ActiveCallScreen
          call={activeCall}
          allContacts={contacts}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          onToggleSpeaker={handleToggleSpeaker}
          onAddParticipant={handleAddParticipantToCall}
          onRemoveParticipant={handleRemoveParticipant}
        />
      )}
    </div>
  );
}
