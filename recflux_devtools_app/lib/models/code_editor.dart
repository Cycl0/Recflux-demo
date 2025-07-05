import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/config_utils.dart';

class Project {
  final String id;
  String name;
  String? description;
  final String userId;

  Project({
    required this.id,
    required this.name,
    this.description,
    required this.userId,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      userId: json['user_id'],
    );
  }
}

class CodeFile {
  final String id;
  String name;
  String content;
  final String projectId;
  DateTime lastModified;

  CodeFile({
    required this.id,
    required this.name,
    required this.content,
    required this.projectId,
    DateTime? lastModified,
  }) : lastModified = lastModified ?? DateTime.now();

  factory CodeFile.fromVersion(
      Map<String, dynamic> metadata, Map<String, dynamic> version) {
    return CodeFile(
      id: metadata['id'],
      name: metadata['name'],
      projectId: metadata['project_id'],
      content: version['code'] ?? '',
      lastModified: DateTime.parse(version['created_at']),
    );
  }
}

class CodeEditorProvider with ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;

  List<Project> _projects = [];
  Project? _currentProject;

  List<CodeFile> _files = [];
  int _currentFileIndex = -1;

  bool _isLoading = false;
  String? _error;

  // Deployment state
  bool _isDeploying = false;
  String? _deploymentUrl;
  String? _screenshot;

  List<Project> get projects => _projects;
  Project? get currentProject => _currentProject;
  List<CodeFile> get files => _files;
  CodeFile? get currentFile =>
      _currentFileIndex >= 0 && _currentFileIndex < _files.length
          ? _files[_currentFileIndex]
          : null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Getters for deployment state
  bool get isDeploying => _isDeploying;
  String? get deploymentUrl => _deploymentUrl;
  String? get screenshot => _screenshot;

  CodeEditorProvider() {
    fetchProjects();
  }

  String? _cachedUserId;

  Future<String?> get _userId async {
    if (_cachedUserId != null) return _cachedUserId;

    final authUser = _supabase.auth.currentUser;
    if (authUser?.email == null) return null;

    try {
      final userRecord = await _supabase
          .from('users')
          .select('id')
          .eq('email', authUser!.email!)
          .maybeSingle();

      _cachedUserId = userRecord?['id'];
      return _cachedUserId;
    } catch (e) {
      print('Error getting user ID: $e');
      return null;
    }
  }

  Future<void> fetchProjects() async {
    final userId = await _userId;
    if (userId == null) {
      _error = "User not authenticated. Please sign in first.";
      _isLoading = false;
      notifyListeners();
      return;
    }
    _isLoading = true;
    notifyListeners();

    try {
      print('Fetching projects for user: $userId');
      final response =
          await _supabase.from('projects').select().eq('user_id', userId);
      print('Found ${response.length} projects');

      _projects =
          (response as List).map((data) => Project.fromJson(data)).toList();

      print(
          'Projects loaded: ${_projects.map((p) => '${p.name} (${p.id})').join(', ')}');

      if (_projects.isNotEmpty) {
        await selectProject(_projects.first);
      }
    } catch (e) {
      _error = "Failed to fetch projects: $e";
      print('Error fetching projects: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Method to refresh projects when user signs in
  Future<void> refreshOnAuthChange() async {
    if (_supabase.auth.currentUser != null) {
      _cachedUserId = null; // Clear cache to get fresh user ID
      await fetchProjects();
    } else {
      _cachedUserId = null; // Clear cache
      _projects = [];
      _currentProject = null;
      _files = [];
      _currentFileIndex = -1;
      _error = null;
      notifyListeners();
    }
  }

  Future<void> selectProject(Project project) async {
    _currentProject = project;
    _files = [];
    _currentFileIndex = -1;
    notifyListeners();
    await _fetchFilesForProject(project.id);
  }

  Future<void> refreshCurrentProject() async {
    if (_currentProject != null) {
      print('Refreshing current project: ${_currentProject!.name}');
      // Clear current file index to force UI refresh
      _currentFileIndex = -1;
      notifyListeners();
      await _fetchFilesForProject(_currentProject!.id);
    }
  }

  Future<void> refreshAllProjects() async {
    print('Refreshing all projects');
    await fetchProjects();
  }

  Future<void> _fetchFilesForProject(String projectId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      print('Fetching files for project: $projectId');

      // First get all files for the project
      final filesResponse = await _supabase
          .from('files_metadata')
          .select('*')
          .eq('project_id', projectId);

      print('Found ${filesResponse.length} files for project');

      _files = [];

      // For each file, get the latest version
      for (final fileData in filesResponse) {
        print('Processing file: ${fileData['name']}');

        // Get the latest version for this file
        final versionsResponse = await _supabase
            .from('file_versions')
            .select('code, created_at, version')
            .eq('file_id', fileData['id'])
            .order('version', ascending: false)
            .limit(1);

        Map<String, dynamic> latestVersion;
        if (versionsResponse.isNotEmpty) {
          latestVersion = versionsResponse.first;
          print(
              'File ${fileData['name']} has version ${latestVersion['version']}');
        } else {
          latestVersion = {
            'code': '',
            'created_at': DateTime.now().toIso8601String(),
            'version': 0
          };
          print('File ${fileData['name']} has no versions');
        }

        final file = CodeFile.fromVersion(fileData, latestVersion);
        print(
            'Loaded file: ${file.name} with content length: ${file.content.length}');
        _files.add(file);
      }

      _currentFileIndex = _files.isEmpty ? -1 : 0;
      print('Current file index set to: $_currentFileIndex');
    } catch (e) {
      _error = "Failed to fetch files: $e";
      print('Error fetching files: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createProject(String name, {String? description}) async {
    final userId = await _userId;
    if (userId == null) return;
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _supabase.from('projects').insert({
        'name': name,
        'description': description,
        'user_id': userId,
      }).select();
      final newProject = Project.fromJson(response.first);
      _projects.add(newProject);
      await selectProject(newProject);
    } catch (e) {
      _error = "Failed to create project: $e";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setCurrentFileIndex(int index) {
    if (index >= -1 && index < _files.length) {
      _currentFileIndex = index;
      notifyListeners();
    }
  }

  Future<void> updateCurrentFileContent(String content) async {
    if (currentFile == null) return;
    final userId = await _userId;
    if (userId == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      print('Saving file: ${currentFile!.name} (${currentFile!.id})');
      print('Content length: ${content.length}');

      currentFile!.content = content;
      // Get the current highest version number for this file
      final currentVersions = await _supabase
          .from('file_versions')
          .select('version')
          .eq('file_id', currentFile!.id)
          .order('version', ascending: false)
          .limit(1);

      final nextVersion = currentVersions.isNotEmpty
          ? (currentVersions.first['version'] as int) + 1
          : 1;

      print('Creating version: $nextVersion');

      final result = await _supabase.from('file_versions').insert({
        'file_id': currentFile!.id,
        'code': content,
        'created_by': userId,
        'version': nextVersion
      });

      print('Version saved: $result');
      currentFile!.lastModified = DateTime.now();
    } catch (e) {
      _error = "Failed to save file: $e";
      print('Error saving file: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addFile(String name) async {
    if (currentProject == null) return;
    final userId = await _userId;
    if (userId == null) return;
    _isLoading = true;
    notifyListeners();

    try {
      // Create metadata
      final metadataResponse = await _supabase.from('files_metadata').insert({
        'project_id': currentProject!.id,
        'name': name,
      }).select();
      final newFileMetadata = metadataResponse.first;

      // Create initial version
      final versionResponse = await _supabase.from('file_versions').insert({
        'file_id': newFileMetadata['id'],
        'code': '// New file content',
        'created_by': userId,
        'version': 1
      }).select();

      final newFile =
          CodeFile.fromVersion(newFileMetadata, versionResponse.first);
      _files.add(newFile);
      _currentFileIndex = _files.length - 1;
    } catch (e) {
      _error = "Failed to add file: $e";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteFile(int index) async {
    if (index < 0 || index >= _files.length) return;
    _isLoading = true;
    notifyListeners();

    try {
      final fileId = _files[index].id;
      await _supabase.from('files_metadata').delete().eq('id', fileId);
      _files.removeAt(index);
      if (_currentFileIndex >= _files.length) {
        _currentFileIndex = _files.isEmpty ? -1 : _files.length - 1;
      }
    } catch (e) {
      _error = "Failed to delete file: $e";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearDeploymentData() {
    _deploymentUrl = null;
    _screenshot = null;
    notifyListeners();
  }

  Future<void> deployCode() async {
    if (currentFile == null) return;

    _isDeploying = true;
    _deploymentUrl = null;
    _screenshot = null;
    _error = null;
    notifyListeners();

    try {
      final apiHost = ConfigUtils.getApiHost();
      final urlString = 'http://$apiHost:3003/deploy';
      print('Deploying code to: $urlString');

      final url = Uri.parse(urlString);
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'reactCode': currentFile!.content}),
      );

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        _deploymentUrl = responseData['deploymentUrl'];
        _screenshot = responseData['screenshot'];
        print('Deployment successful: $_deploymentUrl');
      } else {
        _error = 'Deployment failed: ${response.body}';
        print('Deployment failed: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      _error = 'An error occurred during deployment: $e';
      print('Deployment error: $e');
    } finally {
      _isDeploying = false;
      notifyListeners();
    }
  }
}
