import { supabase } from './supabaseClient';

// Create a new project for a user
export async function createProject(userId: string, name: string, description?: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ user_id: userId, name, description }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Fetch all projects for a user
export async function getUserProjects(userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Save or update a file for a project
export async function saveProjectFile(projectId: string, name: string, code: string) {
  // Check if file exists
  const { data: existing, error: fetchError } = await supabase
    .from('files_metadata')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', name)
    .single();
  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
  let fileId;
  if (existing) {
    // Update
    const { data: updated, error: updateError } = await supabase
      .from('files_metadata')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateError) throw updateError;
    fileId = updated.id;
  } else {
    // Insert
    const { data: inserted, error: insertError } = await supabase
      .from('files_metadata')
      .insert([{ project_id: projectId, name }])
      .select()
      .single();
    if (insertError) throw insertError;
    fileId = inserted.id;
  }
  return fileId;
}

// Update a project's name and description
export async function updateProject(projectId: string, name: string, description: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete a project by id
export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  if (error) throw error;
  return true;
}

// Save a new file version for a file
export async function saveFileVersion(fileId: string, last_prompt: string, code: string, version: number, createdBy?: string) {
  const { data, error } = await supabase
    .from('file_versions')
    .insert([{ file_id: fileId, last_prompt, code, version, created_by: createdBy }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
