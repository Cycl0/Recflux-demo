import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_markdown/flutter_markdown.dart' as md;
import 'package:flutter/services.dart';
import 'package:markdown/markdown.dart' as markdown;

import '../models/chat_provider.dart';
import '../models/code_editor.dart';
import 'package:flutter_syntax_view/flutter_syntax_view.dart';
import '../utils/language_utils.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  String _selectedAction = 'GERAR';
  bool _showDiff = false;
  Map<String, dynamic>? _currentDiffData;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // Action selector
          Container(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                const Text(
                  'Modo: ',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButton<String>(
                    value: _selectedAction,
                    isExpanded: true,
                    items: const [
                      DropdownMenuItem(value: 'GERAR', child: Text('GERAR')),
                      DropdownMenuItem(value: 'EDITAR', child: Text('EDITAR')),
                      DropdownMenuItem(value: 'FOCAR', child: Text('FOCAR')),
                      DropdownMenuItem(value: 'CHAT', child: Text('CHAT')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _selectedAction = value;
                        });
                      }
                    },
                  ),
                ),
                const SizedBox(width: 16),
                IconButton(
                  icon: const Icon(Icons.delete_sweep),
                  tooltip: 'Clear Chat',
                  onPressed: () {
                    Provider.of<ChatProvider>(
                      context,
                      listen: false,
                    ).clearMessages();
                  },
                ),
              ],
            ),
          ),

          // Messages area
          Flexible(
            child: Consumer<ChatProvider>(
              builder: (context, chatProvider, child) {
                WidgetsBinding.instance.addPostFrameCallback(
                  (_) => _scrollToBottom(),
                );

                return chatProvider.messages.isEmpty
                    ? const Center(
                        child: Text('No messages yet. Start a conversation!'),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(8.0),
                        itemCount: chatProvider.messages.length,
                        itemBuilder: (context, index) {
                          final message = chatProvider.messages[index];
                          return MessageBubble(
                            key: ValueKey(message.id),
                            message: message,
                            onDiffTap: (diffData) {
                              setState(() {
                                _showDiff = true;
                                _currentDiffData = diffData;
                              });
                            },
                          );
                        },
                      );
              },
            ),
          ),

          // Diff viewer (when showing)
          if (_showDiff && _currentDiffData != null)
            Container(
              height: 300,
              padding: const EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                color: Colors.grey[900],
                border: Border(top: BorderSide(color: Colors.grey[800]!)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Code Diff',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.copy, color: Colors.white),
                            onPressed: () {
                              // Copy new code to clipboard
                              final codeProvider =
                                  Provider.of<CodeEditorProvider>(
                                    context,
                                    listen: false,
                                  );
                              if (codeProvider.currentFile != null) {
                                codeProvider.updateCurrentFile(
                                  _currentDiffData!['newCode'],
                                );
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Code updated in editor'),
                                  ),
                                );
                              }
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.white),
                            onPressed: () {
                              setState(() {
                                _showDiff = false;
                                _currentDiffData = null;
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  Expanded(child: _buildDiffView(_currentDiffData!)),
                ],
              ),
            ),

          // Message input
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 12.0,
              vertical: 8.0,
            ),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 20,
                  offset: const Offset(0, -10),
                ),
              ],
              border: Border(
                top: BorderSide(
                  color: Theme.of(context).dividerColor.withOpacity(0.5),
                  width: 1.0,
                ),
              ),
            ),
            child: SafeArea(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: const InputDecoration(
                        hintText: 'Ask AI anything...',
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 16.0,
                          vertical: 12.0,
                        ),
                      ),
                      keyboardType: TextInputType.multiline,
                      maxLines: 5,
                      minLines: 1,
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Consumer2<ChatProvider, CodeEditorProvider>(
                    builder: (context, chatProvider, codeProvider, child) {
                      return Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: chatProvider.isLoading
                              ? null
                              : () {
                                  final message = _messageController.text
                                      .trim();
                                  if (message.isNotEmpty) {
                                    chatProvider.sendMessage(
                                      context,
                                      message,
                                      _selectedAction,
                                      codeProvider.currentFile,
                                    );
                                    _messageController.clear();
                                  }
                                },
                          borderRadius: BorderRadius.circular(24.0),
                          child: Container(
                            padding: const EdgeInsets.all(12.0),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF4A90E2), Color(0xFF2C6EC9)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              shape: BoxShape.circle,
                              boxShadow: [
                                if (!chatProvider.isLoading)
                                  BoxShadow(
                                    color: Colors.blue.withOpacity(0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                              ],
                            ),
                            child: Icon(
                              Icons.send,
                              color: chatProvider.isLoading
                                  ? Colors.white.withOpacity(0.5)
                                  : Colors.white,
                              size: 24.0,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDiffView(Map<String, dynamic> diffData) {
    final oldCode = diffData['oldCode'] as String;
    final newCode = diffData['newCode'] as String;

    // Simplified diff view since diff_match_patch has API issues
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(4),
            color: Colors.red[900]!.withOpacity(0.3),
            child: const Text('- Old', style: TextStyle(color: Colors.white)),
          ),
          SyntaxView(
            code: oldCode,
            syntax: getSyntax(
              getLanguageFromExtension(diffData['fileExtension'] ?? '.js'),
            ),
            syntaxTheme: SyntaxTheme.dracula(),
            withZoom: false,
            withLinesCount: true,
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(4),
            color: Colors.green[900]!.withOpacity(0.3),
            child: const Text('+ New', style: TextStyle(color: Colors.white)),
          ),
          SyntaxView(
            code: newCode,
            syntax: getSyntax(
              getLanguageFromExtension(diffData['fileExtension'] ?? '.js'),
            ),
            syntaxTheme: SyntaxTheme.dracula(),
            withZoom: false,
            withLinesCount: true,
          ),
        ],
      ),
    );
  }
}

