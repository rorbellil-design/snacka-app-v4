import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Mic,
  Lock,
  Sparkles,
  Heart,
  Moon,
  Sun,
  Users,
  Radio,
  Gamepad2,
  Headphones,
  BookOpen,
  Trophy,
  Smile,
  ChevronDown,
  Music,
  Bell,
  QrCode,
  Laptop,
  Play,
  Pause,
  Volume2,
  Inbox,
  Download,
} from 'lucide-react';
import { Contact, ParentSettings, VoiceMessage, RingtoneType } from '../types';
import { VoiceMessageModal } from './VoiceMessageModal';
import { VoiceInboxModal } from './VoiceInboxModal';
import { AvatarDisplay } from './AvatarDisplay';
import { GroupCallSetupModal } from './GroupCallSetupModal';
import { RingtonePickerModal } from './RingtonePickerModal';
import { NotificationSetupModal } from './NotificationSetupModal';
import { QrContactShareModal } from './QrContactShareModal';
import { InstallPwaModal } from './InstallPwaModal';
import { sounds } from '../utils/audioEffects';
import { notificationService, NotificationPermissionStatus } from '../utils/notificationService';

interface KidModeViewProps {
  contacts: Contact[];
  settings: ParentSettings;
  voiceMessages?: VoiceMessage[];
  onStartCall: (contact: Contact, type: 'voice') => void;
  onStartGroupCall: (contacts: Contact[]) => void;
  onOpenParentMode: () => void;
  onSaveVoiceMessage: (msg: VoiceMessage, targetEmail?: string) => void;
  onMarkVoiceMessageListened?: (id: string) => void;
  onMarkAllVoiceMessagesListened?: () => void;
  onDeleteVoiceMessage?: (id: string) => void;
  isBedtime: boolean;
  onSimulateIncomingCall: (contact: Contact, type: 'voice') => void;
  onStartDelayedTestCall?: (delaySecs: number, contact?: Contact) => void;
  onUpdateChildStatus?: (status: string) => void;
  onUpdateRingtone?: (ringtone: RingtoneType) => void;
  onToggleTheme?: () => void;
  onAddContactWithPin?: (contact: Partial<Contact>) => void;
}

const STATUS_PRESETS = [
  { id: 'online', label: 'Online & Redo', icon: '🟢' },
  { id: 'gaming', label: 'Spelar spel 🎮', icon: '🎮' },
  { id: 'chill', label: 'Chillar & musik 🎧', icon: '🎧' },
  { id: 'homework', label: 'Gör läxor 📚', icon: '📚' },
  { id: 'sports', label: 'Tränar / Ute ⚽', icon: '⚽' },
];

