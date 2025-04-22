"use client";
import React, { useEffect, useState } from "react";
import { getUserProjects } from "@/utils/supabaseProjects";

interface CurrentProjectLabelProps {
  userId: string;
  selectedProjectId: string | null;
  onOpenConfig?: () => void;
}

const CurrentProjectLabel: React.FC<CurrentProjectLabelProps> = ({ userId, selectedProjectId, onOpenConfig }) => {
  const [projectName, setProjectName] = useState<string>("");

  useEffect(() => {
    if (!userId || !selectedProjectId) {
      setProjectName("");
      return;
    }
    getUserProjects(userId).then((projects) => {
      const found = Array.isArray(projects) ? projects.find((p: any) => p.id === selectedProjectId) : null;
      setProjectName(found ? found.name : "");
    });
  }, [userId, selectedProjectId]);

  if (!selectedProjectId || !projectName) return null;

  return (
    <span
      className="inline-block px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-medium text-xs mr-4 align-middle cursor-pointer hover:bg-cyan-200 transition"
      style={{ lineHeight: '1.6', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      title={projectName}
      aria-label="Abrir configuração de projetos"
      onClick={onOpenConfig}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { onOpenConfig && onOpenConfig(); } }}
      role="button"
    >
      Projeto: {projectName}
    </span>
  );
};

export default CurrentProjectLabel;
