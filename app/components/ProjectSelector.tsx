"use client";
import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import Select from 'react-select';
import { getUserProjects } from "@/utils/supabaseProjects";

interface ProjectSelectorProps {
  userId: string;
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  className?: string;
}

const ProjectSelector = forwardRef<any, ProjectSelectorProps>(({ userId, selectedProjectId, onSelect, className }, ref) => {
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
    <div>
      {loading ? (
        <span>Carregando...</span>
      ) : error ? (
        <span className="text-red-600">Erro: {error}</span>
      ) : safeProjects.length > 0 ? (
        <Select
          classNamePrefix="project-select"
          className={`w-full ${className || ''}`}
          isSearchable={false}
          isDisabled={safeProjects.length === 0}
          value={safeProjects.find(p => p.id === selectedProjectId) ? { value: selectedProjectId, label: safeProjects.find(p => p.id === selectedProjectId)?.name } : null}
          onChange={opt => onSelect(opt?.value)}
          options={safeProjects.map(p => ({ value: p.id, label: p.name }))}
          placeholder="Nenhum projeto"
          menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
          styles={{
            menuPortal: base => ({ ...base, zIndex: 2147483647 }),
            control: (provided, state) => ({
              ...provided,
              background: state.isFocused ? 'rgba(186,230,253,0.35)' : 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: state.isFocused ? '2px solid rgba(34,211,238,0.30)' : '1.5px solid rgba(14,116,144,0.13)',
              boxShadow: state.isFocused ? '0 4px 32px 0 rgba(34,211,238,0.18)' : '0 2px 12px 0 rgba(14,116,144,0.10)',
              color: '#0e7490',
              borderRadius: '0.75rem',
              minHeight: '38px',
              minWidth: '180px',
              transition: 'all 0.2s',
              fontSize: '1rem',
              paddingLeft: 0,
              paddingRight: 0,
            }),
            singleValue: (provided) => ({
              ...provided,
              color: '#0e7490',
              fontWeight: 500,
            }),
            menu: (provided) => ({
              ...provided,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '0.75rem',
              boxShadow: '0 8px 32px 0 rgba(34,211,238,0.10)',
              marginTop: 2,
            }),
            option: (provided, state) => ({
              ...provided,
              background: state.isSelected
                ? 'rgba(186,230,253,0.45)'
                : state.isFocused
                ? 'rgba(186,230,253,0.22)'
                : 'transparent',
              color: '#0e7490',
              fontWeight: state.isSelected ? 700 : 400,
              cursor: 'pointer',
            }),
            placeholder: (provided) => ({
              ...provided,
              color: '#7dd3fc',
            }),
            input: (provided) => ({
              ...provided,
              color: '#0e7490',
            }),
            dropdownIndicator: (provided, state) => ({
              ...provided,
              color: state.isFocused ? '#22d3ee' : '#0e7490',
              transition: 'color 0.2s',
            }),
            indicatorSeparator: () => ({ display: 'none' }),
          }}
        />
      ) : (
        <div className="text-gray-500">Nenhum projeto encontrado.</div>
      )}
    </div>
  );
});

export default ProjectSelector;