export const KidModeView: React.FC<KidModeViewProps> = ({
  contacts,
  settings,
  voiceMessages = [],
  onStartCall,
  onStartGroupCall,
  onOpenParentMode,
  onSaveVoiceMessage,
  onMarkVoiceMessageListened,
  onMarkAllVoiceMessagesListened,
  onDeleteVoiceMessage,
  isBedtime,
  onSimulateIncomingCall,
  onStartDelayedTestCall,
  onUpdateChildStatus,
  onUpdateRingtone,
  onToggleTheme,
  onAddContactWithPin,
}) => {
  const [selectedVoiceContact, setSelectedVoiceContact] = useState<Contact | null>(null);
  const [showVoiceInboxModal, setShowVoiceInboxModal] = useState(false);
  const [showGroupCallModal, setShowGroupCallModal] = useState(false);
  const [showRingtoneModal, setShowRingtoneModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'alla' | 'familj' | 'kompisar'>('alla');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [activeStatus, setActiveStatus] = useState(settings.childStatus || 'Spelar spel 🎮');
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionStatus>(() =>
    notificationService.getPermission()
  );
  const [dismissNotifBanner, setDismissNotifBanner] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const isInsideIframe = notificationService.isInsideIframe();

  useEffect(() => {
    setNotifPermission(notificationService.getPermission());
  }, []);

  const handleEnableNotificationsDirectly = async () => {
    if (isInsideIframe) {
      window.open(window.location.href, '_blank');
      return;
    }
    const granted = await notificationService.sendTestNotification();
    setNotifPermission(granted ? 'granted' : notificationService.getPermission());
  };

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const handleTogglePlayVoiceMsg = (msg: VoiceMessage) => {
    if (playingMsgId === msg.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingMsgId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const audioSrc = msg.audioBase64 || msg.audioBlobUrl;
    if (audioSrc) {
      const audio = new Audio(audioSrc);
      audioPlayerRef.current = audio;
      setPlayingMsgId(msg.id);

      if (onMarkVoiceMessageListened && !msg.listened) {
        onMarkVoiceMessageListened(msg.id);
      }

      audio.onended = () => {
        setPlayingMsgId(null);
        audioPlayerRef.current = null;
      };
      audio.onerror = () => {
        setPlayingMsgId(null);
        audioPlayerRef.current = null;
        sounds.playReactionSound('coin');
      };
      audio.play().catch((err) => {
        console.warn('Audio play error:', err);
        setPlayingMsgId(null);
      });
    } else {
      setPlayingMsgId(msg.id);
      sounds.playReactionSound('coin');
      setTimeout(() => setPlayingMsgId(null), 2500);
      if (onMarkVoiceMessageListened && !msg.listened) {
        onMarkVoiceMessageListened(msg.id);
      }
    }
  };

  const handleSelectStatus = (statusText: string) => {
    setActiveStatus(statusText);
    setShowStatusMenu(false);
    if (onUpdateChildStatus) {
      onUpdateChildStatus(statusText);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (filterCategory === 'familj') return c.category === 'familj';
    if (filterCategory === 'kompisar') return c.category === 'kompisar';
    return true;
  });

  const quickDialContacts = contacts.filter((c) => c.isQuickDial);
  const incomingVoiceMsgs = voiceMessages.filter((m) => m.sender === 'contact');
  const unreadVoiceMsgs = incomingVoiceMsgs.filter((m) => !m.listened);
  const latestIncomingUnread = unreadVoiceMsgs[0];

  const currentTheme = settings.theme || 'system';

  return (
    <div
      id="kid-mode-view"
      className="min-h-screen bg-slate-50/90 dark:bg-slate-950 relative pb-28 sm:pb-32 flex flex-col text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-900 overflow-x-hidden transition-colors duration-200"
    >
      {/* Ambient background soft light blurs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-200/25 dark:bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-200/20 dark:bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-emerald-200/20 dark:bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Modern Clean Glass Navbar - No Horizontal Scrolling */}
      <header
        id="app-header"
        className="sticky top-0 z-30 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shadow-xs px-3 sm:px-6 py-2.5 transition-all"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Brand & Child Profile Status Capsule */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* App Brand Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </div>
              <div className="hidden md:block">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Snacka
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block -mt-0.5">
                  Röstchatt & Vänner
                </span>
              </div>
            </div>

            {/* Child Profile Status Capsule with interactive status selector */}
            <div className="relative min-w-0">
              <button
                id="child-status-selector-btn"
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700 py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-2xl shadow-2xs transition-colors text-left max-w-full"
                title="Klicka för att ändra din status"
              >
                <AvatarDisplay
                  avatar={settings.childAvatar}
                  name={settings.childName}
                  sizeClass="w-6 h-6 sm:w-7 sm:h-7"
                  textSizeClass="text-sm sm:text-base"
                  className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
                    {settings.childName}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 leading-none truncate">
                    <span className="truncate">{activeStatus}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </span>
                </div>
              </button>

              {/* Status dropdown menu */}
              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Sätt din status
                  </div>
                  {STATUS_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectStatus(p.label)}
                      className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors ${
                        activeStatus === p.label ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Theme Toggle (Light / Dark / Auto) */}
            {onToggleTheme && (
              <button
                id="toggle-theme-header-btn"
                onClick={onToggleTheme}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                title={`Tema: ${currentTheme === 'dark' ? 'Mörkt läge 🌙' : currentTheme === 'light' ? 'Ljust läge ☀️' : 'Följer systemet 📱'}`}
              >
                {currentTheme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                ) : currentTheme === 'light' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                )}
                <span className="hidden sm:inline">
                  {currentTheme === 'dark' ? 'Mörkt' : currentTheme === 'light' ? 'Ljust' : 'Auto'}
                </span>
              </button>
            )}

            {/* Parent Mode Lock Pill */}
            <button
              id="open-parent-mode-btn"
              onClick={onOpenParentMode}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-slate-700 shrink-0"
              title="Föräldrakontroll & Inställningar"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Föräldraläge</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bedtime Lock Alert Banner */}
      {isBedtime && settings.bedtimeLockEnabled && (
        <div
          id="bedtime-banner"
          className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4"
        >
          <div className="bg-gradient-to-r from-indigo-950 to-slate-900 text-white px-5 py-4 rounded-3xl border border-indigo-500/40 shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/50 flex items-center justify-center text-amber-300">
                <Moon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-amber-200">
                  Godnatt {settings.childName}! Sovläge är på
                </h3>
                <p className="text-xs text-indigo-200">
                  Samtal är pausade mellan {settings.bedtimeStart} och {settings.bedtimeEnd}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Received Unread Voice Messages Notification Banner */}
      {latestIncomingUnread && (
        <div
          id="unread-voice-banner"
          className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4 animate-fadeIn"
        >
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-amber-500 text-white px-5 py-4 rounded-3xl shadow-lg border border-indigo-400/40 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0 animate-bounce">
                🎙️
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                    Nytt röstmemo!
                  </span>
                  <span className="text-xs text-indigo-100 font-semibold">
                    {latestIncomingUnread.durationSeconds} sek
                  </span>
                </div>
                <h3 className="font-black text-base sm:text-lg leading-tight mt-0.5 text-white truncate">
                  {latestIncomingUnread.senderName || 'En kompis'} har pratat in ett meddelande till dig!
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id={`play-banner-voicemsg-${latestIncomingUnread.id}`}
                onClick={() => handleTogglePlayVoiceMsg(latestIncomingUnread)}
                className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md hover:bg-amber-50 active:scale-95 transition-all"
              >
                {playingMsgId === latestIncomingUnread.id ? (
                  <>
                    <Pause className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                    <span>Pausa</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                    <span>Lyssna nu ▶️</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Activation Helper Banner (if not yet granted) */}
      {notifPermission === 'default' && !dismissNotifBanner && (
        <div
          id="notif-activation-banner"
          className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4 animate-fadeIn"
        >
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-3.5 rounded-3xl shadow-lg border border-emerald-400/40 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                🔔
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-white">
                  {isInsideIframe
                    ? 'Öppna appen i en egen flik för att få samtal i bakgrunden'
                    : 'Vill du få notiser och ringsignal när någon ringer?'}
                </h3>
                <p className="text-xs text-emerald-100 font-medium">
                  {isInsideIframe
                    ? 'Förhandsgranskningen blockerar notiser. Öppna i en egen flik så att telefonen/datorn plingar när någon ringer.'
                    : 'Tryck på knappen så att mobilen eller datorn plingar och visar vem som ringer även när skärmen är släckt eller appen är minimerad.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="enable-notifs-banner-btn"
                onClick={handleEnableNotificationsDirectly}
                className="px-4 py-2 rounded-2xl bg-white text-emerald-800 font-black text-xs sm:text-sm shadow-md hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Bell className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <span>{isInsideIframe ? 'Öppna i ny flik ↗️' : 'Slå på & testa notis 🔔'}</span>
              </button>
              <button
                onClick={() => setDismissNotifBanner(true)}
                className="w-8 h-8 rounded-full bg-emerald-800/60 hover:bg-emerald-800 text-emerald-200 flex items-center justify-center text-xs"
                title="Dölj"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 flex flex-col gap-6">
        {/* Quick Dial Favorites Row (Snabbval) */}
        {quickDialContacts.length > 0 && (
          <section id="quick-dial-section" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Favoriter & Snabbval
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {quickDialContacts.map((contact) => (
                <button
                  key={contact.id}
                  id={`quick-dial-${contact.id}`}
                  onClick={() => onStartCall(contact, 'voice')}
                  className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md transition-all active:scale-98 text-left"
                >
                  <div className="relative shrink-0">
                    <AvatarDisplay
                      avatar={contact.avatar}
                      name={contact.name}
                      sizeClass="w-13 h-13 sm:w-14 sm:h-14"
                      textSizeClass="text-3xl"
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl group-hover:scale-105 transition-transform"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                        contact.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 block truncate">
                      {contact.relation}
                    </span>
                    <span className="text-base font-black text-slate-900 dark:text-white block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {contact.name}
                    </span>
                    {contact.activityStatus && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate block">
                        {contact.activityStatus}
                      </span>
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-xs">
                    <Phone className="w-4 h-4 fill-current" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Category Segmented Tabs - Clean grid without horizontal scroll */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          <div className="bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-2xl grid grid-cols-3 w-full sm:w-auto sm:flex sm:items-center gap-1 shadow-inner max-w-full">
            <button
              id="filter-all-btn"
              onClick={() => setFilterCategory('alla')}
              className={`px-3 py-2 sm:py-1.5 rounded-xl font-bold text-xs transition-all text-center truncate ${
                filterCategory === 'alla'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Alla ({contacts.length})
            </button>
            <button
              id="filter-family-btn"
              onClick={() => setFilterCategory('familj')}
              className={`px-3 py-2 sm:py-1.5 rounded-xl font-bold text-xs transition-all text-center truncate ${
                filterCategory === 'familj'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Familj 🏡
            </button>
            <button
              id="filter-friends-btn"
              onClick={() => setFilterCategory('kompisar')}
              className={`px-3 py-2 sm:py-1.5 rounded-xl font-bold text-xs transition-all text-center truncate ${
                filterCategory === 'kompisar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kompisar 🚀
            </button>
          </div>
        </div>

        {/* Main Modern Contact Cards Grid */}
        <div
          id="contacts-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              id={`contact-card-${contact.id}`}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.08)] hover:border-indigo-300/60 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-4 relative group"
            >
              {/* Header Info */}
              <div className="flex items-start gap-4">
                {/* Large Modern Squircle Avatar */}
                <div className="relative shrink-0">
                  <AvatarDisplay
                    avatar={contact.avatar}
                    name={contact.name}
                    sizeClass="w-20 h-20 sm:w-22 sm:h-22"
                    textSizeClass="text-4xl sm:text-5xl"
                    className="bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-3xl shadow-xs group-hover:scale-102 transition-transform"
                  />
                  {/* Status Indicator */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 shadow-xs ${
                      contact.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                </div>

                {/* Name & Pill Tag ONLY (No email in kid mode) */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border border-slate-200/60 dark:border-slate-700">
                      {contact.relation}
                    </span>
                    {contact.activityStatus && (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200/50 dark:border-indigo-800">
                        {contact.activityStatus}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                    {contact.name}
                  </h2>
                  {contact.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {contact.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Voice Call & Voice Message */}
              <div className="flex flex-col gap-2.5 pt-1">
                {/* Direct latest received voice memo audio player if available for this contact */}
                {(() => {
                  const contactMsgs = voiceMessages.filter(
                    (m) =>
                      m.sender === 'contact' &&
                      (m.contactId === contact.id ||
                        (m.senderEmail && contact.email && m.senderEmail.toLowerCase() === contact.email.toLowerCase()))
                  );
                  const latestMsg = contactMsgs[0];
                  if (!latestMsg) return null;
                  const isPlaying = playingMsgId === latestMsg.id;

                  return (
                    <div
                      id={`contact-voicemsg-bar-${contact.id}`}
                      className={`px-3 py-2 rounded-2xl flex items-center justify-between gap-2 border transition-all ${
                        !latestMsg.listened
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">🎙️</span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {!latestMsg.listened ? 'Nytt röstmemo' : 'Röstmemo'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {latestMsg.durationSeconds}s • {!latestMsg.listened ? '🔴 Olyssnat' : '✓ Lyssnat'}
                          </span>
                        </div>
                      </div>

                      <button
                        id={`play-contact-voicemsg-btn-${contact.id}`}
                        onClick={() => handleTogglePlayVoiceMsg(latestMsg)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs active:scale-95 transition-all shrink-0 ${
                          isPlaying
                            ? 'bg-rose-500 hover:bg-rose-600 text-white'
                            : !latestMsg.listened
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-white" />
                            <span>Pausa</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{!latestMsg.listened ? 'Lyssna' : 'Spela igen'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  {/* Primary Voice Call Button */}
                  <button
                    id={`voice-call-btn-${contact.id}`}
                    onClick={() => onStartCall(contact, 'voice')}
                    className="py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-97 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm hover:shadow-md shadow-emerald-500/20 transition-all"
                    title={`Ring röstsamtal till ${contact.name}`}
                  >
                    <Phone className="w-5 h-5 fill-white" />
                    <span>Ring</span>
                  </button>

                  {/* Voice Message Walkie-Talkie Button */}
                  <button
                    id={`voice-memo-btn-${contact.id}`}
                    onClick={() => setSelectedVoiceContact(contact)}
                    className="py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 active:scale-97 text-slate-700 dark:text-slate-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700 transition-all"
                    title={`Skicka röstmeddelande till ${contact.name}`}
                  >
                    <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Röstmemo</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredContacts.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
            <p className="text-4xl">🎈</p>
            <h3 className="font-black text-lg text-slate-800 dark:text-slate-200">Inga kontakter här ännu</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Tryck på knappen nedan och ange din föräldra-PIN för att lägga till familj och kompisar.
            </p>
            <button
              id="empty-state-open-parent-btn"
              onClick={onOpenParentMode}
              className="mt-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>Lägg till kontakter i Föräldraläget 🛡️</span>
            </button>
          </div>
        )}
      </main>

      {/* Group Call Setup Modal */}
      {showGroupCallModal && (
        <GroupCallSetupModal
          contacts={contacts}
          onStartGroupCall={(selected) => {
            setShowGroupCallModal(false);
            onStartGroupCall(selected);
          }}
          onClose={() => setShowGroupCallModal(false)}
        />
      )}

      {/* Voice Message Walkie-Talkie Modal */}
      {selectedVoiceContact && (
        <VoiceMessageModal
          contact={selectedVoiceContact}
          onClose={() => setSelectedVoiceContact(null)}
          onSendVoiceMessage={(msg) => {
            onSaveVoiceMessage(msg, selectedVoiceContact.email);
            setSelectedVoiceContact(null);
          }}
        />
      )}

      {/* Voice Inbox Modal */}
      {showVoiceInboxModal && (
        <VoiceInboxModal
          voiceMessages={voiceMessages}
          contacts={contacts}
          onStartCall={onStartCall}
          onMarkVoiceMessageListened={(id) => {
            if (onMarkVoiceMessageListened) {
              onMarkVoiceMessageListened(id);
            }
          }}
          onMarkAllVoiceMessagesListened={onMarkAllVoiceMessagesListened}
          onDeleteVoiceMessage={onDeleteVoiceMessage}
          onClose={() => setShowVoiceInboxModal(false)}
        />
      )}

      {/* Ringtone Customization Modal */}
      {showRingtoneModal && (
        <RingtonePickerModal
          currentRingtone={settings.ringtone || 'marimba'}
          volume={settings.soundVolume || 0.8}
          onSelectRingtone={(ringtone) => {
            if (onUpdateRingtone) {
              onUpdateRingtone(ringtone);
            }
          }}
          onClose={() => setShowRingtoneModal(false)}
        />
      )}

      {/* Background Notification Setup Modal */}
      {showNotificationModal && (
        <NotificationSetupModal
          contacts={contacts}
          onStartDelayedTestCall={(delaySecs, contact) => {
            setShowNotificationModal(false);
            if (onStartDelayedTestCall) {
              onStartDelayedTestCall(delaySecs, contact);
            } else {
              const target = contact || contacts[0];
              if (target) {
                setTimeout(() => {
                  onSimulateIncomingCall(target, 'voice');
                }, delaySecs * 1000);
              }
            }
          }}
          onSimulateDelayedCall={(contact, delay) => {
            setShowNotificationModal(false);
            if (delay === 0) {
              onSimulateIncomingCall(contact, 'voice');
            } else {
              setTimeout(() => {
                onSimulateIncomingCall(contact, 'voice');
              }, delay * 1000);
            }
          }}
          onClose={() => setShowNotificationModal(false)}
        />
      )}

      {/* QR Code Contact Modal with PIN authorization */}
      {showQrModal && (
        <QrContactShareModal
          settings={settings}
          onAddContactWithPinVerification={(newContact) => {
            if (onAddContactWithPin) {
              onAddContactWithPin(newContact);
            }
          }}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* Fixed Bottom Navigation Bar (Fast bottenmeny - Ergonomic thumb-friendly, zero horizontal scrolling) */}
      <nav
        id="bottom-nav-bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 sm:px-6 py-2 transition-all"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1 sm:gap-2">
          {/* 1. Kontakter (Hem) */}
          <button
            id="nav-contacts-btn"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/50 transition-all active:scale-95 group"
          >
            <Phone className="w-5 h-5 mb-1 fill-indigo-600/20 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black leading-none whitespace-nowrap">
              Kontakter
            </span>
          </button>

          {/* 2. Röstbrevlåda (med sifferbadge) */}
          <button
            id="nav-voice-inbox-btn"
            onClick={() => setShowVoiceInboxModal(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all active:scale-95 relative group ${
              unreadVoiceMsgs.length > 0
                ? 'text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="relative">
              <Inbox className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
              {unreadVoiceMsgs.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse shadow-xs">
                  {unreadVoiceMsgs.length}
                </span>
              )}
            </div>
            <span className="text-[11px] font-black leading-none whitespace-nowrap">
              Röstlåda
            </span>
          </button>

          {/* 3. Gruppsamtal */}
          <button
            id="nav-group-call-btn"
            onClick={() => setShowGroupCallModal(true)}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-amber-600 dark:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 transition-all active:scale-95 group"
          >
            <Users className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black leading-none whitespace-nowrap">
              Grupp 👥
            </span>
          </button>

          {/* 4. Verktyg & Mer */}
          <button
            id="nav-tools-menu-btn"
            onClick={() => setShowToolsMenu(true)}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 group"
          >
            <Sparkles className="w-5 h-5 mb-1 text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black leading-none whitespace-nowrap">
              Verktyg ✨
            </span>
          </button>
        </div>
      </nav>

      {/* Tools & Settings Action Sheet Modal */}
      {showToolsMenu && (
        <div
          id="tools-menu-modal"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setShowToolsMenu(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                    Verktyg & Inställningar
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Roliga funktioner och ljud för {settings.childName}
                  </p>
                </div>
              </div>
              <button
                id="close-tools-menu-btn"
                onClick={() => setShowToolsMenu(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Action Tiles Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Ringtone Picker Tile */}
              <button
                id="tool-ringtone-tile-btn"
                onClick={() => {
                  setShowToolsMenu(false);
                  setShowRingtoneModal(true);
                }}
                className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100/80 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col items-start gap-2 text-left transition-all active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-black text-sm text-slate-900 dark:text-white block">
                    Ringsignal 🎵
                  </span>
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold block">
                    Byt & provlyssna melodi
                  </span>
                </div>
              </button>

              {/* QR Code Share Tile */}
              <button
                id="tool-qr-tile-btn"
                onClick={() => {
                  setShowToolsMenu(false);
                  setShowQrModal(true);
                }}
                className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 border border-amber-200/80 dark:border-amber-800/60 flex flex-col items-start gap-2 text-left transition-all active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-black text-sm text-slate-900 dark:text-white block">
                    Min QR-kod 📱
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold block">
                    Lägg till kompis snabbt
                  </span>
                </div>
              </button>

              {/* Background Notifications Tile */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between gap-3 text-left">
                <button
                  id="tool-notif-tile-btn"
                  onClick={() => {
                    setShowToolsMenu(false);
                    setShowNotificationModal(true);
                  }}
                  className="flex items-start gap-2.5 w-full text-left active:scale-95 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-black text-sm text-slate-900 dark:text-white block">
                      Notiser 🔔
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                      Plinga i bakgrunden
                    </span>
                  </div>
                </button>

                {onStartDelayedTestCall && (
                  <button
                    onClick={() => {
                      setShowToolsMenu(false);
                      onStartDelayedTestCall(5);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
                  >
                    <span>⏱️ Testa ring om 5s</span>
                  </button>
                )}
              </div>

              {/* Quick Theme Toggle Tile */}
              {onToggleTheme && (
                <button
                  id="tool-theme-tile-btn"
                  onClick={onToggleTheme}
                  className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex flex-col items-start gap-2 text-left transition-all active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 dark:bg-slate-700 text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    {currentTheme === 'dark' ? (
                      <Moon className="w-5 h-5 fill-current" />
                    ) : currentTheme === 'light' ? (
                      <Sun className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Laptop className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-black text-sm text-slate-900 dark:text-white block">
                      Färgtema 🌙
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
                      {currentTheme === 'dark' ? 'Mörkt läge' : currentTheme === 'light' ? 'Ljust läge' : 'Systemföljande'}
                    </span>
                  </div>
                </button>
              )}
            </div>

            {/* Parent Mode Full Width Action Row */}
            <button
              id="tool-parent-mode-tile-btn"
              onClick={() => {
                setShowToolsMenu(false);
                onOpenParentMode();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-between border border-slate-700 transition-all active:scale-98 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Öppna Föräldraläge</span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal">Kräver PIN-kod 🔒</span>
            </button>
          </div>
        </div>
      )}
      {/* Install PWA Modal */}
      <InstallPwaModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
};

