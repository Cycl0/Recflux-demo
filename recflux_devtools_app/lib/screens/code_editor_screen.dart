import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_code_editor/flutter_code_editor.dart';
import 'package:flutter_highlight/themes/monokai-sublime.dart';
import 'package:highlight/languages/dart.dart';
import 'package:highlight/languages/javascript.dart';
import 'package:highlight/languages/python.dart';
import 'package:highlight/languages/css.dart';
import 'package:highlight/languages/xml.dart';
import '../models/code_editor.dart';

class CodeEditorScreen extends StatefulWidget {
  const CodeEditorScreen({super.key});

  @override
  State<CodeEditorScreen> createState() => _CodeEditorScreenState();
}

class _CodeEditorScreenState extends State<CodeEditorScreen> {
  final Map<String, CodeController> _controllers = {};
  final TextEditingController _newFileNameController = TextEditingController();
  String _newFileLanguage = 'javascript';

  final Map<String, dynamic> _languageOptions = {
    'javascript': {'language': javascript, 'extension': '.js'},
    'dart': {'language': dart, 'extension': '.dart'},
    'python': {'language': python, 'extension': '.py'},
    'html': {'language': xml, 'extension': '.html'},
    'css': {'language': css, 'extension': '.css'},
  };

  @override
  void dispose() {
    _controllers.forEach((_, controller) => controller.dispose());
    _newFileNameController.dispose();
    super.dispose();
  }

  CodeController _getOrCreateController(CodeFile file) {
    if (!_controllers.containsKey(file.name)) {
      _controllers[file.name] = CodeController(
        text: file.content,
        language: _languageOptions[file.language]?['language'],
      );
    }
    return _controllers[file.name]!;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CodeEditorProvider>(
      builder: (context, codeProvider, child) {
        final currentFile = codeProvider.currentFile;

        return Scaffold(
          drawer: Drawer(
            child: Column(
              children: [
                DrawerHeader(
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                  ),
                  child: const Center(
                    child: Text(
                      'Files',
                      style: TextStyle(color: Colors.white, fontSize: 24),
                    ),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: codeProvider.files.length,
                    itemBuilder: (context, index) {
                      final file = codeProvider.files[index];
                      return ListTile(
                        title: Text(file.name),
                        subtitle: Text(
                          '${file.language} • ${_formatDate(file.lastModified)}',
                          style: const TextStyle(fontSize: 12),
                        ),
                        selected: codeProvider.currentFileIndex == index,
                        onTap: () {
                          codeProvider.setCurrentFileIndex(index);
                          Navigator.pop(context); // Close drawer
                        },
                        trailing: IconButton(
                          icon: const Icon(Icons.delete),
                          onPressed: () => _showDeleteConfirmation(
                            context,
                            index,
                            file.name,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          body: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(8.0),
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.menu),
                      tooltip: 'File Explorer',
                      onPressed: () {
                        Scaffold.of(context).openDrawer();
                      },
                    ),
                    Text(
                      currentFile?.name ?? 'No file selected',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.add),
                      tooltip: 'Create New File',
                      onPressed: () => _showNewFileDialog(context),
                    ),
                    if (currentFile != null)
                      IconButton(
                        icon: const Icon(Icons.save),
                        tooltip: 'Save',
                        onPressed: () {
                          final controller = _controllers[currentFile.name];
                          if (controller != null) {
                            codeProvider.updateCurrentFile(controller.text);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('File saved')),
                            );
                          }
                        },
                      ),
                  ],
                ),
              ),
              Expanded(
                child: currentFile == null
                    ? const Center(child: Text('No file selected'))
                    : CodeTheme(
                        data: CodeThemeData(styles: monokaiSublimeTheme),
                        child: SingleChildScrollView(
                          child: CodeField(
                            controller: _getOrCreateController(currentFile),
                          ),
                        ),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute}';
  }

  void _showNewFileDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Create New File'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _newFileNameController,
                decoration: InputDecoration(
                  labelText: 'File Name',
                  hintText:
                      'example${_languageOptions[_newFileLanguage]?['extension'] ?? '.js'}',
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _newFileLanguage,
                decoration: const InputDecoration(labelText: 'Language'),
                items: _languageOptions.keys.map((String language) {
                  return DropdownMenuItem<String>(
                    value: language,
                    child: Text(language),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _newFileLanguage = newValue;
                    });
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              child: const Text('Cancel'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: const Text('Create'),
              onPressed: () {
                final fileName = _newFileNameController.text.trim();
                if (fileName.isNotEmpty) {
                  final extension =
                      _languageOptions[_newFileLanguage]?['extension'] ?? '.js';
                  final fullFileName = fileName.endsWith(extension)
                      ? fileName
                      : '$fileName$extension';

                  final codeProvider = Provider.of<CodeEditorProvider>(
                    context,
                    listen: false,
                  );
                  codeProvider.addFile(fullFileName, '', _newFileLanguage);
                  _newFileNameController.clear();
                  Navigator.of(context).pop();
                }
              },
            ),
          ],
        );
      },
    );
  }

  void _showDeleteConfirmation(
    BuildContext context,
    int index,
    String fileName,
  ) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete File'),
          content: Text('Are you sure you want to delete "$fileName"?'),
          actions: [
            TextButton(
              child: const Text('Cancel'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: const Text('Delete'),
              onPressed: () {
                final codeProvider = Provider.of<CodeEditorProvider>(
                  context,
                  listen: false,
                );
                codeProvider.deleteFile(index);
                _controllers.remove(fileName);
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }
}