class MessageBubble extends StatefulWidget {
  final ChatMessage message;
  final Function(Map<String, dynamic>)? onDiffTap;

  const MessageBubble({super.key, required this.message, this.onDiffTap});

  @override
  State<MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<MessageBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.5), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _animationController,
            curve: Curves.easeOutCubic,
          ),
        );

    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isUser = widget.message.role == MessageRole.user;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    final bubbleGradient = isUser
        ? const LinearGradient(
            colors: [Color(0xFF4A90E2), Color(0xFF2C6EC9)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : LinearGradient(
            colors: isDarkMode
                ? [const Color(0xFF424242), const Color(0xFF303030)]
                : [const Color(0xFFF5F5F5), const Color(0xFFE0E0E0)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          );

    final textColor = isUser || isDarkMode ? Colors.white : Colors.black87;
    final iconColor = isUser || isDarkMode ? Colors.white70 : Colors.black54;
    final alignment = isUser ? Alignment.centerRight : Alignment.centerLeft;
    final icon = isUser ? Icons.person_outline : Icons.smart_toy_outlined;

    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: Align(
          alignment: alignment,
          child: Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.8,
            ),
            margin: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
            padding: const EdgeInsets.all(12.0),
            decoration: BoxDecoration(
              gradient: bubbleGradient,
              borderRadius: BorderRadius.circular(16.0),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 18, color: iconColor),
                    const SizedBox(width: 8),
                    Text(
                      isUser ? 'You' : 'AI',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: textColor,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (widget.message.isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(8.0),
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                  )
                else
                  _buildMessageContent(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMessageContent(BuildContext context) {
    final isUser = widget.message.role == MessageRole.user;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isUser || isDarkMode ? Colors.white : Colors.black87;

    // Constrain the content height and make it scrollable if it overflows
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight:
            MediaQuery.of(context).size.height * 0.7, // 70% of screen height
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            md.MarkdownBody(
              data: widget.message.content,
              styleSheet: md.MarkdownStyleSheet.fromTheme(Theme.of(context))
                  .copyWith(
                    p: TextStyle(color: textColor, fontSize: 15),
                    code: TextStyle(
                      backgroundColor: Colors.black.withOpacity(0.2),
                      color: textColor,
                      fontFamily: 'monospace',
                    ),
                    codeblockDecoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                  ),
              builders: {'pre': CodeBlockBuilder()},
            ),
            if (widget.message.diffData != null)
              Padding(
                padding: const EdgeInsets.only(top: 12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      constraints: const BoxConstraints(
                        maxHeight: 300,
                      ), // Max height for the code preview
                      child: SingleChildScrollView(
                        child: Text(
                          widget.message.diffData!['newCode'].toString(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontFamily: 'monospace',
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          icon: const Icon(Icons.compare_arrows),
                          label: const Text('View Diff'),
                          onPressed: () {
                            if (widget.onDiffTap != null) {
                              widget.onDiffTap!(widget.message.diffData!);
                            }
                          },
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          icon: const Icon(Icons.copy),
                          label: const Text('Apply to Editor'),
                          onPressed: () {
                            final codeProvider =
                                Provider.of<CodeEditorProvider>(
                                  context,
                                  listen: false,
                                );
                            final newCode =
                                widget.message.diffData!['newCode'] as String;

                            if (codeProvider.currentFile != null) {
                              codeProvider.updateCurrentFile(newCode);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Code updated in editor'),
                                ),
                              );
                            } else {
                              final fileExtension =
                                  widget.message.diffData!['fileExtension'] ??
                                  'js';
                              codeProvider.addFile(
                                'generated.$fileExtension',
                                newCode,
                                getLanguageFromExtension(fileExtension),
                              );
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('New file created in editor'),
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class CodeBlockBuilder extends md.MarkdownElementBuilder {
  @override
  Widget? visitElementAfter(dynamic element, TextStyle? preferredStyle) {
    String language = 'text';
    if (element.children != null && element.children.isNotEmpty) {
      final child = element.children.first;
      if (child is markdown.Element && child.tag == 'code') {
        language =
            child.attributes['class']?.replaceFirst('language-', '') ?? 'text';
      }
    }

    // --- TEMPORARY DEBUG LOGGING ---
    final syntax = getSyntax(language);
    print('--- CodeBlockBuilder DEBUG ---');
    print('Element Tag: ${element.tag}');
    print('Detected Language: "$language"');
    print('Resolved Syntax: $syntax');
    print('----------------------------');
    // --- END DEBUG LOGGING ---

    final codeContent = element.textContent;

    // Skip empty code blocks
    if (codeContent.trim().isEmpty) {
      return const SizedBox.shrink();
    }

    // This builder is used inside a MarkdownBody. We need to find the context.
    // The `element.root` should be the BuildContext.
    final context = element.root as BuildContext?;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      decoration: BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(8.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 16.0,
              vertical: 4.0,
            ),
            decoration: BoxDecoration(
              color: Colors.black54,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8.0),
                topRight: Radius.circular(8.0),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  language.toUpperCase(),
                  style: const TextStyle(color: Colors.white70, fontSize: 12.0),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(
                        Icons.copy,
                        color: Colors.white70,
                        size: 16,
                      ),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: codeContent));
                        if (context != null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Code copied!')),
                          );
                        }
                      },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 24,
                        minHeight: 24,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(
                        Icons.code,
                        color: Colors.white70,
                        size: 16,
                      ),
                      onPressed: () {
                        if (context == null) {
                          print('Could not get context from element');
                          return;
                        }

                        // Send to editor
                        final codeProvider = Provider.of<CodeEditorProvider>(
                          context,
                          listen: false,
                        );

                        if (codeProvider.currentFile != null) {
                          codeProvider.updateCurrentFile(codeContent);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Code updated in editor'),
                            ),
                          );
                        } else {
                          // Create new file with this content
                          codeProvider.addFile(
                            'generated.${getExtensionFromLanguage(language)}',
                            codeContent,
                            getLanguageFromExtension(
                              getExtensionFromLanguage(language),
                            ),
                          );
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('New file created in editor'),
                            ),
                          );
                        }
                      },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 24,
                        minHeight: 24,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          SyntaxView(
            code: codeContent,
            syntax: getSyntax(language),
            syntaxTheme: SyntaxTheme.dracula(),
            withZoom: false,
            withLinesCount: true,
          ),
        ],
      ),
    );
  }
}

