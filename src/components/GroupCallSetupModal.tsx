import React, { useState } from 'react';
import { Phone, Users, X, Check, Sparkles } from 'lucide-react';
import { Contact } from '../types';
import { AvatarDisplay } from './AvatarDisplay';

interface GroupCallSetupModalProps {
  contacts: Contact[];
  onStartGroupCall: (selectedContacts: Contact[]) => void;
  onClose: () => void;
}

export const GroupCallSetupModal: React.FC<GroupCallSetupModalProps> = ({
  contacts,
  onStartGroupCall,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedContacts = contacts.filter((c) => selectedIds.includes(c.id));

  const handleStart = () => {
    if (selectedContacts.length === 0) return;
    onStartGroupCall(selectedContacts);
  };

  return (
    <div
      id="group-call-setup-modal"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold active:scale-95 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-left flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-1.5">
              <span>Ring Gruppsamtal</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Välj de personer du vill prata med samtidigt
            </p>
          </div>
        </div>

        {/* Selected participants preview bar */}
        {selectedContacts.length > 0 && (
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-500 shrink-0 uppercase tracking-wider">
              Valda ({selectedContacts.length}):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedContacts.map((c) => (
                <div
                  key={c.id}
                  className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-slate-800 shrink-0"
                >
                  <AvatarDisplay
                    avatar={c.avatar}
                    name={c.name}
                    sizeClass="w-5 h-5"
                    textSizeClass="text-xs"
                    className="rounded-lg"
                  />
                  <span>{c.name}</span>
                  <button
                    onClick={() => toggleSelect(c.id)}
                    className="text-slate-400 hover:text-rose-500 font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Selection Grid */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tryck på personerna du vill bjuda in:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-0.5">
            {contacts.map((contact) => {
              const isSelected = selectedIds.includes(contact.id);
              return (
                <button
                  key={contact.id}
                  id={`select-group-contact-${contact.id}`}
                  type="button"
                  onClick={() => toggleSelect(contact.id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-98 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-400 shadow-xs ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarDisplay
                      avatar={contact.avatar}
                      name={contact.name}
                      sizeClass="w-11 h-11"
                      textSizeClass="text-xl"
                      className="bg-slate-100 border border-slate-200 rounded-xl"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 text-sm block truncate">
                        {contact.name}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {contact.relation}
                      </span>
                    </div>
                  </div>

                  {/* Selection Checkmark */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-white transition-all shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 shadow-xs'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors"
          >
            Avbryt
          </button>

          <button
            id="start-group-call-btn"
            disabled={selectedContacts.length === 0}
            onClick={handleStart}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              selectedContacts.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-97 text-white shadow-emerald-500/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Phone className="w-4 h-4 fill-white" />
            <span>
              {selectedContacts.length <= 1
                ? 'Ring samtal'
                : `Ring alla (${selectedContacts.length} st)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
