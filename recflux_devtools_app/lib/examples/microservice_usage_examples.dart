import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import '../models/microservice_provider.dart';
import '../models/auth_service.dart';

/// Example 1: Using Agentic Service for Chat
class AgenticChatExample extends StatelessWidget {
  const AgenticChatExample({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Agentic Chat Example')),
      body: Consumer2<MicroserviceProvider, AuthService>(
        builder: (context, microserviceProvider, authService, child) {
          return Column(
            children: [
              // User info
              if (authService.isSignedIn)
                Card(
                  margin: const EdgeInsets.all(8),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Text('User: ${authService.userEmail}'),
                        ElevatedButton(
                          onPressed: () async {
                            try {
                              final credits =
                                  await microserviceProvider.getUserCredits(
                                authService.userEmail!,
                              );
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                    content:
                                        Text('Credits: ${credits['credits']}')),
                              );
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error: $e')),
                              );
                            }
                          },
                          child: const Text('Check Credits'),
                        ),
                      ],
                    ),
                  ),
                ),

              // Chat interface
              Expanded(
                child: Column(
                  children: [
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.all(8),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: microserviceProvider.lastResponse != null
                            ? SingleChildScrollView(
                                child: Text(
                                  microserviceProvider.lastResponse.toString(),
                                  style:
                                      const TextStyle(fontFamily: 'monospace'),
                                ),
                              )
                            : const Center(
                                child: Text('No response yet'),
                              ),
                      ),
                    ),
                    if (microserviceProvider.isLoading)
                      const LinearProgressIndicator(),
                    if (microserviceProvider.lastError != null)
                      Container(
                        margin: const EdgeInsets.all(8),
                        padding: const EdgeInsets.all(8),
                        color: Colors.red[100],
                        child: Text(
                          'Error: ${microserviceProvider.lastError}',
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                  ],
                ),
              ),

              // Input
              Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: 'Enter your query...',
                          border: OutlineInputBorder(),
                        ),
                        onSubmitted: (query) async {
                          if (authService.isSignedIn) {
                            try {
                              await microserviceProvider.sendStructuredQuery(
                                query: query,
                                userEmail: authService.userEmail!,
                                context: {'source': 'flutter_app'},
                              );
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error: $e')),
                              );
                            }
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Example 2: Using Code Deploy Service
class CodeDeployExample extends StatefulWidget {
  const CodeDeployExample({super.key});

  @override
  State<CodeDeployExample> createState() => _CodeDeployExampleState();
}

class _CodeDeployExampleState extends State<CodeDeployExample> {
  final TextEditingController _codeController = TextEditingController();
  String _selectedLanguage = 'javascript';
  String _selectedPlatform = 'vercel';

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Code Deploy Example')),
      body: Consumer<MicroserviceProvider>(
        builder: (context, microserviceProvider, child) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Language selector
                DropdownButtonFormField<String>(
                  value: _selectedLanguage,
                  decoration: const InputDecoration(
                    labelText: 'Language',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(
                        value: 'javascript', child: Text('JavaScript')),
                    DropdownMenuItem(value: 'python', child: Text('Python')),
                    DropdownMenuItem(value: 'dart', child: Text('Dart')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _selectedLanguage = value;
                      });
                    }
                  },
                ),
                const SizedBox(height: 16),

                // Platform selector
                DropdownButtonFormField<String>(
                  value: _selectedPlatform,
                  decoration: const InputDecoration(
                    labelText: 'Platform',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'vercel', child: Text('Vercel')),
                    DropdownMenuItem(value: 'netlify', child: Text('Netlify')),
                    DropdownMenuItem(value: 'heroku', child: Text('Heroku')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _selectedPlatform = value;
                      });
                    }
                  },
                ),
                const SizedBox(height: 16),

                // Code input
                Expanded(
                  child: TextField(
                    controller: _codeController,
                    maxLines: null,
                    expands: true,
                    decoration: const InputDecoration(
                      labelText: 'Code to deploy',
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Deploy button
                ElevatedButton(
                  onPressed: microserviceProvider.isLoading
                      ? null
                      : () async {
                          try {
                            final result =
                                await microserviceProvider.deployCode(
                              code: _codeController.text,
                              language: _selectedLanguage,
                              platform: _selectedPlatform,
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                    'Deployed! ID: ${result['deploymentId']}'),
                              ),
                            );
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error: $e')),
                            );
                          }
                        },
                  child: microserviceProvider.isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Deploy Code'),
                ),

                if (microserviceProvider.lastError != null)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.all(8),
                    color: Colors.red[100],
                    child: Text(
                      'Error: ${microserviceProvider.lastError}',
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Example 3: Using Kafka Service
class KafkaExample extends StatefulWidget {
  const KafkaExample({super.key});

  @override
  State<KafkaExample> createState() => _KafkaExampleState();
}

class _KafkaExampleState extends State<KafkaExample> {
  final TextEditingController _topicController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();

  @override
  void dispose() {
    _topicController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kafka Example')),
      body: Consumer<MicroserviceProvider>(
        builder: (context, microserviceProvider, child) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _topicController,
                  decoration: const InputDecoration(
                    labelText: 'Topic',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    maxLines: null,
                    expands: true,
                    decoration: const InputDecoration(
                      labelText: 'Message (JSON)',
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: microserviceProvider.isLoading
                      ? null
                      : () async {
                          try {
                            final message = Map<String, dynamic>.from(
                              jsonDecode(_messageController.text),
                            );
                            await microserviceProvider.sendKafkaMessage(
                              topic: _topicController.text,
                              message: message,
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Message sent!')),
                            );
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error: $e')),
                            );
                          }
                        },
                  child: microserviceProvider.isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Send Message'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Example 4: Using Accessibility Service
class AccessibilityExample extends StatefulWidget {
  const AccessibilityExample({super.key});

  @override
  State<AccessibilityExample> createState() => _AccessibilityExampleState();
}

class _AccessibilityExampleState extends State<AccessibilityExample> {
  final TextEditingController _codeController = TextEditingController();
  String _selectedLanguage = 'javascript';

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Accessibility Analysis Example')),
      body: Consumer<MicroserviceProvider>(
        builder: (context, microserviceProvider, child) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  value: _selectedLanguage,
                  decoration: const InputDecoration(
                    labelText: 'Language',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(
                        value: 'javascript', child: Text('JavaScript')),
                    DropdownMenuItem(value: 'html', child: Text('HTML')),
                    DropdownMenuItem(value: 'css', child: Text('CSS')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _selectedLanguage = value;
                      });
                    }
                  },
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: TextField(
                    controller: _codeController,
                    maxLines: null,
                    expands: true,
                    decoration: const InputDecoration(
                      labelText: 'Code to analyze',
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: microserviceProvider.isLoading
                      ? null
                      : () async {
                          try {
                            final result =
                                await microserviceProvider.analyzeAccessibility(
                              code: _codeController.text,
                              language: _selectedLanguage,
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                    'Analysis complete! Issues: ${result['issues']?.length ?? 0}'),
                              ),
                            );
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error: $e')),
                            );
                          }
                        },
                  child: microserviceProvider.isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Analyze Accessibility'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