// Helper functions for file extensions and languages
String getExtensionFromLanguage(String language) {
  switch (language.toLowerCase()) {
    case 'javascript':
      return 'js';
    case 'typescript':
      return 'ts';
    case 'python':
      return 'py';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'dart':
      return 'dart';
    default:
      return 'txt';
  }
}

String getLanguageFromExtension(String extension) {
  switch (extension.toLowerCase()) {
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'dart':
      return 'dart';
    default:
      return 'text';
  }
}

// Convert language string to Syntax enum
Syntax getSyntax(String language) {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
    case 'jsx':
    case 'react':
    case 'typescript':
    case 'ts':
    case 'json': // Fallback to JS
      return Syntax.JAVASCRIPT;
    case 'python':
    case 'py':
      return Syntax.PYTHON;
    case 'dart':
      return Syntax.DART;
    case 'java':
    case 'c':
    case 'cpp':
    case 'c++':
      return Syntax.JAVA; // Java syntax is similar to C-style languages
    case 'yaml':
    case 'html': // Fallback to YAML
    case 'xml': // Fallback to YAML
    case 'css': // Fallback to YAML
    case 'sql': // Fallback to YAML
    case 'bash': // Fallback to YAML
    case 'shell':
    case 'sh':
    case 'go':
      return Syntax.YAML; // YAML is a decent, neutral fallback
    default:
      return Syntax.JAVASCRIPT; // General fallback for other languages
  }
}
