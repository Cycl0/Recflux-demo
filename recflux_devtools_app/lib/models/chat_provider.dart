import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'code_editor.dart';
import 'package:provider/provider.dart';
import 'auth_service.dart';
import 'package:uuid/uuid.dart';
import '../services/service_manager.dart';
import '../config/service_config.dart';

const _uuid = Uuid();

enum MessageRole { user, assistant, system }

class ChatMessage {
  final String id;
  final MessageRole role;
  final String content;
  final DateTime timestamp;
  final Map<String, dynamic>? diffData;
  final bool isLoading;

  ChatMessage({
    String? id,
    required this.role,
    required this.content,
    DateTime? timestamp,
    this.diffData,
    this.isLoading = false,
  })  : id = id ?? _uuid.v4(),
        timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role.toString().split('.').last,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        if (diffData != null) 'diffData': diffData,
        'isLoading': isLoading,
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'],
      role: MessageRole.values.firstWhere(
        (e) => e.toString() == 'MessageRole.${json['role']}',
        orElse: () => MessageRole.user,
      ),
      content: json['content'],
      timestamp: DateTime.parse(json['timestamp']),
      diffData: json['diffData'],
      isLoading: json['isLoading'] ?? false,
    );
  }
}

class ChatProvider with ChangeNotifier {
  List<ChatMessage> _messages = [];
  bool _isLoading = false;
  String? _error;
  String _userEmail = 'test@example.com'; // Default email for testing
  final AuthService _authService;
  final ServiceConfig _config;

  // Debug API connection info
  void _printApiInfo() {
    print('Using microservices configuration');
  }

  List<ChatMessage> get messages => _messages;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get userEmail => _userEmail;

  ChatProvider(this._authService, this._config) {
    // Initialize with environment variables if available
    final testEmail = dotenv.env['TEST_USER_EMAIL'];
    if (testEmail != null && testEmail.isNotEmpty) {
      _userEmail = testEmail;
    }
  }

  void addMessage(ChatMessage message) {
    _messages.add(message);
    notifyListeners();
  }

  void clearMessages() {
    _messages = [];
    notifyListeners();
  }

  Future<void> sendMessage(
    BuildContext context,
    String content,
    String actionType,
    CodeFile? selectedFile,
  ) async {
    // Use the microservices method instead
    await sendMessageWithMicroservices(
        context, content, actionType, selectedFile);
  }

  String _getActionMessage(String actionType) {
    switch (actionType) {
      case 'GERAR':
        return 'Código gerado com sucesso!';
      case 'EDITAR':
        return 'Edições aplicadas com sucesso!';
      case 'FOCAR':
        return 'Foco aplicado com sucesso!';
      case 'CHAT':
        return 'Resposta gerada com sucesso!';
      default:
        return 'Operação concluída!';
    }
  }

  String _formatChanges(List changes) {
    return changes.asMap().entries.map((entry) {
      final i = entry.key;
      final change = entry.value;
      return '${i + 1}. **${change['type'].toString().toUpperCase()}** na linha ${change['startLine']}${change['endLine'] != null && change['endLine'] != change['startLine'] ? '-${change['endLine']}' : ''}: ${change['description']}';
    }).join('\n');
  }

  String _applyChanges(String originalCode, List changes) {
    final lines = originalCode.split('\n');
    final totalLines = lines.length;

    // Print debug info
    print('Original code has ${lines.length} lines');
    print('Applying ${changes.length} changes');

    // Sort changes by line number in reverse order to maintain line positions
    final sortedChanges = List.from(changes)
      ..sort((a, b) => (b['startLine'] ?? 0) - (a['startLine'] ?? 0));

    for (final change in sortedChanges) {
      // Handle special case for replace all (endLine: 999)
      if (change['type'] == 'replace' &&
          change['startLine'] == 1 &&
          (change['endLine'] == 999 || change['endLine'] > totalLines)) {
        print('Handling replace all case');
        // Just replace the entire content
        if (change['code'] != null) {
          return change['code'];
        }
        continue;
      }

      final startLineIndex =
          (change['startLine'] ?? 1) - 1; // Convert to 0-based index
      final endLineIndex = (change['endLine'] ?? change['startLine'] ?? 1) - 1;

      switch (change['type']) {
        case 'insert':
          final insertLines = change['code'].toString().split('\n');
          lines.insertAll(startLineIndex, insertLines);
          break;
        case 'replace':
          final replaceLines = change['code'].toString().split('\n');
          final replaceCount = endLineIndex - startLineIndex + 1;
          lines.replaceRange(
            startLineIndex,
            startLineIndex + replaceCount,
            replaceLines,
          );
          break;
        case 'delete':
          final deleteCount = endLineIndex - startLineIndex + 1;
          lines.removeRange(startLineIndex, startLineIndex + deleteCount);
          break;
      }
    }

    return lines.join('\n');
  }

