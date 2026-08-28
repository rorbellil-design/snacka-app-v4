export type RingtoneType =
  | 'marimba'
  | 'gaming'
  | 'synth'
  | 'bells'
  | 'space'
  | 'playful'
  | 'guitar';

export interface Contact {
  id: string;
  name: string;
  email: string;
  avatar: string; // emoji or image url
  color: string; // tailwind color class or hex
  relation: 'Mamma' | 'Pappa' | 'Syskon' | 'Bästa vän' | 'Kompis' | 'Mormor/Morfar' | 'Farmor/Farfar' | 'Släkting' | 'Annan';
  allowedCallType?: 'voice_only';
  isFavorite: boolean;
  isQuickDial: boolean;
  category?: 'familj' | 'kompisar';
  status: 'online' | 'busy' | 'offline';
  activityStatus?: string; // e.g. "Spelar Roblox 🎮", "Gör läxor 📚", "Chillar 🎧"
  ringtone?: RingtoneType; // custom ringtone for this specific contact
  notes?: string;
  isDemoBot?: boolean;
}

export interface ParentSettings {
  pin: string;
  childName: string;
  childEmail: string;
  childAvatar: string;
  childColor: string;
  childStatus?: string; // current active status of the child
  parentEmail?: string; // Verified parent email address for 2FA and PIN recovery
  isParentVerified?: boolean;
  secondParentName?: string; // e.g. "Pappa Marcus" or "Mamma Sara"
  secondParentEmail?: string; // Second parent/guardian email
  secondParentRelation?: 'Pappa' | 'Mamma' | 'Vårdnadshavare' | 'Medförälder';
  secondParentAvatar?: string;
  secondParentStatus?: 'connected' | 'pending' | 'not_invited';
  bedtimeLockEnabled: boolean;
  bedtimeStart: string; // "20:00"
  bedtimeEnd: string; // "07:00"
  onlyAllowApprovedContacts: boolean;
  maxCallDurationMinutes: number; // 0 for unlimited
  ringtone: RingtoneType;
  soundVolume: number;
  theme?: 'light' | 'dark' | 'system';
}

export interface CallLogItem {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactAvatar: string;
  type: 'voice';
  direction: 'outgoing' | 'incoming' | 'missed' | 'blocked';
  timestamp: number;
  durationSeconds: number;
  isGroupCall?: boolean;
  participantNames?: string[];
}

export interface VoiceMessage {
  id: string;
  contactId: string;
  contactName: string;
  senderEmail?: string;
  senderName?: string;
  senderAvatar?: string;
  sender: 'child' | 'contact';
  timestamp: number;
  durationSeconds: number;
  audioBlobUrl?: string;
  audioBase64?: string;
  transcription?: string;
  listened: boolean;
}

export interface CallParticipant {
  contact: Contact;
  status: 'calling' | 'connected' | 'ended';
  isSpeaking?: boolean;
}

export type ActiveCallState = {
  sessionId: string;
  contact: Contact; // primary contact
  participants: CallParticipant[];
  isGroupCall: boolean;
  type: 'voice';
  status: 'calling' | 'ringing' | 'connected' | 'ended';
  startedAt?: number;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isDrawingOpen: boolean;
};
