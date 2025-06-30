import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_code_editor/flutter_code_editor.dart';
import 'package:flutter_highlight/themes/monokai-sublime.dart';
import 'package:highlight/languages/javascript.dart';
import 'package:highlight/languages/dart.dart';
import 'package:highlight/languages/python.dart';
import 'package:highlight/languages/go.dart';
import 'package:highlight/languages/java.dart';
import 'package:highlight/languages/cpp.dart';
import 'package:highlight/languages/htmlbars.dart';
import 'package:highlight/languages/css.dart';
import 'package:flutter_syntax_view/flutter_syntax_view.dart' as syntax_view;
import '../models/code_editor.dart';
import '../utils/language_utils.dart';

class CodeEditorScreen extends StatefulWidget {
  const CodeEditorScreen({Key? key}) : super(key: key);

  @override
  _CodeEditorScreenState createState() => _CodeEditorScreenState();
}

class _CodeEditorScreenState extends State<CodeEditorScreen> {
  final Map<String, CodeController> _controllers = {};
  final TextEditingController _newFileNameController = TextEditingController();
  String _newFileLanguage = 'javascript';
  CodeEditorProvider? _codeEditorProvider;

  @override
  void initState() {
    super.initState();
    // Use a post-frame callback to ensure the provider is available.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _codeEditorProvider = Provider.of<CodeEditorProvider>(
        context,
        listen: false,
      );
      _codeEditorProvider?.addListener(_onProviderChange);
    });
  }

  void _onProviderChange() {
    if (!mounted) return;

    final provider = _codeEditorProvider;
    if (provider == null) return;

    // Update the text in the active controller if the file content changes externally
    if (provider.currentFile != null &&
        _controllers.containsKey(provider.currentFile!.name)) {
      final controller = _controllers[provider.currentFile!.name]!;
      if (controller.text != provider.currentFile!.content) {
        controller.text = provider.currentFile!.content;
      }
    }

    final shouldShowDialog =
        provider.isDeploying ||
        provider.deploymentUrl != null ||
        provider.error != null;

    // This logic ensures the dialog doesn't get built multiple times.
    final isDialogRoute = ModalRoute.of(context)?.isCurrent == false;
    if (shouldShowDialog && !isDialogRoute) {
      _showDeploymentDialog();
    }
  }

  @override
  void dispose() {
    _codeEditorProvider?.removeListener(_onProviderChange);
    _controllers.values.forEach((controller) => controller.dispose());
    _newFileNameController.dispose();
    super.dispose();
  }

  CodeController _getControllerForFile(CodeFile file) {
    if (!_controllers.containsKey(file.name)) {
      _controllers[file.name] = CodeController(
        text: file.content,
        language: javascript, // Defaulting to javascript
      );
    }
    return _controllers[file.name]!;
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Could not launch $url')));
    }
  }

  void _showDeploymentDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return Consumer<CodeEditorProvider>(
          builder: (context, provider, child) {
            Widget content;
            if (provider.isDeploying) {
              content = const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 20),
                  Text(
                    'Deploying your code...',
                    style: TextStyle(color: Colors.white),
                  ),
                ],
              );
            } else if (provider.deploymentUrl != null &&
                provider.screenshot != null) {
              final screenshotBytes = base64Decode(provider.screenshot!);
              content = SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Deployment Successful!',
                      style: TextStyle(fontSize: 18, color: Colors.white),
                    ),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: () => _launchUrl(provider.deploymentUrl!),
                      child: Image.memory(screenshotBytes),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () => _launchUrl(provider.deploymentUrl!),
                      child: Text(
                        provider.deploymentUrl!,
                        style: const TextStyle(
                          color: Colors.blue,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () {
                        provider.clearDeploymentData();
                        Navigator.of(context).pop();
                      },
                      child: const Text('Close'),
                    ),
                  ],
                ),
              );
            } else {
              content = Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error, color: Colors.red, size: 48),
                  const SizedBox(height: 16),
                  const Text(
                    'Deployment Failed',
                    style: TextStyle(fontSize: 18, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    provider.error ?? 'An unknown error occurred.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white70),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () {
                      provider.clearDeploymentData();
                      Navigator.of(context).pop();
                    },
                    child: const Text('Close'),
                  ),
                ],
              );
            }

            return BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
              child: Dialog(
                backgroundColor: Colors.black.withOpacity(0.5),
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: content,
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CodeEditorProvider>(
      builder: (context, codeEditor, child) {
        final currentFile = codeEditor.currentFile;
        return Scaffold(
          appBar: AppBar(
            title: Text(currentFile?.name ?? 'Code Editor'),
            actions: [
              IconButton(
                icon: const Icon(Icons.cloud_upload),
                onPressed: codeEditor.currentFile == null
                    ? null
                    : () {
                        // Save the latest code to the provider before deploying
                        final controller = _getControllerForFile(
                          codeEditor.currentFile!,
                        );
                        codeEditor.updateCurrentFile(controller.text);
                        codeEditor.deployCode();
                      },
                tooltip: 'Deploy Code',
              ),
              IconButton(
                icon: const Icon(Icons.play_arrow),
                onPressed: () {
                  if (currentFile != null) {
                    final code = _getControllerForFile(currentFile).text;
                    _runCode(context, code, currentFile.language);
                  }
                },
              ),
              IconButton(
                icon: const Icon(Icons.save),
                onPressed: () {
                  if (currentFile != null) {
                    final controller = _getControllerForFile(currentFile);
                    codeEditor.updateCurrentFile(controller.text);
                  }
                  codeEditor.saveFiles();
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(const SnackBar(content: Text('File saved!')));
                },
              ),
            ],
          ),
          drawer: _buildDrawer(codeEditor),
          body: codeEditor.isLoading
              ? const Center(child: CircularProgressIndicator())
              : (currentFile != null
                    ? _buildEditorView(currentFile, codeEditor)
                    : const Center(
                        child: Text(
                          'Select a file or create a new one to start.',
                        ),
                      )),
        );
      },
    );
  }

  Drawer _buildDrawer(CodeEditorProvider codeEditor) {
    return Drawer(
      child: Column(
        children: [
          const DrawerHeader(
            decoration: BoxDecoration(color: Colors.blue),
            child: Text(
              'Files',
              style: TextStyle(color: Colors.white, fontSize: 24),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: codeEditor.files.length,
              itemBuilder: (context, index) {
                final file = codeEditor.files[index];
                return ListTile(
                  title: Text(file.name),
                  selected: codeEditor.currentFileIndex == index,
                  onTap: () {
                    codeEditor.setCurrentFileIndex(index);
                    Navigator.pop(context); // Close drawer
                  },
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () => _showDeleteFileDialog(index, file.name),
                  ),
                );
              },
            ),
          ),
          ListTile(
            leading: const Icon(Icons.add),
            title: const Text('Add New File'),
            onTap: _showAddFileDialog,
          ),
        ],
      ),
    );
  }

  Widget _buildEditorView(CodeFile currentFile, CodeEditorProvider codeEditor) {
    final controller = _getControllerForFile(currentFile);
    return CodeTheme(
      data: CodeThemeData(styles: monokaiSublimeTheme),
      child: SingleChildScrollView(
        child: CodeField(
          controller: controller,
          onChanged: (text) {
            codeEditor.updateCurrentFile(text);
          },
        ),
      ),
    );
  }

  void _runCode(BuildContext context, String code, String language) {
    final theme = Theme.of(context).brightness == Brightness.dark
        ? syntax_view.SyntaxTheme.vscodeDark()
        : syntax_view.SyntaxTheme.vscodeLight();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => Scaffold(
          appBar: AppBar(title: const Text('Execution Result')),
          body: syntax_view.SyntaxView(
            code: code,
            syntax: LanguageUtils.getSyntaxFor(language),
            syntaxTheme: theme,
            expanded: true,
          ),
        ),
      ),
    );
  }

  void _showAddFileDialog() {
    _newFileLanguage = 'javascript';
    _newFileNameController.clear();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Add New File'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _newFileNameController,
                decoration: const InputDecoration(
                  labelText: 'File Name (e.g., app.js)',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              child: const Text('Cancel'),
              onPressed: () => Navigator.of(context).pop(),
            ),
            TextButton(
              child: const Text('Add'),
              onPressed: () {
                final fileName = _newFileNameController.text;
                if (fileName.isNotEmpty) {
                  final extension =
                      LanguageUtils
                          .supportedLanguages[_newFileLanguage]?['extension'] ??
                      '.js';
                  final fullFileName = fileName.endsWith(extension)
                      ? fileName
                      : '$fileName$extension';

                  final codeEditor = Provider.of<CodeEditorProvider>(
                    context,
                    listen: false,
                  );
                  codeEditor.addFile(fullFileName, '', _newFileLanguage);
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

  void _showDeleteFileDialog(int index, String fileName) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete File'),
          content: Text('Are you sure you want to delete "$fileName"?'),
          actions: [
            TextButton(
              child: const Text('Cancel'),
              onPressed: () => Navigator.of(context).pop(),
            ),
            TextButton(
              child: const Text('Delete'),
              onPressed: () {
                final codeEditor = Provider.of<CodeEditorProvider>(
                  context,
                  listen: false,
                );
                codeEditor.deleteFile(index);
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
