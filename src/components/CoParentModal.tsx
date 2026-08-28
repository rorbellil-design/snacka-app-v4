import React, { useState } from 'react';
import {
  Users,
  Mail,
  QrCode,
  Copy,
  Check,
  Send,
  Loader2,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Phone,
  X,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Contact, ParentSettings } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sendCoParentInvitation } from '../utils/parentEmailService';
import { sounds } from '../utils/audioEffects';

interface CoParentModalProps {
  settings: ParentSettings;
  contacts: Contact[];
  onUpdateSettings: (settings: ParentSettings) => void;
  onAddContact: (contact: Partial<Contact>) => void;
  onClose: () => void;
}

const CO_PARENT_AVATARS = ['🧔', '👩‍🦰', '👱‍♂️', '👱‍♀️', '👨‍🦱', '👩‍🦱', '👨‍🦳', '👩‍🦳', '🧑‍💼', '🦸‍♂️', '🦸‍♀️', '⭐'];

export const CoParentModal: React.FC<CoParentModalProps> = ({
  settings,
  contacts,
  onUpdateSettings,
  onAddContact,
  onClose,
}) => {
  const [parentName, setParentName] = useState(settings.secondParentName || 'Pappa Marcus');
  const [parentEmail, setParentEmail] = useState(settings.secondParentEmail || '');
  const [parentRelation, setParentRelation] = useState<'Pappa' | 'Mamma' | 'Vårdnadshavare' | 'Medförälder'>(
    settings.secondParentRelation || 'Pappa'
  );
  const [parentAvatar, setParentAvatar] = useState(settings.secondParentAvatar || '🧔');

  const [activeTab, setActiveTab] = useState<'email_invite' | 'qr_sync' | 'direct_link'>('email_invite');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ status: 'idle' | 'success' | 'error'; message?: string; previewUrl?: string }>({
    status: 'idle',
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [addedContactSuccess, setAddedContactSuccess] = useState(false);

  // Generate sync url
  const syncBaseUrl = window.location.origin;
  const syncUrl = `${syncBaseUrl}/?mode=parent_sync&childEmail=${encodeURIComponent(settings.childEmail)}&childName=${encodeURIComponent(settings.childName)}&secondParent=${encodeURIComponent(parentEmail)}`;

  // Check if contact already exists in child's contacts
  const existingContact = contacts.find(
    (c) => parentEmail && c.email.toLowerCase() === parentEmail.trim().toLowerCase()
  );

  const handleSendInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentEmail.trim()) return;

    setIsSending(true);
    setSendResult({ status: 'idle' });

    // Save updated settings
    onUpdateSettings({
      ...settings,
      secondParentName: parentName.trim(),
      secondParentEmail: parentEmail.trim().toLowerCase(),
      secondParentRelation: parentRelation,
      secondParentAvatar: parentAvatar,
      secondParentStatus: 'pending',
    });

    const res = await sendCoParentInvitation({
      secondParentEmail: parentEmail.trim().toLowerCase(),
      secondParentName: parentName.trim(),
      childName: settings.childName,
      invitingParentEmail: settings.parentEmail,
      pin: settings.pin,
      syncUrl,
    });

    setIsSending(false);
    if (res.success) {
      sounds.playReactionSound('magic');
      setSendResult({
        status: 'success',
        message: res.message,
        previewUrl: res.previewUrl,
      });
    } else {
      setSendResult({
        status: 'error',
        message: res.error || 'Kunde inte skicka inbjudan via e-post.',
      });
    }
  };

  const handleAddAsChildContact = () => {
    if (!parentName.trim() || !parentEmail.trim()) return;

    onAddContact({
      name: parentName.trim(),
      email: parentEmail.trim().toLowerCase(),
      avatar: parentAvatar,
      relation: parentRelation === 'Medförälder' || parentRelation === 'Vårdnadshavare' ? 'Annan' : parentRelation,
      category: 'familj',
      status: 'online',
      isFavorite: true,
      isQuickDial: true,
    });

    setAddedContactSuccess(true);
    sounds.playReactionSound('magic');
    setTimeout(() => setAddedContactSuccess(false), 4000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopiedLink(true);
    sounds.playReactionSound('magic');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      id="coparent-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-5 sm:p-7 text-slate-100 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Koppla & Bjud in Andra Föräldern 👨‍👩‍👧
              </h2>
              <p className="text-xs text-slate-400">
                Ge båda vårdnadshavarna föräldrakontroll & snabbkontakt med {settings.childName}
              </p>
            </div>
          </div>
          <button
            id="close-coparent-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security & Multi-Parent Info Pill */}
        <div className="bg-indigo-950/40 border border-indigo-800/60 p-3.5 rounded-2xl flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-200 leading-relaxed">
            <span className="font-bold text-white block mb-0.5">Hur fungerar två vårdnadshavare?</span>
            Båda föräldrarna kan ha appen installerad på sina egna mobiler. Ni delar samma 6-siffriga föräldra-PIN (<span className="font-mono font-bold text-amber-300">{settings.pin}</span>) och godkända kontakter synkroniseras automatiskt.
          </div>
        </div>

        {/* Form: Second Parent Info */}
        <form onSubmit={handleSendInviteEmail} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Medförälderns Namn</label>
              <input
                id="coparent-name-input"
                type="text"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="t.ex. Pappa Marcus"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Relation till barnet</label>
              <select
                id="coparent-relation-select"
                value={parentRelation}
                onChange={(e) => setParentRelation(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-indigo-500 outline-none"
              >
                <option value="Pappa">Pappa 👨</option>
                <option value="Mamma">Mamma 👩</option>
                <option value="Vårdnadshavare">Vårdnadshavare 🛡️</option>
                <option value="Medförälder">Medförälder 🤝</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Medförälderns E-postadress</label>
            <input
              id="coparent-email-input"
              type="email"
              required
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value.toLowerCase())}
              placeholder="t.ex. marcus@familjen.se"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-indigo-500 outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Används för samtalsidentifiering och inbjudningsmejl med direkt synkroniseringslänk.
            </span>
          </div>

          {/* Avatar selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Avatar / Ikon</label>
            <div className="flex items-center gap-2 flex-wrap">
              {CO_PARENT_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setParentAvatar(emoji)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                    parentAvatar === emoji
                      ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-105'
                      : 'bg-slate-950 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Action: Add as Contact in Child's Phone */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarDisplay
                avatar={parentAvatar}
                name={parentName}
                sizeClass="w-9 h-9"
                textSizeClass="text-lg"
                className="bg-indigo-600 border border-indigo-400 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">
                  {existingContact ? '✓ Finns redan som kontakt för barnet' : `Lägg till ${parentName} på barnets hemskärm`}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {existingContact ? 'Barnet har redan en ring-knapp för denna förälder.' : 'Ger barnet en stor snabbvalsknapp under Familj.'}
                </span>
              </div>
            </div>

            {!existingContact && (
              <button
                type="button"
                id="add-coparent-as-contact-btn"
                onClick={handleAddAsChildContact}
                disabled={!parentEmail.trim() || addedContactSuccess}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-all active:scale-95"
              >
                {addedContactSuccess ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>{addedContactSuccess ? 'Tillagd! ✓' : 'Lägg till nu'}</span>
              </button>
            )}
          </div>

          {/* Sharing Tabs */}
          <div className="border-t border-slate-800 pt-3">
            <div className="text-xs font-bold text-slate-300 mb-2">Välj hur du vill koppla föräldern:</div>
            
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('email_invite')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'email_invite' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Skicka mejl</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('qr_sync')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'qr_sync' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Visa QR-kod</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('direct_link')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'direct_link' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Kopiera länk</span>
              </button>
            </div>

            {/* TAB 1: Send Email Invite */}
            {activeTab === 'email_invite' && (
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  id="send-coparent-invite-btn"
                  disabled={isSending || !parentEmail.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Skickar vårdnadshavar-inbjudan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Skicka Inbjudan till {parentEmail || 'medföräldern'}</span>
                    </>
                  )}
                </button>

                {sendResult.status === 'success' && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-300 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{sendResult.message || 'Inbjudan skickad!'}</span>
                    </div>
                    {sendResult.previewUrl && (
                      <a
                        href={sendResult.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-200 underline hover:text-white shrink-0"
                      >
                        <span>Öppna mejl</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {sendResult.status === 'error' && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-2xl text-xs text-rose-300 animate-fadeIn">
                    {sendResult.message}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: QR Sync */}
            {activeTab === 'qr_sync' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-white rounded-2xl shadow-md inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      syncUrl
                    )}&color=0f172a&bgcolor=ffffff&margin=4`}
                    alt="Vårdnadshavar QR-kod"
                    className="w-40 h-40 rounded-xl"
                  />
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white block">Skanna med andra förälderns telefonkamera</span>
                  Öppnar direkt appen med {settings.childName}s profil och synkade kontakter.
                </div>
              </div>
            )}

            {/* TAB 3: Direct Link */}
            {activeTab === 'direct_link' && (
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] text-slate-400">
                  Skicka länken via SMS, WhatsApp eller Signal:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={syncUrl}
                    className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 flex-1 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Kopierad!' : 'Kopiera'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
