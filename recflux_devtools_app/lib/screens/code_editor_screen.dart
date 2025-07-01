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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _codeEditorProvider =
          Provider.of<CodeEditorProvider>(context, listen: false);
      _codeEditorProvider?.addListener(_onProviderChange);
      _codeEditorProvider?.fetchProjects();
    });
  }

  void _onProviderChange() {
    if (!mounted) return;

    final provider = _codeEditorProvider;
    if (provider == null) return;

    // Clear controllers when files change to force refresh
    if (provider.files.isNotEmpty && _controllers.isNotEmpty) {
      final currentFileIds = provider.files.map((f) => f.id).toSet();
      final controllerIds = _controllers.keys.toSet();

      // Remove controllers for files that no longer exist
      for (final controllerId in controllerIds) {
        if (!currentFileIds.contains(controllerId)) {
          _controllers[controllerId]?.dispose();
          _controllers.remove(controllerId);
        }
      }
    }

    if (provider.currentFile != null &&
        _controllers.containsKey(provider.currentFile!.id)) {
      final controller = _controllers[provider.currentFile!.id]!;
      if (controller.text != provider.currentFile!.content) {
        controller.text = provider.currentFile!.content;
      }
    }

    final shouldShowDialog = provider.isDeploying ||
        provider.deploymentUrl != null ||
        provider.error != null;
    final isDialogAlreadyShown = ModalRoute.of(context)?.isCurrent == false;

    if (shouldShowDialog && !isDialogAlreadyShown) {
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
    return _controllers.putIfAbsent(
      file.id,
      () => CodeController(text: file.content, language: javascript),
    );
  }

  Future<void> _launchUrl(String url) async {
    if (!await launchUrl(Uri.parse(url))) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not launch $url')));
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
        return Scaffold(
          appBar: AppBar(
            title: _buildProjectSelector(codeEditor),
            actions: [
              GestureDetector(
                onLongPress: () {
                  // Clear all controllers to force refresh
                  _controllers.values
                      .forEach((controller) => controller.dispose());
                  _controllers.clear();
                  codeEditor.refreshAllProjects();
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Refreshing all projects...')));
                },
                child: IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () {
                    // Clear all controllers to force refresh
                    _controllers.values
                        .forEach((controller) => controller.dispose());
                    _controllers.clear();
                    codeEditor.refreshCurrentProject();
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                        content: Text('Refreshing project data...')));
                  },
                  tooltip:
                      'Refresh Project Data (Long press to refresh all projects)',
                ),
              ),
              IconButton(
                icon: const Icon(Icons.cloud_upload),
                onPressed: codeEditor.currentFile == null
                    ? null
                    : () {
                        final controller =
                            _getControllerForFile(codeEditor.currentFile!);
                        codeEditor
                            .updateCurrentFileContent(controller.text)
                            .then((_) => codeEditor.deployCode());
                      },
                tooltip: 'Save & Deploy',
              ),
              IconButton(
                icon: const Icon(Icons.save),
                onPressed: codeEditor.currentFile == null
                    ? null
                    : () {
                        final controller =
                            _getControllerForFile(codeEditor.currentFile!);
                        codeEditor.updateCurrentFileContent(controller.text);
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('File saved!')));
                      },
              ),
            ],
          ),
          drawer: _buildDrawer(codeEditor),
          body: _buildBody(codeEditor),
        );
      },
    );
  }

  Widget _buildProjectSelector(CodeEditorProvider provider) {
    if (provider.isLoading && provider.projects.isEmpty) {
      return const Text('Loading Projects...');
    }
    if (provider.projects.isEmpty) {
      return const Text('No Projects Found');
    }
    return DropdownButton<Project>(
      value: provider.currentProject,
      isExpanded: true,
      underline: Container(),
      onChanged: (Project? newValue) {
        if (newValue != null) {
          provider.selectProject(newValue);
        }
      },
      items: provider.projects.map<DropdownMenuItem<Project>>((Project p) {
        return DropdownMenuItem<Project>(value: p, child: Text(p.name));
      }).toList(),
    );
  }

  Widget _buildBody(CodeEditorProvider codeEditor) {
    if (codeEditor.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (codeEditor.currentProject == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('No project selected.'),
            ElevatedButton(
              onPressed: () => _showAddProjectDialog(codeEditor),
              child: const Text('Create a New Project'),
            ),
          ],
        ),
      );
    }
    if (codeEditor.currentFile == null) {
      return const Center(
        child: Text('Select a file or create a new one to start.'),
      );
    }
    return _buildEditorView(codeEditor.currentFile!);
  }

  Drawer _buildDrawer(CodeEditorProvider codeEditor) {
    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(color: Theme.of(context).primaryColor),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  codeEditor.currentProject?.name ?? 'Files',
                  style: const TextStyle(color: Colors.white, fontSize: 24),
                ),
                IconButton(
                  icon: const Icon(Icons.add, color: Colors.white),
                  onPressed: () => _showAddProjectDialog(codeEditor),
                  tooltip: 'New Project',
                )
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: codeEditor.files.length,
              itemBuilder: (context, index) {
                final file = codeEditor.files[index];
                return ListTile(
                  title: Text(file.name),
                  selected: codeEditor.files.indexOf(codeEditor.currentFile!) ==
                      index,
                  onTap: () {
                    codeEditor.setCurrentFileIndex(index);
                    Navigator.pop(context); // Close drawer
                  },
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: () =>
                        _showDeleteFileDialog(codeEditor, index, file.name),
                  ),
                );
              },
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.add),
            title: const Text('Add New File'),
            onTap: () => _showAddFileDialog(codeEditor),
          ),
        ],
      ),
    );
  }

  Widget _buildEditorView(CodeFile currentFile) {
    final controller = _getControllerForFile(currentFile);
    return CodeTheme(
      data: CodeThemeData(styles: monokaiSublimeTheme),
      child: SingleChildScrollView(
        child: CodeField(
          controller: controller,
        ),
      ),
    );
  }

  void _showAddProjectDialog(CodeEditorProvider provider) {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create New Project'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Project Name')),
            TextField(
                controller: descController,
                decoration:
                    const InputDecoration(labelText: 'Description (Optional)')),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.isNotEmpty) {
                provider.createProject(nameController.text,
                    description: descController.text);
                Navigator.pop(context);
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _showAddFileDialog(CodeEditorProvider provider) {
    final nameController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create New File'),
        content: TextField(
          controller: nameController,
          decoration:
              const InputDecoration(labelText: 'File Name (e.g. app.js)'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.isNotEmpty) {
                provider.addFile(nameController.text);
                Navigator.pop(context);
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _showDeleteFileDialog(
      CodeEditorProvider provider, int index, String fileName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete File'),
        content: Text('Are you sure you want to delete "$fileName"?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () {
              provider.deleteFile(index);
              Navigator.pop(context);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
