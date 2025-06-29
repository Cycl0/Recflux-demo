import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

// --- Models ---
class TestAction {
  String type; // 'click', 'wait', 'type', or 'scroll'
  bool isWaitByDuration = true;
  String scrollType = 'element'; // 'element', 'by', 'to'

  TextEditingController valueController = TextEditingController();
  TextEditingController? textController; // For 'type'
  TextEditingController? xController; // For 'scroll'
  TextEditingController? yController; // For 'scroll'

  TestAction({required this.type}) {
    if (type == 'type') {
      textController = TextEditingController();
    }
    if (type == 'scroll') {
      xController = TextEditingController();
      yController = TextEditingController();
    }
  }

  Map<String, dynamic> toJson() {
    switch (type) {
      case 'click':
        return {'action': 'click', 'selector': valueController.text};
      case 'type':
        return {
          'action': 'type',
          'selector': valueController.text,
          'text': textController?.text ?? '',
        };
      case 'scroll':
        switch (scrollType) {
          case 'element':
            return {
              'action': 'scroll',
              'scrollType': 'element',
              'selector': valueController.text,
            };
          case 'by':
            return {
              'action': 'scroll',
              'scrollType': 'by',
              'x': int.tryParse(xController?.text ?? '0') ?? 0,
              'y': int.tryParse(yController?.text ?? '0') ?? 0,
            };
          case 'to':
          default:
            return {
              'action': 'scroll',
              'scrollType': 'to',
              'x': int.tryParse(xController?.text ?? '0') ?? 0,
              'y': int.tryParse(yController?.text ?? '0') ?? 0,
            };
        }
      case 'wait':
      default:
        if (isWaitByDuration) {
          return {
            'action': 'wait',
            'duration': int.tryParse(valueController.text) ?? 0,
          };
        } else {
          return {'action': 'wait', 'selector': valueController.text};
        }
    }
  }

  void dispose() {
    valueController.dispose();
    textController?.dispose();
    xController?.dispose();
    yController?.dispose();
  }
}

class TestResult {
  final String url;
  final List<dynamic> states;

  TestResult({required this.url, required this.states});

  factory TestResult.fromJson(Map<String, dynamic> json) {
    return TestResult(url: json['url'], states: json['states']);
  }
}

// --- State Management ---
class TestRunner with ChangeNotifier {
  String _url = '';
  String get url => _url;
  set url(String value) {
    _url = value;
    notifyListeners();
  }

  Resolution _resolution = Resolution(width: 1920, height: 1080);
  Resolution get resolution => _resolution;
  set resolution(Resolution value) {
    _resolution = value;
    notifyListeners();
  }

  final List<TestAction> _actions = [];
  List<TestAction> get actions => _actions;

  List<TestResult> _results = [];
  List<TestResult> get results => _results;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  void addAction(String type) {
    _actions.add(TestAction(type: type));
    notifyListeners();
  }

  void removeActionAt(int index) {
    _actions[index].dispose();
    _actions.removeAt(index);
    notifyListeners();
  }

  Future<void> runTest() async {
    if (_url.isEmpty) {
      _error = "URL is required.";
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    _results = [];
    notifyListeners();

    try {
      final requestBody = jsonEncode({
        'urls': [_url],
        'resolution': _resolution.toJson(),
        'actions': _actions.map((a) => a.toJson()).toList(),
      });

      final String host = kIsWeb ? 'localhost' : '10.0.2.2';
      print('<<<<<< [DEBUG] Using host: "$host" >>>>>>');
      final response = await http.post(
        Uri.parse('http://$host:3000/test'),
        headers: {'Content-Type': 'application/json'},
        body: requestBody,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        _results = data.map((r) => TestResult.fromJson(r)).toList();
      } else {
        final errorData = jsonDecode(response.body);
        _error = 'Test failed: ${errorData['error']} - ${errorData['details']}';
      }
    } catch (e) {
      _error = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

class Resolution {
  final int width;
  final int height;
  Resolution({required this.width, required this.height});

  String get label => '${width}x$height';
  Map<String, int> toJson() => {'width': width, 'height': height};

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Resolution &&
          runtimeType == other.runtimeType &&
          width == other.width &&
          height == other.height;

  @override
  int get hashCode => Object.hash(width, height);
}

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => TestRunner(),
      child: const TestApp(),
    ),
  );
}

class TestApp extends StatelessWidget {
  const TestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Recflux Test',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: const TestScreen(),
    );
  }
}

