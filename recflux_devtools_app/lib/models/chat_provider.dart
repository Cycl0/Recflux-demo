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

  // API configuration
  final String _apiHost = kIsWeb ? 'localhost' : '10.0.2.2';
  final String _apiPort = '3001';
  final String _apiEndpoint = '/api/agentic';

  // Debug API connection info
  void _printApiInfo() {
    print('API Connection: http://$_apiHost:$_apiPort$_apiEndpoint');
  }

  List<ChatMessage> get messages => _messages;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get userEmail => _userEmail;

  ChatProvider() {
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
    if (content.trim().isEmpty) return;

    // Get the latest user email from AuthService
    final authService = Provider.of<AuthService>(context, listen: false);
    final userEmail = authService.user?.email ?? 'test@example.com';

    // Print API connection info for debugging
    _printApiInfo();
    print('User email: $userEmail');

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

    print('Using streaming mode for API response');

    try {
      // Prepare request body - normalize email to lowercase
      final requestBody = {
        'prompt': content,
        'currentCode': selectedFile?.content ?? '',
        'fileName': selectedFile?.name ?? 'script.js',
        'actionType': actionType,
        'userEmail': userEmail
            .toLowerCase(), // Convert to lowercase to avoid case sensitivity issues
      };

      // Log the full request for debugging
      print('API Request URL: http://$_apiHost:$_apiPort$_apiEndpoint');
      print('API Request Body: ${jsonEncode(requestBody)}');

      final response = await http.post(
        Uri.parse('http://$_apiHost:$_apiPort$_apiEndpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      print('API Response status code: ${response.statusCode}');

      if (response.statusCode == 200) {
        // Get substring safely to avoid index out of bounds
        final previewLength =
            response.body.length > 100 ? 100 : response.body.length;
        print(
          'API Response body: ${response.body.substring(0, previewLength)}...',
        );

        // Try to parse the entire response as JSON first
        Map<String, dynamic> data;
        try {
          data = jsonDecode(response.body);
          print('Successfully parsed entire response as JSON');
        } catch (e) {
          print('Response is not valid JSON, treating as text: $e');
          // Handle as streaming text response
          final responseText = response.body;
          print(
            'Treating as text response of ${responseText.length} characters',
          );

          // Try to extract code blocks from the text response - more robust regex
          // First look for code blocks with language specifiers
          final RegExp codeBlockRegex = RegExp(
            r'```(?:json|js|javascript|dart|python|typescript|ts|html|css)?(?:\s*\n|\s*)([\s\S]*?)(?:\n\s*```|```)',
          );

          // Also look for any code blocks without language specifiers as a fallback
          final RegExp simpleCodeBlockRegex = RegExp(r'```([\s\S]*?)```');

          // Try with language specifier first, then fallback
          final match = codeBlockRegex.firstMatch(responseText) ??
              simpleCodeBlockRegex.firstMatch(responseText);

          Map<String, dynamic>? extractedData;
          if (match != null && match.groupCount >= 1) {
            try {
              final String codeBlock = match.group(1)!;
              print(
                'Found code block: ${codeBlock.substring(0, min(50, codeBlock.length))}...',
              );

              // Clean up the code block
              String cleanedBlock = codeBlock.trim();
              if (cleanedBlock.startsWith('```')) {
                cleanedBlock = cleanedBlock.substring(3);
                if (cleanedBlock.startsWith('json')) {
                  cleanedBlock = cleanedBlock.substring(4);
                }
                cleanedBlock = cleanedBlock.trim();
              }
              if (cleanedBlock.endsWith('```')) {
                cleanedBlock =
                    cleanedBlock.substring(0, cleanedBlock.length - 3).trim();
              }

              extractedData = jsonDecode(cleanedBlock);
              print(
                'Successfully parsed JSON from code block in text response',
              );

              // If we found a code block with valid JSON, use it but keep the rest of the response
              String textWithoutCodeBlock = responseText.replaceAll(
                match[0]!,
                '',
              );

              // Debug the extracted data
              print('Extracted data keys: ${extractedData!.keys.toList()}');

              // Create a new data object with the explanation and the extracted data
              data = {'explanation': textWithoutCodeBlock.trim()};

              // Copy all keys from extractedData to data
              extractedData.forEach((key, value) {
                data[key] = value;
              });

              // Debug the final data
              print('Final data keys: ${data.keys.toList()}');
            } catch (e) {
              print('Error parsing JSON from code block in text response: $e');
              // Fall back to treating as plain text
              data = {'explanation': responseText};
            }
          } else {
            print('No JSON code blocks found, looking for regular code blocks');
            // No JSON code blocks found, but still check for regular code blocks
            final RegExp anyCodeBlockRegex = RegExp(
              r'```(?:\w+)?\s*([\s\S]*?)```',
            );
            final codeMatch = anyCodeBlockRegex.firstMatch(responseText);

            // Make sure diffData is accessible in this scope
            Map<String, dynamic>? diffData;

            if (codeMatch != null && codeMatch.groupCount >= 1) {
              final String rawCode = codeMatch.group(1)!.trim();
              print(
                'Found raw code block: ${rawCode.substring(0, min(50, rawCode.length))}...',
              );

              // Extract the code and the explanation separately
              String textWithoutCode =
                  responseText.replaceAll(codeMatch[0]!, '').trim();

              data = {
                'explanation': textWithoutCode,
                'code': rawCode, // Add the code directly
              };

              print('Created data with explanation and direct code field');

              // Create diffData for direct code replacement if we have a selected file
              if (selectedFile != null) {
                print('Creating diffData for raw code block');
                // Store diffData directly in the data object so it's accessible later
                final newDiffData = {
                  'oldCode': selectedFile.content ?? '',
                  'newCode': rawCode,
                  'changes': [
                    {
                      'type': 'replace',
                      'startLine': 1,
                      'endLine': selectedFile.content.split('\n').length ?? 1,
                      'code': rawCode,
                      'description': 'Code replacement',
                    },
                  ],
                  'fileExtension': selectedFile.name.split('.').last ?? 'js',
                };

                // Store it both in the local variable and in the data object
                diffData = newDiffData;
                data['diffData'] = newDiffData;
              }
            } else {
              // No code blocks found at all, create a simple data structure
              data = {
                'explanation': responseText,
                // No changes array or code for streaming text response
              };
              print('No code blocks found in response');
            }
          }
        }

        // Find the loading message and update it
        final int loadingIndex = _messages.indexWhere(
          (m) => m.id == assistantMessage.id,
        );
        if (loadingIndex != -1) {
          String responseContent = '';
          Map<String, dynamic>? diffData;

          // Check if we have diffData in the data object
          if (data['diffData'] != null &&
              data['diffData'] is Map<String, dynamic>) {
            print('Found diffData in data object, using it');
            diffData = data['diffData'] as Map<String, dynamic>;
          }
          // Otherwise check if we have a code field that wasn't processed yet
          else if (data['code'] != null &&
              data['code'] is String &&
              selectedFile != null) {
            print('Found unprocessed code field, creating diffData');
            diffData = {
              'oldCode': selectedFile.content ?? '',
              'newCode': data['code'],
              'changes': [
                {
                  'type': 'replace',
                  'startLine': 1,
                  'endLine': selectedFile.content.split('\n').length ?? 1,
                  'code': data['code'],
                  'description': 'Code replacement',
                },
              ],
              'fileExtension': selectedFile.name.split('.').last ?? 'js',
            };
          }

          // For streaming text responses, just show the response directly
          String prefix = actionType == 'GERAR'
              ? '🚀 **Código Gerado:**\n\n'
              : actionType == 'EDITAR'
                  ? '✏️ **Edição:**\n\n'
                  : actionType == 'FOCAR'
                      ? '🎯 **Foco:**\n\n'
                      : '💬 **Resposta:**\n\n';

          // Check if we have a direct code field in the JSON response
          if (data['code'] != null && data['code'] is String) {
            print('Found direct code field in top-level JSON');
            responseContent =
                '$prefix${data['explanation'] ?? 'Código gerado com sucesso.'}';

            // Create diff data for direct code replacement
            if (selectedFile != null) {
              diffData = {
                'oldCode': selectedFile.content ?? '',
                'newCode': data['code'],
                'changes': [
                  {
                    'type': 'replace',
                    'startLine': 1,
                    'endLine': selectedFile.content.split('\n').length ?? 1,
                    'code': data['code'],
                    'description': 'Code replacement',
                  },
                ],
                'fileExtension': selectedFile.name.split('.').last ?? 'js',
              };
            }
          } else {
            responseContent = prefix + (data['explanation'] ?? '');
          }

          // Try to extract code blocks from the response if they exist
          // Skip this if we already found a code field
          if (diffData == null && data['explanation'] != null) {
            // More robust regex to handle ```json blocks with or without newlines
            final RegExp codeBlockRegex = RegExp(
              r'```(?:json)?(?:\s*\n|\s*)([\s\S]*?)(?:\n\s*```|```)',
            );
            final match = codeBlockRegex.firstMatch(data['explanation'] ?? '');

            if (match != null && match.groupCount >= 1) {
              try {
                // Try to parse the code block as JSON
                final String codeBlock = match.group(1)!;
                final previewLength = min(100, codeBlock.length);
                print(
                  'Found code block (${codeBlock.length} chars): ${codeBlock.substring(0, previewLength)}...',
                );

                // Clean up the code block - sometimes there are extra backticks or whitespace
                String cleanedBlock = codeBlock.trim();
                if (cleanedBlock.startsWith('```')) {
                  cleanedBlock = cleanedBlock.substring(3);
                  if (cleanedBlock.startsWith('json')) {
                    cleanedBlock = cleanedBlock.substring(4);
                  }
                  cleanedBlock = cleanedBlock.trim();
                }
                if (cleanedBlock.endsWith('```')) {
                  cleanedBlock =
                      cleanedBlock.substring(0, cleanedBlock.length - 3).trim();
                }

                print(
                  'Cleaned JSON block: ${cleanedBlock.substring(0, min(50, cleanedBlock.length))}...',
                );
                final jsonData = jsonDecode(cleanedBlock);
                print('Successfully parsed JSON from code block');

                // Check for direct code field first (highest priority)
                if (jsonData['code'] != null && jsonData['code'] is String) {
                  print('Found direct code field in JSON response');

                  // Create diff data for direct code replacement
                  diffData = {
                    'oldCode': selectedFile?.content ?? '',
                    'newCode': jsonData['code'],
                    'changes': [
                      {
                        'type': 'replace',
                        'startLine': 1,
                        'endLine':
                            selectedFile?.content.split('\n').length ?? 1,
                        'code': jsonData['code'],
                        'description': 'Code replacement',
                      },
                    ],
                    'fileExtension': selectedFile?.name.split('.').last ?? 'js',
                  };

                  // Format the response for direct code - don't include the code in the chat
                  // since we'll show it in the diff viewer
                  responseContent =
                      '$prefix${jsonData['explanation'] ?? 'Código gerado com sucesso.'}';
                }
                // Check for changes array as fallback
                else if (jsonData['changes'] != null &&
                    jsonData['changes'] is List &&
                    jsonData['changes'].isNotEmpty) {
                  print(
                    'Found changes array with ${jsonData['changes'].length} items',
                  );

                  // Debug the first change
                  if (jsonData['changes'].isNotEmpty) {
                    print('First change: ${jsonData['changes'][0]}');
                  }

                  // Create diff data for visualization
                  try {
                    // Check if we have a special case of replace all (startLine: 1, endLine: 999)
                    if (jsonData['changes'].length == 1 &&
                        jsonData['changes'][0]['type'] == 'replace' &&
                        jsonData['changes'][0]['startLine'] == 1 &&
                        (jsonData['changes'][0]['endLine'] == 999 ||
                            jsonData['changes'][0]['endLine'] >
                                (selectedFile?.content.split('\n').length ??
                                    1))) {
                      print('Found replace all change, using code directly');
                      final code = jsonData['changes'][0]['code'];
                      if (code != null && code is String) {
                        diffData = {
                          'oldCode': selectedFile?.content ?? '',
                          'newCode': code,
                          'changes': jsonData['changes'],
                          'fileExtension':
                              selectedFile?.name.split('.').last ?? 'js',
                        };
                      }
                    } else {
                      // Normal case - apply changes
                      diffData = {
                        'oldCode': selectedFile?.content ?? '',
                        'newCode': _applyChanges(
                          selectedFile?.content ?? '',
                          jsonData['changes'],
                        ),
                        'changes': jsonData['changes'],
                        'fileExtension':
                            selectedFile?.name.split('.').last ?? 'js',
                      };
                    }

                    print(
                      'DiffData created successfully with keys: ${diffData!.keys.toList()}',
                    );
                  } catch (e) {
                    print('Error applying changes: $e');
                    // If changes can't be applied, try to use the code field directly if available
                    if (jsonData['code'] != null &&
                        jsonData['code'] is String) {
                      print('Falling back to direct code replacement');
                      diffData = {
                        'oldCode': selectedFile?.content ?? '',
                        'newCode': jsonData['code'],
                        'changes': [
                          {
                            'type': 'replace',
                            'startLine': 1,
                            'endLine':
                                selectedFile?.content.split('\n').length ?? 1,
                            'code': jsonData['code'],
                            'description': 'Code replacement',
                          },
                        ],
                        'fileExtension':
                            selectedFile?.name.split('.').last ?? 'js',
                      };
                    }
                  }

                  // Format the response with changes details
                  responseContent =
                      '$prefix${jsonData['explanation'] ?? 'Mudanças aplicadas.'}';
                }
              } catch (e) {
                print('Error parsing JSON from code block: $e');
                // Just use the text response as is
              }
            }
          }

          // Final check - if we have a changes array but no diffData, create one
          if (diffData == null &&
              data['changes'] != null &&
              data['changes'] is List &&
              data['changes'].isNotEmpty &&
              selectedFile != null) {
            print('FINAL CHECK: Creating diffData from changes array');

            try {
              // Check if we have a special case of replace all (startLine: 1, endLine: 999)
              if (data['changes'].length == 1 &&
                  data['changes'][0]['type'] == 'replace' &&
                  data['changes'][0]['startLine'] == 1 &&
                  (data['changes'][0]['endLine'] == 999 ||
                      data['changes'][0]['endLine'] >
                          (selectedFile.content.split('\n').length ?? 1))) {
                print('Found replace all change, using code directly');
                final code = data['changes'][0]['code'];
                if (code != null && code is String) {
                  diffData = {
                    'oldCode': selectedFile.content ?? '',
                    'newCode': code,
                    'changes': data['changes'],
                    'fileExtension': selectedFile.name.split('.').last ?? 'js',
                  };
                }
              } else {
                // Normal case - apply changes
                diffData = {
                  'oldCode': selectedFile.content ?? '',
                  'newCode': _applyChanges(
                    selectedFile.content ?? '',
                    data['changes'],
                  ),
                  'changes': data['changes'],
                  'fileExtension': selectedFile.name.split('.').last ?? 'js',
                };
              }
              print('Created diffData from changes array');
            } catch (e) {
              print('Error creating diffData from changes array: $e');
            }
          }
          // If we have a code field but no diffData, create one
          else if (diffData == null &&
              data['code'] != null &&
              data['code'] is String &&
              selectedFile != null) {
            print('FINAL CHECK: Creating diffData from code field');
            diffData = {
              'oldCode': selectedFile.content ?? '',
              'newCode': data['code'],
              'changes': [
                {
                  'type': 'replace',
                  'startLine': 1,
                  'endLine': selectedFile.content.split('\n').length ?? 1,
                  'code': data['code'],
                  'description': 'Code replacement',
                },
              ],
              'fileExtension': selectedFile.name.split('.').last ?? 'js',
            };
          }

          // Create the message with the diffData
          _messages[loadingIndex] = ChatMessage(
            id: assistantMessage.id,
            role: MessageRole.assistant,
            content: responseContent,
            diffData: diffData,
            isLoading: false, // Make sure to set isLoading to false
          );

          // Debug the diffData to see what's happening
          if (diffData != null) {
            print('DiffData set: ${diffData.keys}');
            if (diffData['newCode'] != null) {
              print('New code length: ${diffData['newCode'].length}');
              print(
                'New code preview: ${diffData['newCode'].substring(0, (100 < diffData['newCode'].length) ? 100 : diffData['newCode'].length)}',
              );
            } else {
              print('Warning: newCode is null in diffData');
            }
          } else {
            print('Warning: No diffData was set');
          }
        }
      } else {
        // Handle error responses
        print('API Error: Status ${response.statusCode}');
        print('Response body: ${response.body}');

        Map<String, dynamic> errorData;
        try {
          errorData = jsonDecode(response.body);
          print('Error data parsed: ${errorData['error']}');
        } catch (e) {
          print('Failed to parse error response: $e');
          errorData = {
            'error': 'Erro de comunicação com a API',
            'explanation':
                'A API retornou um status ${response.statusCode} mas não foi possível ler o corpo do erro.',
          };
        }

        _error = errorData['explanation'] ??
            errorData['error'] ??
            'Erro desconhecido';

        print('Error set to: $_error');

        // Update the loading message with error
        final int loadingIndex = _messages.indexWhere(
          (m) => m.id == assistantMessage.id,
        );
        if (loadingIndex != -1) {
          String errorMessage;

          // Special handling for "User not found" error
          if (errorData['error'] == 'User not found') {
            errorMessage = '❌ Erro: Usuário não encontrado\n\n'
                'O usuário "$userEmail" não está registrado no banco de dados.\n'
                'Por favor, use uma conta de teste válida ou registre este email no sistema.';
          } else {
            errorMessage =
                '❌ Erro: ${errorData['error'] ?? 'Erro desconhecido'}\n\n'
                '${errorData['explanation'] ?? 'Não foi possível processar sua solicitação.'}';
          }

          _messages[loadingIndex] = ChatMessage(
            id: assistantMessage.id,
            role: MessageRole.assistant,
            content: errorMessage,
          );
        }
      }
    } catch (e) {
      _error = 'Erro ao enviar mensagem: $e';
      print('Exception in sendMessage: $e');

      // Update the loading message with error
      final int loadingIndex = _messages.indexWhere(
        (m) => m.id == assistantMessage.id,
      );
      if (loadingIndex != -1) {
        String errorMessage;

        if (e is FormatException) {
          errorMessage =
              '❌ Erro de formato: A resposta da API não está no formato JSON esperado.\n\n'
              'Isso geralmente acontece quando a API está retornando uma resposta em streaming em vez de JSON.\n\n'
              'Detalhes técnicos: $e';
        } else {
          errorMessage = '❌ Erro de conexão: $e';
        }

        _messages[loadingIndex] = ChatMessage(
          id: assistantMessage.id,
          role: MessageRole.assistant,
          content: errorMessage,
        );
      }
    } finally {
      // Make sure we reset loading state and notify listeners
      _isLoading = false;

      // Double check that we don't have any messages still in loading state
      final loadingIndex = _messages.indexWhere((m) => m.isLoading);
      if (loadingIndex != -1) {
        print('Warning: Found message still in loading state, fixing it');
        _messages[loadingIndex] = ChatMessage(
          id: _messages[loadingIndex].id,
          role: _messages[loadingIndex].role,
          content: _messages[loadingIndex].content,
          diffData: _messages[loadingIndex].diffData,
          isLoading: false,
        );
      }

      notifyListeners();
      print('Request completed, loading state reset');
    }
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
}
