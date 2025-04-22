"use client";
import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getUserProjects } from "@/utils/supabaseProjects";

interface ProjectSelectorProps {
  userId: string;
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

const ProjectSelector = forwardRef<any, ProjectSelectorProps>(({ userId, selectedProjectId, onSelect }, ref) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    getUserProjects(userId)
      .then((projects) => {
        setProjects(projects);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Defensive: always use an array
  const safeProjects = Array.isArray(projects) ? projects : [];
  console.log("[ProjectSelector] Rendering with projects:", safeProjects);

  // Ensure the last created project is selected if none is selected
  useEffect(() => {
    if (safeProjects.length > 0 && (!selectedProjectId || !safeProjects.some(p => p.id === selectedProjectId))) {
      onSelect(safeProjects[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeProjects.length]);

  useImperativeHandle(ref, () => ({
    refreshProjects: fetchProjects,
  }));

  // Ensure the last created project is selected if none is selected
  useEffect(() => {
    if (safeProjects.length > 0 && (!selectedProjectId || !safeProjects.some(p => p.id === selectedProjectId))) {
      onSelect(safeProjects[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeProjects.length]);

  return (
    <div className="mb-2">
      <label className="block mb-1 font-medium">Project</label>
      {loading ? (
        <div>Loading projects...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : safeProjects.length > 0 ? (
        <select
          className="w-full border rounded p-2"
          value={safeProjects.some(p => p.id === selectedProjectId) ? selectedProjectId : ''}
          onChange={e => onSelect(e.target.value)}
        >
          <option value="">Select a project</option>
          {safeProjects.map((proj) => (
            <option key={proj.id} value={proj.id}>{proj.name}</option>
          ))}
        </select>
      ) : (
        <div className="text-gray-500">Nenhum projeto encontrado.</div>
      )}
    </div>
  );
});

export default ProjectSelector;
