import React, { useState } from "react";

interface EditProjectModalProps {
  project: { id: string; name: string; description?: string };
  onSave: (updated: { id: string; name: string; description: string }) => void;
  onDelete: (projectId: string) => void;
  onClose: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(project.name || "");
  const [description, setDescription] = useState(project.description || "");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-cyan-700">Editar Projeto</h2>
        <div className="mb-3">
          <label className="block text-sm font-semibold mb-1">Nome do Projeto</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-semibold mb-1">Descrição</label>
          <textarea
            className="w-full border rounded px-2 py-1"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            disabled={loading}
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button
            className="px-3 py-1 rounded bg-cyan-600 text-white hover:bg-cyan-700"
            onClick={async () => {
              setLoading(true);
              await onSave({ id: project.id, name, description });
              setLoading(false);
            }}
            disabled={loading || !name.trim()}
          >
            Salvar
          </button>
          <button
            className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-700 ml-auto"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
          >
            Remover Projeto
          </button>
        </div>
        {showConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] relative flex flex-col items-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Tem certeza que deseja remover este projeto?</h3>
              <p className="text-gray-700 mb-4 text-center">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-4">
                <button
                  className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                  onClick={async () => {
                    setLoading(true);
                    await onDelete(project.id);
                    setLoading(false);
                  }}
                  disabled={loading}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProjectModal;
