import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class CodeFile {
  String name;
  String content;
  String language;
  DateTime lastModified;

  CodeFile({
    required this.name,
    required this.content,
    required this.language,
    DateTime? lastModified,
  }) : this.lastModified = lastModified ?? DateTime.now();

  factory CodeFile.fromJson(Map<String, dynamic> json) {
    return CodeFile(
      name: json['name'],
      content: json['content'],
      language: json['language'],
      lastModified: DateTime.parse(json['lastModified']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'content': content,
      'language': language,
      'lastModified': lastModified.toIso8601String(),
    };
  }
}

class CodeEditorProvider with ChangeNotifier {
  String _code = '';
  List<CodeFile> _files = [];
  int _currentFileIndex = -1;
  bool _isLoading = false;
  String? _error;
  bool _isSaving = false;

  // Deployment state
  bool _isDeploying = false;
  String? _deploymentUrl;
  String? _screenshot;

  List<CodeFile> get files => _files;
  CodeFile? get currentFile =>
      _currentFileIndex >= 0 && _currentFileIndex < _files.length
          ? _files[_currentFileIndex]
          : null;
  int get currentFileIndex => _currentFileIndex;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isSaving => _isSaving;

  // Getters for deployment state
  bool get isDeploying => _isDeploying;
  String? get deploymentUrl => _deploymentUrl;
  String? get screenshot => _screenshot;

  CodeEditorProvider() {
    _loadFiles();
  }

  Future<void> _loadFiles() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final filesJson = prefs.getString('code_files');

      if (filesJson != null) {
        final List<dynamic> decoded = jsonDecode(filesJson);
        _files = decoded.map((f) => CodeFile.fromJson(f)).toList();
      } else {
        // Add a default file if none exist
        _files = [
          CodeFile(
            name: 'main.js',
            content: '// Write your code here\nconsole.log("Hello, world!");\n',
            language: 'javascript',
          ),
        ];
      }

      _currentFileIndex = _files.isEmpty ? -1 : 0;
    } catch (e) {
      _error = 'Failed to load files: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> saveFiles() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final filesJson = jsonEncode(_files.map((f) => f.toJson()).toList());
      await prefs.setString('code_files', filesJson);
    } catch (e) {
      _error = 'Failed to save files: $e';
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

  void updateCurrentFile(String content) {
    if (currentFile != null) {
      currentFile!.content = content;
      currentFile!.lastModified = DateTime.now();
      notifyListeners();
      saveFiles();
    }
  }

  void addFile(String name, String content, String language) {
    _files.add(CodeFile(name: name, content: content, language: language));
    _currentFileIndex = _files.length - 1;
    notifyListeners();
    saveFiles();
  }

  void renameFile(int index, String newName) {
    if (index >= 0 && index < _files.length) {
      _files[index].name = newName;
      notifyListeners();
      saveFiles();
    }
  }

  void deleteFile(int index) {
    if (index >= 0 && index < _files.length) {
      _files.removeAt(index);
      if (_currentFileIndex >= _files.length) {
        _currentFileIndex = _files.isEmpty ? -1 : _files.length - 1;
      }
      notifyListeners();
      saveFiles();
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
      final urlString =
          dotenv.env['DEPLOY_SERVICE_URL'] ?? 'http://localhost:3003/deploy';
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
      } else {
        _error = 'Deployment failed: ${response.body}';
      }
    } catch (e) {
      _error = 'An error occurred during deployment: $e';
    } finally {
      _isDeploying = false;
      notifyListeners();
    }
  }

  void setCode(String newCode) {
    if (_code != newCode) {
      _code = newCode;
      notifyListeners();
    }
  }
}
