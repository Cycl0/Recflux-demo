"use client";
import React, { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

interface ConfigProjectCreatorProps {
  userId: string;
  onProjectCreated: (project: any) => void;
}

const ConfigProjectCreator: React.FC<ConfigProjectCreatorProps> = ({ userId, onProjectCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("projects")
      .insert([{ user_id: userId, name, description }])
      .select()
      .single();
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onProjectCreated(data);
      setName("");
      setDescription("");
    }
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); handleCreate(); }}>
      <label className="font-medium text-gray-700">Nome do Projeto</label>
      <input
        className="w-full border rounded p-2 mb-1 focus:outline-cyan-500"
        placeholder="Digite o nome do projeto"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <label className="font-medium text-gray-700">Descrição (opcional)</label>
      <textarea
        className="w-full border rounded p-2 mb-1 focus:outline-cyan-500"
        placeholder="Adicione uma descrição para o projeto"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <button
        className="px-4 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-700 font-semibold mt-2"
        type="submit"
        disabled={loading}
      >
        {loading ? "Criando..." : "Criar Projeto"}
      </button>
    </form>
  );
};

export default ConfigProjectCreator;
