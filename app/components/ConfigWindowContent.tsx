"use client";
import React, { useState, useRef } from "react";
import ProjectModal from "@/components/ProjectModal";
import ProjectSelector from "@/components/ProjectSelector";

interface ConfigWindowContentProps {
  userId: string;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  onProjectCreated: (project: any) => void;
  theme: string;
}

import EditProjectModal from "@/components/EditProjectModal";
import { updateProject, deleteProject, getUserProjects } from "@/utils/supabaseProjects";

const ConfigWindowContent = ({ userId, selectedProjectId, setSelectedProjectId, onProjectCreated, theme }) => {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const projectSelectorRef = useRef<any>(null);

  // Fetch projects for edit modal
  React.useEffect(() => {
    if (!userId) return;
    getUserProjects(userId).then(setProjects);
  }, [userId, showProjectModal, showEditModal]);

  React.useEffect(() => {
    if (selectedProjectId && projects.length) {
      const proj = projects.find(p => p.id === selectedProjectId);
      setEditingProject(proj || null);
    }
  }, [selectedProjectId, projects]);

  return (
    <div className="p-6 min-w-[340px] flex flex-col gap-6 bg-white/90 dark:bg-[#1a1d22]/80 backdrop-blur-md rounded-2xl">
      <h1 className="text-2xl font-bold mb-2 text-cyan-800 dark:text-cyan-200 drop-shadow">Configuração de Projetos</h1>
      <section className="bg-white/90 dark:bg-[#1a1d22]/80 backdrop-blur-md border border-cyan-200 dark:border-cyan-900 rounded-2xl shadow-xl p-4 flex flex-col gap-2 transition-colors duration-300">
        <h2 className="text-lg font-semibold mb-1 text-cyan-700 dark:text-cyan-300">Selecionar Projeto</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Escolha um projeto para editar ou visualizar.</p>
        <label className="block mb-1 font-medium text-left text-gray-900 dark:text-gray-200">Projeto</label>
        <div className="flex items-center gap-1">
          <div className="w-48 h-8 flex items-center">
            <ProjectSelector
              ref={projectSelectorRef}
              userId={userId}
              selectedProjectId={selectedProjectId}
              onSelect={setSelectedProjectId}
              className="w-full h-full"
            />
          </div>
          {selectedProjectId && (
            <button
              className="px-2 py-1 w-32 h-8 rounded bg-cyan-600 text-white hover:bg-cyan-700 text-lg flex items-center justify-center"
              onClick={() => setShowEditModal(true)}
              title="Editar ou Remover Projeto"
            >
              Editar
            </button>
          )}
        </div>
        {selectedProjectId && (() => {
          const proj = projects.find(p => p.id === selectedProjectId);
          return proj && proj.description ? (
            <div className="text-gray-500 italic text-sm mt-1 ml-1 truncate max-w-[90%]" title={proj.description}>
              {proj.description}
            </div>
          ) : null;
        })()}

      </section>
      <section className="bg-white/90 dark:bg-[#1a1d22]/80 backdrop-blur-md border border-cyan-200 dark:border-cyan-900 rounded-2xl shadow-xl p-4 flex flex-col gap-2 transition-colors duration-300">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-700 dark:text-cyan-300">Criar novo projeto</h2>
          <button
            className="px-3 py-1 rounded-xl bg-cyan-600 dark:bg-cyan-700 text-white font-semibold shadow hover:bg-cyan-700 dark:hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 transition-colors duration-200 mb-2"
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
              theme={theme}
            />
          )}
        </div>
      </section>
      {showEditModal && editingProject && (
        <EditProjectModal
          project={editingProject}
          onSave={async (updated) => {
            await updateProject(updated.id, updated.name, updated.description);
            if (projectSelectorRef.current?.refreshProjects) projectSelectorRef.current.refreshProjects();
            setShowEditModal(false);
            // Optionally update local state
            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
          }}
          onDelete={async (projectId) => {
            await deleteProject(projectId);
            setShowEditModal(false);
            setSelectedProjectId(null);
            if (projectSelectorRef.current?.refreshProjects) projectSelectorRef.current.refreshProjects();
          }}
          onClose={() => setShowEditModal(false)}
          theme={theme}
        />
      )}
    </div>
  );
};

export default ConfigWindowContent;
