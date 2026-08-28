import React from 'react';
import { UserPlus, X, PhoneCall } from 'lucide-react';
import { Contact } from '../types';
import { AvatarDisplay } from './AvatarDisplay';

interface AddParticipantModalProps {
  availableContacts: Contact[];
  onAddContact: (contact: Contact) => void;
  onClose: () => void;
}

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  availableContacts,
  onAddContact,
  onClose,
}) => {
  return (
    <div
      id="add-participant-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">Lägg till person</h2>
            <p className="text-xs text-slate-400">Bjud in någon till ert pågående samtal</p>
          </div>
        </div>

        {/* Available Contacts List */}
        <div className="flex flex-col gap-2 mt-1">
          {availableContacts.length > 0 ? (
            availableContacts.map((contact) => (
              <button
                key={contact.id}
                id={`add-in-call-contact-${contact.id}`}
                onClick={() => onAddContact(contact)}
                className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all group active:scale-98"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarDisplay
                    avatar={contact.avatar}
                    name={contact.name}
                    sizeClass="w-11 h-11"
                    textSizeClass="text-2xl"
                    className="bg-slate-800 border border-slate-700"
                  />
                  <div className="text-left min-w-0">
                    <span className="font-bold text-white text-sm block truncate group-hover:text-indigo-300 transition-colors">
                      {contact.name}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {contact.relation}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Ring in</span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/60 rounded-2xl border border-slate-800 p-4">
              Alla dina godkända kontakter är redan med i samtalet! 🎉
            </div>
          )}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs mt-1"
        >
          Stäng
        </button>
      </div>
    </div>
  );
};