class TestScreen extends StatelessWidget {
  const TestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Test Configuration - Recflux')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const ConfigSection(),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 20),
            Consumer<TestRunner>(
              builder: (context, runner, child) {
                if (runner.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (runner.error != null) {
                  return Center(
                    child: Text(
                      'Error: ${runner.error}',
                      style: const TextStyle(color: Colors.red),
                    ),
                  );
                }
                return ResultsSection(results: runner.results);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class ConfigSection extends StatelessWidget {
  const ConfigSection({super.key});
  static final _urlController = TextEditingController();
  static final List<Resolution> _resolutions = [
    Resolution(width: 1920, height: 1080),
    Resolution(width: 1366, height: 768),
    Resolution(width: 375, height: 667), // Mobile
  ];

  @override
  Widget build(BuildContext context) {
    final runner = Provider.of<TestRunner>(context, listen: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Target URL', style: Theme.of(context).textTheme.titleLarge),
        TextField(
          controller: _urlController,
          decoration: const InputDecoration(hintText: 'https://example.com'),
          onChanged: (value) => runner.url = value,
        ),
        const SizedBox(height: 16),
        Text('Resolution', style: Theme.of(context).textTheme.titleLarge),
        DropdownButton<Resolution>(
          value: Provider.of<TestRunner>(context).resolution,
          isExpanded: true,
          items: _resolutions.map((r) {
            return DropdownMenuItem<Resolution>(value: r, child: Text(r.label));
          }).toList(),
          onChanged: (value) {
            if (value != null) {
              runner.resolution = value;
            }
          },
        ),
        const SizedBox(height: 16),
        Text('Actions', style: Theme.of(context).textTheme.titleLarge),
        const ActionsList(),
        const SizedBox(height: 24),
        Center(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.play_arrow),
            label: const Text('Run Test'),
            onPressed: runner.runTest,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            ),
          ),
        ),
      ],
    );
  }
}

class ActionsList extends StatelessWidget {
  const ActionsList({super.key});