  /// Send message using microservices architecture
  Future<void> sendMessageWithMicroservices(
    BuildContext context,
    String content,
    String actionType,
    CodeFile? selectedFile,
  ) async {
    if (content.trim().isEmpty) return;

    // Get the latest user ID from AuthService
    final authService = Provider.of<AuthService>(context, listen: false);
    final userId = authService.supabaseUserId;
    final userEmail = authService.user?.email; // Get user email

    if (userId == null) {
      _error = 'User not authenticated. Please sign in again.';
      final loadingIndex = _messages.lastIndexWhere((m) => m.isLoading);
      if (loadingIndex != -1) {
        _messages[loadingIndex] = ChatMessage(
          id: _messages[loadingIndex].id,
          role: MessageRole.assistant,
          content: '❌ $_error',
        );
      }
      _isLoading = false;
      notifyListeners();
      return;
    }

    final userMessage = ChatMessage(role: MessageRole.user, content: content);
    final assistantMessage = ChatMessage(
      role: MessageRole.assistant,
      content: '',
      isLoading: true,
    );

    _messages.add(userMessage);
    _messages.add(assistantMessage);
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Use the ServiceManager to access the agentic service
      final serviceManager = ServiceManager();

      // Send structured query using microservices
      final responseContent = await serviceManager.agentic.executeAgenticAction(
        prompt: content,
        currentCode: selectedFile?.content ?? '',
        fileName: selectedFile?.name ?? 'script.js',
        actionType: actionType,
      );

      // Process the response
      String displayContent = responseContent;
      Map<String, dynamic>? diffData;

      // Try to parse as JSON if it looks like JSON
      if (responseContent.trim().startsWith('{') &&
          responseContent.trim().endsWith('}')) {
        try {
          final jsonData = jsonDecode(responseContent);

          if (jsonData.containsKey('explanation')) {
            displayContent = jsonData['explanation'];
          }

          // Always process the 'changes' block if it exists, to show code blocks
          if (jsonData.containsKey('changes')) {
            final changes = jsonData['changes'] as List;
            if (changes.isNotEmpty && selectedFile != null) {
              final newCode = _applyChanges(selectedFile.content, changes);

              diffData = {
                'oldCode': selectedFile.content,
                'newCode': newCode,
                'language': selectedFile.name.split('.').last,
              };

              // Only auto-apply changes if not a pure chat action
              if (actionType != 'CHAT') {
                final codeEditor =
                    Provider.of<CodeEditorProvider>(context, listen: false);
                codeEditor.updateFile(selectedFile.id, newCode);

                final actionMessage = _getActionMessage(actionType);
                displayContent =
                    '$actionMessage\n\n**Resumo das alterações:**\n${_formatChanges(changes)}';
              }
            }
          }
        } catch (e) {
          // If JSON parsing fails, use the raw content
          displayContent = responseContent;
        }
      }

      // Update the assistant message
      final loadingIndex =
          _messages.indexWhere((m) => m.id == assistantMessage.id);
      if (loadingIndex != -1) {
        _messages[loadingIndex] = ChatMessage(
          id: assistantMessage.id,
          role: MessageRole.assistant,
          content: displayContent,
          diffData: diffData,
          isLoading: false,
        );
      }

      // Log success
      print('Microservices request completed successfully');
    } catch (e) {
      _error = 'Erro ao enviar mensagem via microservices: $e';
      print('Exception in sendMessageWithMicroservices: $e');

      // Update the loading message with error
      final loadingIndex =
          _messages.indexWhere((m) => m.id == assistantMessage.id);
      if (loadingIndex != -1) {
        _messages[loadingIndex] = ChatMessage(
          id: assistantMessage.id,
          role: MessageRole.assistant,
          content: '❌ Erro de conexão com microservices: $e',
        );
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
