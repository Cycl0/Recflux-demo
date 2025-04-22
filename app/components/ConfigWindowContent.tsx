"use client";
import React, { useState, useRef } from "react";
import ProjectModal from "@/components/ProjectModal";
import ProjectSelector from "@/components/ProjectSelector";

interface ConfigWindowContentProps {
  userId: string;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  onProjectCreated: (project: any) => void;
}

const ConfigWindowContent = ({ userId, selectedProjectId, setSelectedProjectId, onProjectCreated }) => {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const projectSelectorRef = useRef<any>(null);

  return (
    <div className="p-6 min-w-[340px] flex flex-col gap-6">
      <h1 className="text-2xl font-bold mb-2 text-cyan-800">Configuração de Projetos</h1>
      <section className="bg-white/60 rounded-lg shadow p-4 flex flex-col gap-2">
        <h2 className="text-lg font-semibold mb-1 text-cyan-700">Selecionar Projeto</h2>
        <p className="text-sm text-gray-600 mb-2">Escolha um projeto para editar ou visualizar.</p>
        <ProjectSelector
          ref={projectSelectorRef}
          userId={userId}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />
      </section>
      <section className="bg-white/60 rounded-lg shadow p-4 flex flex-col gap-2">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-700">Criar novo projeto</h2>
          <button
            className="px-3 py-1 rounded bg-cyan-600 text-white hover:bg-cyan-700 mb-2"
            onClick={() => setShowProjectModal(true)}
          >
            + Novo Projeto
          </button>
          {showProjectModal && (
            <ProjectModal
              userId={userId}
              onProjectCreated={proj => {
                setSelectedProjectId(proj.id);
                // Refresh project list before closing
                if (projectSelectorRef.current && typeof projectSelectorRef.current.refreshProjects === 'function') {
                  projectSelectorRef.current.refreshProjects();
                }
                // Ensure selection is visible in ProjectSelector
                setTimeout(() => {
                  onProjectCreated(proj);
                  setShowProjectModal(false);
                }, 100);
              }}
              onClose={() => setShowProjectModal(false)}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default ConfigWindowContent;
