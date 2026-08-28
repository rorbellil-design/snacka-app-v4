import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  History,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Key,
  Moon,
  Sun,
  Laptop,
  Clock,
  ArrowLeft,
  Check,
  Download,
  Upload,
  Code2,
  Mail,
  Copy,
  Image as ImageIcon,
  Music,
  Volume2,
  Play,
  Square,
  Sparkles,
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Smartphone,
  QrCode,
  HelpCircle,
  Send,
  Loader2,
  ExternalLink,
  Cloud,
  CloudUpload,
  CloudDownload,
} from 'lucide-react';
import { Contact, ParentSettings, CallLogItem, RingtoneType } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sounds, RINGTONE_OPTIONS, RingtoneOption } from '../utils/audioEffects';
import { notificationService, NotificationPermissionStatus } from '../utils/notificationService';
import { QrContactShareModal } from './QrContactShareModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { CoParentModal } from './CoParentModal';
import { InstallPwaModal } from './InstallPwaModal';
import { sendParentVerificationCode } from '../utils/parentEmailService';
import { downloadAppIcon } from '../utils/iconDownloader';

interface ParentDashboardProps {
  contacts: Contact[];
  settings: ParentSettings;
  callLogs: CallLogItem[];
  onUpdateContacts: (contacts: Contact[]) => void;
  onUpdateSettings: (settings: ParentSettings) => void;
  onExitParentMode: () => void;
  onClearLogs: () => void;
  onResetAllData?: () => void;
  onOpenOnboardingGuide?: () => void;
  onStartDelayedTestCall?: (delaySecs: number, contact?: Contact) => void;
}

