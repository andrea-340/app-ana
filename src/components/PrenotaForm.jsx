import React, { useState } from "react";

export default function PrenotaForm({ piano, onSubmit, onClose }) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nome.trim() && cognome.trim()) {
      onSubmit({ nome, cognome, piano });
    } else {
      alert("Per favore, inserisci sia il nome che il cognome ✨");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-zinc-950 border border-purple-500/30 p-8 rounded-[2.5rem] w-full max-w-md relative shadow-[0_0_50px_rgba(168,85,247,0.15)]">
        
        {/* TASTO CHIUDI (LA X) */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors p-2 text-xl"
          title="Cambia piano"
        >
          ✕
        </button>

        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-[10px] uppercase tracking-[0.2em] text-purple-400 mb-4">
            Stai prenotando:
          </div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            {piano}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2 ml-4">
              Il tuo Nome
            </label>
            <input
              required
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Esempio: Maria"
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white outline-none focus:border-purple-500 transition-all placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2 ml-4">
              Il tuo Cognome
            </label>
            <input
              required
              type="text"
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              placeholder="Esempio: Rossi"
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white outline-none focus:border-purple-500 transition-all placeholder:text-zinc-700"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase text-xs tracking-[0.2em] hover:bg-purple-600 hover:text-white transition-all shadow-xl active:scale-95"
            >
              Conferma e Inizia Chat
            </button>
            <p className="text-[9px] text-zinc-600 text-center mt-4 uppercase tracking-widest">
              Cliccando confermi di voler iniziare il consulto
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
