// src/components/PrenotaForm.jsx
import { useState } from "react";

export default function PrenotaForm({ piano, onSubmit }) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");

  const handleSubmit = () => {
    if (!nome || !cognome) return alert("Inserisci nome e cognome");
    onSubmit({ nome, cognome, piano });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-8 rounded-3xl w-[400px] text-white flex flex-col gap-4">
        <h2 className="text-xl font-bold text-center mb-4">
          Inserisci i tuoi dati
        </h2>
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="p-3 rounded-xl bg-zinc-800 text-white placeholder-gray-400"
        />
        <input
          type="text"
          placeholder="Cognome"
          value={cognome}
          onChange={(e) => setCognome(e.target.value)}
          className="p-3 rounded-xl bg-zinc-800 text-white placeholder-gray-400"
        />
        <button
          onClick={handleSubmit}
          className="bg-purple-600 hover:bg-purple-500 transition-all py-3 rounded-xl font-bold uppercase"
        >
          Inizia Chat
        </button>
      </div>
    </div>
  );
}
