"use client";
import React, { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

interface ProjectModalProps {
  userId: string;
  onProjectCreated: (project: any) => void;
  onClose: () => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ userId, onProjectCreated, onClose }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    if (!userId) {
      setError('Usuário não autenticado ou ID inválido. Faça login novamente.');
      setLoading(false);
      return;
    }
    // Buscar email do usuário autenticado
    const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !authUserData?.user?.email) {
      setError('Erro ao obter informações do usuário autenticado. Faça login novamente.');
      setLoading(false);
      return;
    }
    const userEmail = authUserData.user.email;
    // Buscar o id correto na tabela public.users usando o email
    const { data: customUser, error: customUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    if (customUserError || !customUser) {
      setError('Usuário não encontrado na base de dados.');
      setLoading(false);
      return;
    }
    const publicUserId = customUser.id;
    // Agora pode criar o projeto normalmente usando o id da tabela customizada
    console.log('DEBUG: Criando projeto para publicUserId:', publicUserId);
    const { data, error } = await supabase
      .from("projects")
      .insert([{ user_id: publicUserId, name, description }])
      .select()
      .single();
    setLoading(false);
    if (error) {
      setError('Erro ao criar projeto: ' + error.message);
    } else {
      onProjectCreated(data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg min-w-[320px]">
        <h2 className="text-xl font-bold mb-4">Criar Novo Projeto</h2>
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Project Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <textarea
          className="w-full border rounded p-2 mb-2"
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-700"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
