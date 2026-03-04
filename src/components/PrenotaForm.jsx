import React, { useState } from "react";

export default function PrenotaForm({ piano, onSubmit, onClose }) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [telefono, setTelefono] = useState(""); // <--- Aggiunto

  const handleSubmit = (e) => {
    e.preventDefault();
    // Verifichiamo che tutti i campi siano pieni
    if (nome.trim() && cognome.trim() && telefono.trim()) {
      onSubmit({ nome, cognome, telefono, piano });
    } else {
      alert("Completa tutti i campi per ricevere il consulto ✨");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-zinc-950 border border-purple-500/30 p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white p-2 text-xl"
        >
          ✕
        </button>

        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-[10px] uppercase tracking-widest text-purple-400 mb-4">
            Stai prenotando:
          </div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            {piano}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              required
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              className="w-1/2 bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white outline-none focus:border-purple-500 transition-all"
            />
            <input
              required
              type="text"
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              placeholder="Cognome"
              className="w-1/2 bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2 ml-4">
              Numero WhatsApp (Essenziale per la risposta)
            </label>
            <input
              required
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Esempio: 333 1234567"
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase text-xs tracking-widest hover:bg-purple-600 hover:text-white transition-all"
          >
            Conferma e Inizia Chat
          </button>
        </form>
      </div>
    </div>
  );
}