const AVATAR_EMOJIS = ['👩‍🦰', '🧔', '👵', '👴', '👧', '👦', '🐶', '🐱', '🦄', '🚀', '🎨', '⚽', '👑', '🌈', '🦖'];
const RELATIONS = ['Mamma', 'Pappa', 'Syskon', 'Bästa vän', 'Kompis', 'Mormor/Morfar', 'Farmor/Farfar', 'Släkting', 'Annan'] as const;

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  contacts,
  settings,
  callLogs,
  onUpdateContacts,
  onUpdateSettings,
  onExitParentMode,
  onClearLogs,
  onResetAllData,
  onOpenOnboardingGuide,
  onStartDelayedTestCall,
}) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'safety' | 'sound' | 'profile' | 'logs' | 'import_code'>('contacts');

  // Privacy Policy, Co-Parent & QR modals
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showCoParentModal, setShowCoParentModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Ringtone preview state
  const [playingRingtoneId, setPlayingRingtoneId] = useState<RingtoneType | null>(null);
  const ringtoneStopRef = useRef<(() => void) | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionStatus>(() =>
    notificationService.getPermission()
  );

  useEffect(() => {
    setNotifPermission(notificationService.getPermission());
  }, []);

  useEffect(() => {
    return () => {
      if (ringtoneStopRef.current) {
        ringtoneStopRef.current();
        ringtoneStopRef.current = null;
      }
    };
  }, []);

  const handleToggleRingtonePreview = (ringtoneId: RingtoneType) => {
    if (playingRingtoneId === ringtoneId) {
      if (ringtoneStopRef.current) {
        ringtoneStopRef.current();
        ringtoneStopRef.current = null;
      }
      setPlayingRingtoneId(null);
    } else {
      if (ringtoneStopRef.current) {
        ringtoneStopRef.current();
      }
      setPlayingRingtoneId(ringtoneId);
      const stop = sounds.playRingtone(ringtoneId, settings.soundVolume || 0.8);
      ringtoneStopRef.current = stop;

      setTimeout(() => {
        if (ringtoneStopRef.current === stop) {
          stop();
          setPlayingRingtoneId(null);
        }
      }, 4000);
    }
  };

  // Contact modal state
  const [isEditingContact, setIsEditingContact] = useState<Contact | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactForm, setContactForm] = useState<Partial<Contact>>({
    name: '',
    email: '',
    avatar: '👦',
    color: 'from-blue-400 to-indigo-600',
    relation: 'Kompis',
    category: 'kompisar',
    allowedCallType: 'voice_only',
    isFavorite: false,
    isQuickDial: false,
    notes: '',
  });

  const [avatarMode, setAvatarMode] = useState<'emoji' | 'upload'>('emoji');
  const [contactFormError, setContactFormError] = useState<string | null>(null);
  const [contactSavedToast, setContactSavedToast] = useState<string | null>(null);
  const contactFileInputRef = useRef<HTMLInputElement | null>(null);
  const childFileInputRef = useRef<HTMLInputElement | null>(null);

  // New PIN state
  const [newPin, setNewPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSendingTestMail, setIsSendingTestMail] = useState(false);
  const [testMailStatus, setTestMailStatus] = useState<string | null>(null);
  const [testMailPreview, setTestMailPreview] = useState<string | undefined>();

  // JSON Export / Import & Cloud Sync state
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudSaveMessage, setCloudSaveMessage] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudLoadMessage, setCloudLoadMessage] = useState<string | null>(null);

  // Contact Actions
  const handleOpenAdd = () => {
    setContactForm({
      name: '',
      email: '',
      avatar: '👦',
      color: 'from-blue-400 to-indigo-600',
      relation: 'Kompis',
      category: 'kompisar',
      allowedCallType: 'voice_only',
      isFavorite: false,
      isQuickDial: false,
      notes: '',
    });
    setAvatarMode('emoji');
    setContactFormError(null);
    setIsAddingContact(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setIsEditingContact(contact);
    setContactForm({ ...contact });
    setContactFormError(null);
    if (contact.avatar.startsWith('data:image/') || contact.avatar.startsWith('http')) {
      setAvatarMode('upload');
    } else {
      setAvatarMode('emoji');
    }
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = (contactForm.name || '').trim();
    let cleanEmail = (contactForm.email || '').trim().toLowerCase();

    if (!cleanName) {
      setContactFormError('Vänligen ange kontaktens namn.');
      return;
    }

    if (!cleanEmail) {
      setContactFormError('Vänligen ange en e-postadress eller ett användarnamn för kontakten.');
      return;
    }

    // If user entered a username/handle or phone number without @, format as @snacka.app
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail.replace(/[^a-z0-9._-]/g, '')}@snacka.app`;
    }

    const finalAvatar = contactForm.avatar || '👤';

    if (isEditingContact) {
      const updated = contacts.map((c) =>
        c.id === isEditingContact.id
          ? ({ ...c, ...contactForm, name: cleanName, email: cleanEmail, avatar: finalAvatar } as Contact)
          : c
      );
      onUpdateContacts(updated);
      setIsEditingContact(null);
      setContactSavedToast(`✓ Kontakten "${cleanName}" har uppdaterats!`);
      sounds.playReactionSound('magic');
      setTimeout(() => setContactSavedToast(null), 4000);
    } else {
      const newContact: Contact = {
        id: 'c_' + Date.now(),
        name: cleanName,
        email: cleanEmail,
        avatar: finalAvatar,
        color: contactForm.color || 'from-emerald-400 to-teal-600',
        relation: (contactForm.relation as any) || 'Kompis',
        category: contactForm.category || 'kompisar',
        allowedCallType: 'voice_only',
        isFavorite: !!contactForm.isFavorite,
        isQuickDial: !!contactForm.isQuickDial,
        status: 'online',
        notes: contactForm.notes || '',
      };
      onUpdateContacts([...contacts, newContact]);
      setIsAddingContact(false);
      setContactSavedToast(`🎉 Kontakten "${cleanName}" har sparats!`);
      sounds.playReactionSound('applause');
      setTimeout(() => setContactSavedToast(null), 4000);
    }
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm('Är du säker på att du vill ta bort kontakten?')) {
      onUpdateContacts(contacts.filter((c) => c.id !== id));
    }
  };

  // Image upload handler using FileReader (Base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isForChild = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vänligen välj en giltig bildfil (.png, .jpg, .webp).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isForChild) {
        onUpdateSettings({ ...settings, childAvatar: base64 });
      } else {
        setContactForm((prev) => ({ ...prev, avatar: base64 }));
        setAvatarMode('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save PIN
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length === 6 && /^\d+$/.test(newPin)) {
      onUpdateSettings({ ...settings, pin: newPin });
      setPinChangeSuccess(true);
      setNewPin('');
      setTimeout(() => setPinChangeSuccess(false), 3000);
    }
  };

  // Send Test Code to Parent Email
  const handleSendTestMail = async () => {
    if (!settings.parentEmail || !settings.parentEmail.includes('@')) {
      alert('Vänligen fyll i en giltig föräldramejladress först.');
      return;
    }
    setIsSendingTestMail(true);
    setTestMailStatus(null);
    try {
      const res = await sendParentVerificationCode(
        settings.parentEmail,
        settings.childName,
        'startup_check'
      );
      setTestMailStatus(res.message);
      setTestMailPreview(res.previewUrl);
      sounds.playReactionSound('magic');
    } catch (err: any) {
      setTestMailStatus('Kunde inte skicka mejlet. Kontrollera nätverket.');
    } finally {
      setIsSendingTestMail(false);
    }
  };

  // Cloud Backup Save to Server
  const handleCloudBackupSave = async () => {
    const emailToUse = settings.parentEmail?.trim().toLowerCase();
    if (!emailToUse || !emailToUse.includes('@')) {
      alert('Vänligen fyll i och spara en giltig föräldra-e-post under fliken "Profil & PIN" först.');
      return;
    }

    setIsCloudSaving(true);
    setCloudSaveMessage(null);

    try {
      const response = await fetch('/api/family/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: emailToUse,
          settings,
          contacts,
          callLogs,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setCloudSaveMessage('✅ Säkerhetskopian har sparats i molnet! Du kan nu logga in och hämta dina inställningar på valfri enhet.');
        sounds.playReactionSound('magic');
      } else {
        setCloudSaveMessage(`⚠️ Kunde inte spara: ${data.error || 'Nätverksfel'}`);
      }
    } catch (err: any) {
      setCloudSaveMessage('⚠️ Kunde inte nå molnservern. Kontrollera nätverksanslutningen.');
    } finally {
      setIsCloudSaving(false);
    }
  };

  // Cloud Backup Load from Server
  const handleCloudBackupLoad = async () => {
    const emailToUse = settings.parentEmail?.trim().toLowerCase();
    if (!emailToUse || !emailToUse.includes('@')) {
      alert('Vänligen ange din föräldra-e-postadress under "Profil & PIN".');
      return;
    }

    setIsCloudLoading(true);
    setCloudLoadMessage(null);

    try {
      const response = await fetch('/api/family/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: emailToUse }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.family) {
        if (data.family.contacts && Array.isArray(data.family.contacts)) {
          onUpdateContacts(data.family.contacts);
        }
        if (data.family.settings) {
          onUpdateSettings({ ...settings, ...data.family.settings });
        }
        setCloudLoadMessage('🎉 Profil och kontakter laddades in framgångsrikt från molnet!');
        sounds.playReactionSound('magic');
      } else {
        setCloudLoadMessage(`ℹ️ Ingen sparad molnkopia hittades för "${emailToUse}".`);
      }
    } catch (err: any) {
      setCloudLoadMessage('⚠️ Kunde inte nå molnservern.');
    } finally {
      setIsCloudLoading(false);
    }
  };

  // JSON Export / Import
  const handleExportData = () => {
    const exportData = {
      contacts,
      settings,
      version: '2.0',
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snacka-backup-${settings.childName.toLowerCase()}.json`;
    a.click();
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed.contacts && Array.isArray(parsed.contacts)) {
        onUpdateContacts(parsed.contacts);
      }
      if (parsed.settings) {
        onUpdateSettings({ ...settings, ...parsed.settings });
      }
      setImportStatus('Data importerades framgångsrikt! 🎉');
      setImportJsonText('');
    } catch {
      setImportStatus('Kunde inte läsa formatet. Kontrollera att det är giltig JSON.');
    }
  };

  const shareablePairingLink = `${window.location.origin}?callTo=${encodeURIComponent(settings.childEmail)}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareablePairingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div id="parent-dashboard-container" className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Top Admin Header */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Föräldrakontroll
              </h1>
              <p className="text-xs text-slate-400">
                Inställningar för {settings.childName} ({settings.childEmail})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="parent-header-download-icon-btn"
              onClick={() => downloadAppIcon(512, 'snacka-app-icon-512.png')}
              className="px-3 py-2 rounded-2xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              title="Ladda ner app-ikonen (512x512 PNG) för PWABuilder"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Ladda ner Ikon 🖼️</span>
            </button>

            <button
              id="parent-open-install-btn"
              onClick={() => setShowInstallModal(true)}
              className="px-3 py-2 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              title="Installera appen på hemskärmen eller datorn"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Installera app 📲</span>
            </button>

            {onOpenOnboardingGuide && (
              <button
                id="parent-open-guide-btn"
                onClick={onOpenOnboardingGuide}
                className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all border border-slate-700"
                title="Öppna startguide"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Startguide</span>
              </button>
            )}

            <button
              id="exit-parent-mode-btn"
              onClick={onExitParentMode}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Barnläget</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Responsive Wrapping without horizontal scroll */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center gap-1.5 border-t border-slate-800/60 pt-2 pb-2">
          <button
            id="tab-contacts-btn"
            onClick={() => setActiveTab('contacts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'contacts' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kontakter ({contacts.length})</span>
          </button>

          <button
            id="tab-safety-btn"
            onClick={() => setActiveTab('safety')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'safety' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trygghet & Tider</span>
          </button>

          <button
            id="tab-sound-btn"
            onClick={() => setActiveTab('sound')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'sound' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ringsignal & Ljud 🎵</span>
          </button>

          <button
            id="tab-profile-btn"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'profile' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Profil & PIN</span>
          </button>

          <button
            id="tab-logs-btn"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'logs' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historik ({callLogs.length})</span>
          </button>

          <button
            id="tab-import-btn"
            onClick={() => setActiveTab('import_code')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'import_code' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Import/Export & Backup 💾</span>
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Contact Saved / Updated Toast */}
        {contactSavedToast && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-sm flex items-center justify-between shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              <span>{contactSavedToast}</span>
            </div>
            <button
              onClick={() => setContactSavedToast(null)}
              className="text-emerald-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-emerald-950/60"
            >
              Stäng ✕
            </button>
          </div>
        )}

        {/* TAB 1: CONTACTS MANAGEMENT */}
        {activeTab === 'contacts' && (
          <div className="flex flex-col gap-5">
            {/* Header info banner */}
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>Godkända kontakter</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                  Barnet ser kontaktens namn och avatar. Samtal kopplas tryggt via mailadressen.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="open-coparent-invite-btn"
                  onClick={() => setShowCoParentModal(true)}
                  className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95 transition-all"
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Andra föräldern 👨‍👩‍👧</span>
                </button>
                <button
                  id="open-qr-share-btn"
                  onClick={() => setShowQrModal(true)}
                  className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR-kod & Kompisar</span>
                </button>
                <button
                  id="add-new-contact-btn"
                  onClick={handleOpenAdd}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shrink-0 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lägg till Kontakt</span>
                </button>
              </div>
            </div>

            {/* Contacts Table / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  id={`parent-contact-row-${contact.id}`}
                  className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarDisplay
                      avatar={contact.avatar}
                      name={contact.name}
                      sizeClass="w-13 h-13"
                      textSizeClass="text-2xl"
                      className="bg-slate-800 border border-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">{contact.name}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                          {contact.relation}
                        </span>
                        {contact.isQuickDial && (
                          <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-bold">
                            Snabbval
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate">{contact.email}</p>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        ✓ Godkänd för samtal & röstmeddelanden
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id={`edit-contact-${contact.id}`}
                      onClick={() => handleOpenEdit(contact)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Redigera"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-contact-${contact.id}`}
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800/40 transition-colors"
                      title="Ta bort"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SAFETY & BEDTIME */}
        {activeTab === 'safety' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Whitelist Toggle */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Säkerhetsfilter</span>
              </h3>

              <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-sm font-bold text-slate-200 block">Strikt godkända kontakter</span>
                  <span className="text-xs text-slate-400">Blockera automatiskt alla inkommande samtal från okända adresser</span>
                </div>
                <input
                  id="toggle-strict-whitelist"
                  type="checkbox"
                  checked={settings.onlyAllowApprovedContacts}
                  onChange={(e) => onUpdateSettings({ ...settings, onlyAllowApprovedContacts: e.target.checked })}
                  className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-sm font-bold text-slate-200 block">Kameraåtkomst för barn</span>
                  <span className="text-xs text-slate-400">Kameran är inaktiverad för barnet (endast förälder kan ladda upp foton)</span>
                </div>
                <span className="text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 px-2.5 py-1 rounded-full">
                  Avstängd
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Maximal samtalslängd per samtal
                </label>
                <select
                  value={settings.maxCallDurationMinutes}
                  onChange={(e) => onUpdateSettings({ ...settings, maxCallDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value={10}>10 minuter</option>
                  <option value={20}>20 minuter</option>
                  <option value={30}>30 minuter</option>
                  <option value={60}>1 timme</option>
                  <option value={0}>Ingen begränsning</option>
                </select>
              </div>
            </div>

            {/* Bedtime Lock */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Moon className="w-4 h-4 text-amber-400" />
                <span>Sovtidslås (Nattläge)</span>
              </h3>

              <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-sm font-bold text-slate-200 block">Aktivera sovtidslås</span>
                  <span className="text-xs text-slate-400">Pausar alla samtal under natten</span>
                </div>
                <input
                  id="toggle-bedtime-lock"
                  type="checkbox"
                  checked={settings.bedtimeLockEnabled}
                  onChange={(e) => onUpdateSettings({ ...settings, bedtimeLockEnabled: e.target.checked })}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Lås från (kväll)</span>
                  </label>
                  <input
                    type="time"
                    value={settings.bedtimeStart}
                    onChange={(e) => onUpdateSettings({ ...settings, bedtimeStart: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Lås upp (morgon)</span>
                  </label>
                  <input
                    type="time"
                    value={settings.bedtimeEnd}
                    onChange={(e) => onUpdateSettings({ ...settings, bedtimeEnd: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-800/30 text-xs text-amber-200">
                🌙 När sovtidslåset är aktivt kan barnet inte ringa eller ta emot samtal.
              </div>
            </div>
          </div>
        )}

        {/* TAB: SOUND & RINGTONE SETTINGS */}
        {activeTab === 'sound' && (
          <div className="flex flex-col gap-6">
            {/* Top overview & Volume */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Music className="w-5 h-5 text-indigo-400" />
                  <span>Ringsignaler & Ljudinställningar</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Välj barnets standardsignal när samtal ringer in eller ut, och anpassa ljudvolymen.
                </p>
              </div>

              {/* Volume Slider */}
              <div className="bg-slate-950 px-4 py-3 rounded-2xl border border-slate-800 flex items-center gap-3 w-full sm:w-auto min-w-[240px]">
                <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span>Signalvolym</span>
                    <span className="text-indigo-300 font-mono">
                      {Math.round((settings.soundVolume || 0.8) * 100)}%
                    </span>
                  </div>
                  <input
                    id="parent-volume-slider"
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={settings.soundVolume || 0.8}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        soundVolume: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Ringtone Selection Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {RINGTONE_OPTIONS.map((opt) => {
                const isSelected = (settings.ringtone || 'marimba') === opt.id;
                const isPlaying = playingRingtoneId === opt.id;

                return (
                  <div
                    key={opt.id}
                    id={`parent-ringtone-card-${opt.id}`}
                    className={`bg-slate-900 p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${opt.color} flex items-center justify-center text-2xl shadow-xs shrink-0`}
                      >
                        {opt.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-white truncate">
                            {opt.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {opt.genre}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons: Listen + Set Default */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleToggleRingtonePreview(opt.id)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          isPlaying
                            ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Stopp</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Provlyssna</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (ringtoneStopRef.current) {
                            ringtoneStopRef.current();
                            ringtoneStopRef.current = null;
                            setPlayingRingtoneId(null);
                          }
                          onUpdateSettings({ ...settings, ringtone: opt.id });
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Aktiv Signal</span>
                          </>
                        ) : (
                          <span>Välj som signal</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* In-Call Soundboard FX Test Box */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Ljudbräda & Samtalsreaktioner</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ljudeffekter som barnet kan trycka på under röstsamtal:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-2">
                {[
                  { id: 'airhorn', label: 'Airhorn 📢' },
                  { id: 'victory', label: 'Level Up 🏆' },
                  { id: 'coin', label: '8-Bit Coin 🎮' },
                  { id: 'laser', label: 'Laser ⚡' },
                  { id: 'applause', label: 'Applåder 👏' },
                  { id: 'rimshot', label: 'Ba-Dum-Tss 🥁' },
                  { id: 'boom', label: 'Bass Boom 💥' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => sounds.playReactionSound(s.id as any)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition-all active:scale-95"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Ringing & System Push Notification Card */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Web Push-notiser & Standby-signal</span>
                      {notifPermission === 'granted' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Aktivt ✅
                        </span>
                      ) : notifPermission === 'denied' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Blockerad ❌
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Inte aktiverat ⚠️
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gör att telefonen automatiskt plingar till med en stor banner på låsskärmen så fort någon ringer – även när mobilen sover i standby.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={async () => {
                      const ok = await notificationService.sendTestNotification(settings.childEmail);
                      if (!ok) {
                        alert('Kunde inte skicka notis. Kontrollera att webbläsaren tillåter notiser.');
                      } else {
                        setNotifPermission('granted');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Testa signal direkt</span>
                  </button>

                  {onStartDelayedTestCall && (
                    <button
                      onClick={() => onStartDelayedTestCall(5)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Testa ring om 5s ⏱️</span>
                    </button>
                  )}

                  {notifPermission !== 'granted' && (
                    <button
                      onClick={async () => {
                        const ok = await notificationService.requestPermission(settings.childEmail);
                        setNotifPermission(ok ? 'granted' : 'denied');
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm shrink-0 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aktivera Web Push</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Standby Reliability Instructions & Tips */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-indigo-500/20 space-y-3">
                <h5 className="text-xs font-black text-indigo-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>Så säkerställer du att mobilen ringer varje gång i standby:</span>
                </h5>
                <ul className="text-xs text-slate-300 space-y-2 leading-relaxed list-disc list-inside">
                  <li>
                    <strong className="text-white">Android:</strong> Gå till <em>Inställningar &gt; Appar &gt; Snacka (eller Chrome) &gt; Batteri</em> och välj <strong className="text-emerald-400">"Obegränsad" (Unrestricted)</strong> så telefonens energisparläge inte stänger ner appen när skärmen släcks.
                  </li>
                  <li>
                    <strong className="text-white">iPhone / iPad (iOS):</strong> Öppna sidan i Safari, tryck på <strong>Dela-knappen</strong> och välj <strong className="text-emerald-400">"Lägg till på hemskärmen"</strong>. Öppna appen från hemskärmen och godkänn notiser.
                  </li>
                  <li>
                    <strong className="text-white">Låsskärm:</strong> Se till att <em>"Tillåt notiser på låsskärmen"</em> är påslaget i mobilens inställningar för webbläsaren / Snacka.
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                  <span className="text-xs font-black text-indigo-300 block mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    PWA / Hemskärm
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Installera appen på hemskärmen via Chrome/Safari för maximal stabilitet.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                  <span className="text-xs font-black text-indigo-300 block mb-1 flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5" />
                    Klickbart Svar
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ett tryck på "Svara" på låsskärmen öppnar och startar samtalet direkt.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                  <span className="text-xs font-black text-indigo-300 block mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ljud & Vibration
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Spelar upp vald ringsignal och vibrerar med kraftfullt mönster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CHILD PROFILE & PIN */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Child Profile Settings */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Barnets Uppgifter</span>
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Barnets Namn</label>
                <input
                  id="child-name-input"
                  type="text"
                  value={settings.childName}
                  onChange={(e) => onUpdateSettings({ ...settings, childName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Barnets Samtals-Mailadress</label>
                <input
                  id="child-email-input"
                  type="email"
                  value={settings.childEmail}
                  onChange={(e) => onUpdateSettings({ ...settings, childEmail: e.target.value.toLowerCase() })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                  placeholder="barn@familj.se"
                />
              </div>

              {/* Child Profile Photo / Avatar */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">Barnets Bild eller Avatar</label>
                
                <div className="flex items-center gap-4 mb-3">
                  <AvatarDisplay
                    avatar={settings.childAvatar}
                    name={settings.childName}
                    sizeClass="w-15 h-15"
                    textSizeClass="text-3xl"
                    className="bg-indigo-600 border border-indigo-400 rounded-2xl shadow-xs"
                  />
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => childFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Ladda upp foto på barnet</span>
                    </button>
                    <input
                      ref={childFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, true)}
                    />
                    <span className="text-[10px] text-slate-400">eller välj en emoji nedan:</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, childAvatar: emoji })}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all ${
                        settings.childAvatar === emoji
                          ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-105'
                          : 'bg-slate-950 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PIN Code & Parent Verification Settings */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Föräldra-PIN & Säkerhet</span>
                </h3>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>2-stegsskydd</span>
                </span>
              </div>

              {/* Co-Parent / Second Guardian Section */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Vårdnadshavare & Medförälder</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-full">
                    Gemensam PIN
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Primary Parent Tile */}
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Primär Vårdnadshavare</span>
                      <span className="text-xs font-bold text-white block truncate">{settings.parentEmail || 'Denna enhet'}</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-md shrink-0">
                      Aktiv ✓
                    </span>
                  </div>

                  {/* Second Parent Tile */}
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        {settings.secondParentRelation || 'Medförälder'}
                      </span>
                      <span className="text-xs font-bold text-white block truncate">
                        {settings.secondParentName || settings.secondParentEmail || 'Ej kopplad ännu'}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        settings.secondParentEmail
                          ? 'text-indigo-300 bg-indigo-950'
                          : 'text-slate-400 bg-slate-800'
                      }`}
                    >
                      {settings.secondParentEmail ? 'Kopplad 📲' : 'Frivillig'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="manage-coparent-btn"
                  onClick={() => setShowCoParentModal(true)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {settings.secondParentEmail
                      ? 'Hantera & Uppdatera Medförälder 👨‍👩‍👧'
                      : 'Koppla & Bjud in Andra Föräldern 👨‍👩‍👧'}
                  </span>
                </button>
              </div>

              {/* Verified Parent Email for 2FA and recovery */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Registrerad Föräldramejl (för återställning & verifiering)
                </label>
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="email"
                    value={settings.parentEmail || ''}
                    onChange={(e) => onUpdateSettings({ ...settings, parentEmail: e.target.value.toLowerCase() })}
                    placeholder="exempel@gmail.com"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono"
                  />
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-1 rounded-lg shrink-0">
                    Aktiv
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-500">
                    Koder skickas hit vid onboarding och PIN-återställning.
                  </span>
                  <button
                    type="button"
                    disabled={isSendingTestMail}
                    onClick={handleSendTestMail}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-[10px] flex items-center gap-1 shrink-0"
                  >
                    {isSendingTestMail ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Skickar...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>Skicka testkod</span>
                      </>
                    )}
                  </button>
                </div>

                {testMailStatus && (
                  <div className="p-2 rounded-xl bg-indigo-950/50 border border-indigo-800 text-[11px] text-indigo-200 flex items-center justify-between gap-2 animate-fadeIn">
                    <span>{testMailStatus}</span>
                    {testMailPreview && (
                      <a
                        href={testMailPreview}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline shrink-0"
                      >
                        <span>Öppna mejl</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleSavePin} className="flex flex-col gap-3 pt-1 border-t border-slate-800">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400">Ny 6-siffrig PIN</label>
                    <span className="text-[11px] text-slate-500 font-mono">Nuvarande: {settings.pin}</span>
                  </div>
                  <input
                    id="new-pin-input"
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="t.ex. 948271"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-base font-mono tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={newPin.length !== 6}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Spara ny 6-siffrig PIN</span>
                </button>

                {pinChangeSuccess && (
                  <p className="text-xs text-emerald-400 font-bold text-center animate-fadeIn">
                    ✓ PIN-koden har uppdaterats!
                  </p>
                )}
              </form>

              {/* Theme / Dark Mode Appearance Setting */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Färgtema & Mörkt läge</span>
                  <span className="text-[11px] text-slate-400">
                    Välj om appen ska använda ljust, mörkt läge eller automatiskt anpassa sig efter telefonen.
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, theme: 'system' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      (settings.theme || 'system') === 'system'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>Auto (System)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      settings.theme === 'light'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Ljust läge</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      settings.theme === 'dark'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-300" />
                    <span>Mörkt läge 🌙</span>
                  </button>
                </div>
              </div>

              <div className="mt-2 pt-4 border-t border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Säkerhetskopiera</span>
                    <span className="text-[10px] text-slate-500">Ladda ner kontakter & inställningar som fil</span>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportera JSON</span>
                  </button>
                </div>

                {/* Privacy Policy / Google Play compliance */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <div>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Integritetspolicy & Barnskydd
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Uppfyller Google Play Families & COPPA/GDPR-K
                    </span>
                  </div>
                  <button
                    type="button"
                    id="open-privacy-policy-btn"
                    onClick={() => setShowPrivacyModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition-colors"
                  >
                    <span>Läs policy 📄</span>
                  </button>
                </div>

                {/* Google Play Data Deletion Requirement */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <div>
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      Radera all användardata
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Nollställ kontakter, samtalshistorik och röstmeddelanden
                    </span>
                  </div>
                  <button
                    type="button"
                    id="reset-all-data-btn"
                    onClick={() => setShowResetConfirm(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-xs font-bold text-rose-300 flex items-center gap-1.5 transition-colors"
                  >
                    <span>Nollställ appen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CALL LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">Samtalshistorik</h3>
                <p className="text-xs text-slate-400">Ringda och mottagna röstsamtal</p>
              </div>
              {callLogs.length > 0 && (
                <button
                  onClick={onClearLogs}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                >
                  Rensa logg
                </button>
              )}
            </div>

            {callLogs.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {callLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AvatarDisplay
                        avatar={log.contactAvatar}
                        name={log.contactName}
                        sizeClass="w-10 h-10"
                        textSizeClass="text-xl"
                        className="bg-slate-800 border border-slate-700"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{log.contactName}</span>
                          {log.isGroupCall && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              👥 Gruppsamtal
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              log.direction === 'outgoing'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : log.direction === 'incoming'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : log.direction === 'blocked'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {log.direction === 'outgoing'
                              ? 'Ringde upp 📞'
                              : log.direction === 'incoming'
                              ? 'Tog emot 📲'
                              : log.direction === 'blocked'
                              ? 'Blockerat 🛑'
                              : 'Missat ⏳'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">{log.contactEmail}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-300 block font-mono">
                        {log.durationSeconds > 0
                          ? `${Math.floor(log.durationSeconds / 60)}m ${log.durationSeconds % 60}s`
                          : '0s'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                Inga samtal har loggats ännu.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: IMPORT / EXPORT & DIRECT PAIRING */}
        {activeTab === 'import_code' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cloud Backup & Sync Card (Highlighted) */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-indigo-900/60 p-6 rounded-3xl border-2 border-indigo-500/60 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 text-indigo-300 flex items-center justify-center text-2xl shadow-md">
                    ☁️
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>Säkerhetskopia & Molnsynkronisering</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold tracking-wide">
                        MOLNET ⚡
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-200/80">
                      Kopplad e-post: <strong className="text-white font-mono">{settings.parentEmail || 'Ingen angiven'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Spara dina kontakter, PIN-koder och inställningar i molnet. När du installerar appen på en ny enhet (t.ex. barnets surfplatta eller telefon) kan du logga in direkt med din e-post och få alla kontakter återställda på en sekund.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  id="parent-cloud-save-btn"
                  onClick={handleCloudBackupSave}
                  disabled={isCloudSaving}
                  className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 transition-all"
                >
                  {isCloudSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4 text-indigo-200" />
                  )}
                  <span>Spara säkerhetskopia till molnet ☁️</span>
                </button>

                <button
                  type="button"
                  id="parent-cloud-load-btn"
                  onClick={handleCloudBackupLoad}
                  disabled={isCloudLoading}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-50 border border-slate-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  {isCloudLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudDownload className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Hämta från molnet 📲</span>
                </button>
              </div>

              {/* Status messages */}
              {cloudSaveMessage && (
                <div className="p-3 bg-indigo-950/90 border border-indigo-700 rounded-2xl text-xs font-bold text-indigo-200 animate-fadeIn">
                  {cloudSaveMessage}
                </div>
              )}
              {cloudLoadMessage && (
                <div className="p-3 bg-slate-950/90 border border-emerald-500/60 rounded-2xl text-xs font-bold text-emerald-300 animate-fadeIn">
                  {cloudLoadMessage}
                </div>
              )}
            </div>

            {/* Direct Web Pairing Link */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Direktlänk för att ringa barnet</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Skicka denna länk till mormor, morfar eller vänner. När de klickar på länken från sin webbläsare ringer det direkt på barnets app här!
              </p>

              <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={shareablePairingLink}
                  className="bg-transparent text-xs text-slate-300 font-mono flex-1 outline-none truncate"
                />
                <button
                  onClick={copyShareLink}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Kopierad!' : 'Kopiera'}</span>
                </button>
              </div>
            </div>

            {/* Import JSON configuration */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Importera Backup (JSON)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Klistra in JSON-data för att återställa eller lägga till kontakter i klump.
              </p>

              <textarea
                rows={4}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"contacts": [...], "settings": {...}}'
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 outline-none"
              />

              <button
                onClick={handleImportJson}
                disabled={!importJsonText.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Importera Data</span>
              </button>

              {importStatus && (
                <p className="text-xs text-amber-300 font-medium text-center">
                  {importStatus}
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Contact Modal */}
      {(isAddingContact || isEditingContact) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 text-slate-100 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {isEditingContact ? 'Redigera Kontakt' : 'Lägg till Ny Godkänd Kontakt'}
              </h3>
              <button
                onClick={() => {
                  setIsAddingContact(false);
                  setIsEditingContact(null);
                }}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Avbryt ✕
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="flex flex-col gap-4">
              {contactFormError && (
                <div className="p-3 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-300 text-xs font-bold animate-fadeIn">
                  ⚠️ {contactFormError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Namn (t.ex. Mamma, Mormor, Leo)</label>
                <input
                  id="contact-name-input"
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => {
                    setContactForm({ ...contactForm, name: e.target.value });
                    if (contactFormError) setContactFormError(null);
                  }}
                  placeholder="Namn"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white font-bold text-sm outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  E-post eller Användarnamn (används för samtal)
                </label>
                <input
                  id="contact-email-input"
                  type="text"
                  required
                  value={contactForm.email}
                  onChange={(e) => {
                    setContactForm({ ...contactForm, email: e.target.value.toLowerCase() });
                    if (contactFormError) setContactFormError(null);
                  }}
                  placeholder="t.ex. mormor@gmail.com eller mormor"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white font-mono text-sm outline-none transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 Tips: Du kan ange en vanlig e-postadress (t.ex. gmail) eller ett unikt användarnamn.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Relation</label>
                  <select
                    value={contactForm.relation}
                    onChange={(e) => setContactForm({ ...contactForm, relation: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    {RELATIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kategori</label>
                  <select
                    value={contactForm.category || 'kompisar'}
                    onChange={(e) => setContactForm({ ...contactForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="familj">Familj 🏡</option>
                    <option value="kompisar">Kompisar 🚀</option>
                  </select>
                </div>
              </div>

              {/* Photo & Avatar Picker for Contact */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Kontaktens Bild / Avatar</label>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAvatarMode('emoji')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        avatarMode === 'emoji' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Emoji
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('upload')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        avatarMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Ladda upp Foto
                    </button>
                  </div>
                </div>

                {/* Preview current selected avatar */}
                <div className="flex items-center gap-3">
                  <AvatarDisplay
                    avatar={contactForm.avatar || '👦'}
                    name={contactForm.name || 'Kontakt'}
                    sizeClass="w-14 h-14"
                    textSizeClass="text-2xl"
                    className="bg-slate-800 border border-indigo-500 shadow-xs"
                  />

                  {avatarMode === 'upload' && (
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => contactFileInputRef.current?.click()}
                        className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Välj bild från dator/telefon</span>
                      </button>
                      <input
                        ref={contactFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, false)}
                      />
                      <p className="text-[10px] text-slate-400 mt-1 text-center">
                        Bilden sparas lokalt och syns i barnets kontaktlista.
                      </p>
                    </div>
                  )}

                  {avatarMode === 'emoji' && (
                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
                      {AVATAR_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setContactForm({ ...contactForm, avatar: em })}
                          className={`w-7 h-7 rounded-lg text-base flex items-center justify-center ${
                            contactForm.avatar === em ? 'bg-indigo-600 ring-1 ring-indigo-300 scale-105' : 'bg-slate-900'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Dial */}
              <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="contact-quickdial-check"
                  checked={contactForm.isQuickDial}
                  onChange={(e) => setContactForm({ ...contactForm, isQuickDial: e.target.checked })}
                  className="w-4 h-4 rounded accent-rose-500"
                />
                <label htmlFor="contact-quickdial-check" className="text-xs font-bold text-slate-200 cursor-pointer">
                  Visa som snabbval (högst upp i barnets app)
                </label>
              </div>

              {/* Custom Contact Ringtone (Optional) */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Speciell Ringsignal för denna kontakt (frivillig)
                </label>
                <select
                  value={contactForm.ringtone || ''}
                  onChange={(e) =>
                    setContactForm({
                      ...contactForm,
                      ringtone: (e.target.value as RingtoneType) || undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                >
                  <option value="">Använd standardsignal ({RINGTONE_OPTIONS.find((r) => r.id === (settings.ringtone || 'marimba'))?.name})</option>
                  {RINGTONE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.emoji} {r.name} ({r.genre})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Anteckning för barnet (frivillig)</label>
                <input
                  type="text"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  placeholder="t.ex. Alltid glad när du ringer!"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingContact(false);
                    setIsEditingContact(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Avbryt
                </button>
                <button
                  id="save-contact-submit-btn"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm"
                >
                  Spara Kontakt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Contact Modal with PIN authorization */}
      {showQrModal && (
        <QrContactShareModal
          settings={settings}
          onAddContactWithPinVerification={(newContact) => {
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
            onUpdateContacts([...contacts, contactToAdd]);
          }}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* Co-Parent / Second Guardian Modal */}
      {showCoParentModal && (
        <CoParentModal
          settings={settings}
          contacts={contacts}
          onUpdateSettings={onUpdateSettings}
          onAddContact={(newContact) => {
            const contactToAdd: Contact = {
              id: 'c_' + Date.now(),
              name: newContact.name || 'Pappa',
              email: (newContact.email || '').toLowerCase(),
              avatar: newContact.avatar || '🧔',
              color: 'from-blue-500 to-indigo-600',
              relation: (newContact.relation as any) || 'Pappa',
              category: 'familj',
              allowedCallType: 'voice_only',
              isFavorite: true,
              isQuickDial: true,
              status: 'online',
              notes: 'Medförälder',
            };
            onUpdateContacts([...contacts, contactToAdd]);
          }}
          onClose={() => setShowCoParentModal(false)}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Delete All Data Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-rose-900/60 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl text-white flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Nollställ all data?</h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Detta raderar alla kontakter, samtalshistorik och röstmeddelanden från denna enhet permanent enligt Google Plays integritetskrav.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Avbryt
              </button>
              <button
                type="button"
                id="confirm-reset-all-data-btn"
                onClick={() => {
                  setShowResetConfirm(false);
                  if (onResetAllData) {
                    onResetAllData();
                  }
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-xs"
              >
                Ja, radera allt
              </button>
            </div>
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