  @override
  Widget build(BuildContext context) {
    final runner = Provider.of<TestRunner>(context);

    return Column(
      children: [
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: runner.actions.length,
          itemBuilder: (context, index) {
            final action = runner.actions[index];
            return ActionCard(action: action, index: index);
          },
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            PopupMenuButton<String>(
              icon: const Icon(Icons.add_circle, size: 32, color: Colors.green),
              onSelected: runner.addAction,
              itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                const PopupMenuItem<String>(
                  value: 'click',
                  child: Text('Click Element'),
                ),
                const PopupMenuItem<String>(
                  value: 'type',
                  child: Text('Type Text'),
                ),
                const PopupMenuItem<String>(value: 'wait', child: Text('Wait')),
                const PopupMenuItem<String>(
                  value: 'scroll',
                  child: Text('Scroll Page'),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class ActionCard extends StatelessWidget {
  final TestAction action;
  final int index;

  const ActionCard({required this.action, required this.index, super.key});

  @override
  Widget build(BuildContext context) {
    final runner = Provider.of<TestRunner>(context, listen: false);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_title, style: Theme.of(context).textTheme.titleMedium),
                IconButton(
                  icon: const Icon(
                    Icons.delete_outline,
                    color: Colors.redAccent,
                  ),
                  onPressed: () => runner.removeActionAt(index),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // UI for Wait Action
            if (action.type == 'wait') _buildWaitActionUI(context),

            // UI for Click and Type Actions
            if (action.type == 'click' || action.type == 'type')
              _buildSelectorActionUI(context),

            // UI for Scroll Action
            if (action.type == 'scroll') _buildScrollActionUI(context),

            // Additional field for Type Action
            if (action.type == 'type') ...[
              const SizedBox(height: 8),
              TextField(
                controller: action.textController,
                decoration: const InputDecoration(
                  hintText: 'Text to type',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String get _title {
    switch (action.type) {
      case 'click':
        return 'Action: Click';
      case 'type':
        return 'Action: Type';
      case 'wait':
        return 'Action: Wait';
      case 'scroll':
        return 'Action: Scroll';
      default:
        return 'Action';
    }
  }

  Widget _buildWaitActionUI(BuildContext context) {
    return Column(
      children: [
        ToggleButtons(
          isSelected: [action.isWaitByDuration, !action.isWaitByDuration],
          onPressed: (int index) {
            // This rebuilds the widget with the new state
            Provider.of<TestRunner>(context, listen: false).notifyListeners();
            action.isWaitByDuration = index == 0;
          },
          borderRadius: BorderRadius.circular(8.0),
          children: const [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text('By Duration (ms)'),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text('For Element'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (action.isWaitByDuration)
          TextField(
            controller: action.valueController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              hintText: 'Duration in milliseconds',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          )
        else
          TextField(
            controller: action.valueController,
            decoration: const InputDecoration(
              hintText: 'CSS Selector or XPath',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
      ],
    );
  }

  Widget _buildSelectorActionUI(BuildContext context) {
    return TextField(
      controller: action.valueController,
      decoration: const InputDecoration(
        hintText: 'CSS Selector or XPath',
        border: OutlineInputBorder(),
        isDense: true,
      ),
    );
  }

  Widget _buildScrollActionUI(BuildContext context) {
    return Column(
      children: [
        ToggleButtons(
          isSelected: [
            action.scrollType == 'element',
            action.scrollType == 'by',
            action.scrollType == 'to',
          ],
          onPressed: (int index) {
            Provider.of<TestRunner>(context, listen: false).notifyListeners();
            if (index == 0) action.scrollType = 'element';
            if (index == 1) action.scrollType = 'by';
            if (index == 2) action.scrollType = 'to';
          },
          borderRadius: BorderRadius.circular(8.0),
          children: const [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Text('To Element'),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Text('By Amount'),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Text('To Coordinates'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (action.scrollType == 'element')
          TextField(
            controller: action.valueController,
            decoration: const InputDecoration(
              hintText: 'CSS Selector or XPath',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          )
        else
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: action.xController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'X',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: action.yController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'Y',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class ResultsSection extends StatelessWidget {
  final List<TestResult> results;
  const ResultsSection({super.key, required this.results});

  @override
  Widget build(BuildContext context) {
    if (results.isEmpty) {
      return const Center(child: Text('No results to display. Run a test.'));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: results
          .map((result) => UrlResultWidget(result: result))
          .toList(),
    );
  }
}

class UrlResultWidget extends StatelessWidget {
  final TestResult result;
  const UrlResultWidget({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Results for: ${result.url}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            ...result.states.map((state) => StateResultWidget(state: state)),
          ],
        ),
      ),
    );
  }
}

class StateResultWidget extends StatelessWidget {
  final Map<String, dynamic> state;
  const StateResultWidget({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    final violations = state['accessibilityReport']['violations'] as List;
    final screenshots = state['screenshots'] as List;

    return ExpansionTile(
      title: Text('Trigger: ${state['trigger']}'),
      subtitle: Text('Details: ${state['details']}'),
      children: [
        if (screenshots.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Screenshots:',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 400, // Adjust height as needed
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: screenshots.length,
                    itemBuilder: (context, index) => Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: Image.memory(base64Decode(screenshots[index])),
                    ),
                  ),
                ),
              ],
            ),
          ),
        if (violations.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Accessibility Issues (${violations.length}):',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                ...violations.map((v) => ViolationWidget(violation: v)),
              ],
            ),
          ),
        if (violations.isEmpty)
          const Padding(
            padding: EdgeInsets.all(8.0),
            child: Text('No accessibility issues found.'),
          ),
      ],
    );
  }
}

class ViolationWidget extends StatelessWidget {
  final Map<String, dynamic> violation;
  const ViolationWidget({super.key, required this.violation});

  @override
  Widget build(BuildContext context) {
    final nodes = violation['nodes'] as List;
    return Card(
      color: Colors.yellow[100],
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ExpansionTile(
        title: Text(
          violation['id'],
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('Impact: ${violation['impact']} | ${violation['help']}'),
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Description: ${violation['description']}',
                  style: const TextStyle(fontStyle: FontStyle.italic),
                ),
                const SizedBox(height: 8),
                Text('Help: ${violation['helpUrl']}'),
                const SizedBox(height: 8),
                Text(
                  'Affected Elements (${nodes.length}):',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                ...nodes.map(
                  (node) => Padding(
                    padding: const EdgeInsets.only(left: 16.0, top: 4.0),
                    child: Text(node['html']),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
