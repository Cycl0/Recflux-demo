import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/test_runner.dart';
import '../utils/config_utils.dart';

class TestScreen extends StatelessWidget {
  const TestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black87;

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
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                action.scrollType == 'by'
                    ? 'Scroll by X,Y pixels (relative)'
                    : 'Scroll to X,Y position (absolute)',
                style: TextStyle(
                  fontSize: 12,
                  color: textColor.withOpacity(0.7),
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: action.xController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'X',
                        hintText: '0',
                        border: const OutlineInputBorder(),
                        isDense: true,
                        helperText: action.scrollType == 'by'
                            ? 'Pixels right'
                            : 'X position',
                        helperStyle: const TextStyle(fontSize: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: action.yController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Y',
                        hintText: '0',
                        border: const OutlineInputBorder(),
                        isDense: true,
                        helperText: action.scrollType == 'by'
                            ? 'Pixels down'
                            : 'Y position',
                        helperStyle: const TextStyle(fontSize: 10),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                action.scrollType == 'by'
                    ? 'Use positive values to scroll down/right, negative to scroll up/left'
                    : 'Coordinates are from the top-left corner (0,0)',
                style: TextStyle(
                  fontSize: 10,
                  fontStyle: FontStyle.italic,
                  color: textColor.withOpacity(0.6),
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
      children:
          results.map((result) => UrlResultWidget(result: result)).toList(),
    );
  }
}

class UrlResultWidget extends StatelessWidget {
  final TestResult result;
  const UrlResultWidget({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black87;

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
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.bold,
                  ),
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
    // Safely extract the report and its properties
    final report = state['accessibilityReport'] as Map<String, dynamic>? ?? {};
    final violations = report['violations'] as List? ?? [];
    final passes = report['passes'] as List? ?? [];
    final stateUrl = report['url'] as String? ?? 'URL not found';

    final screenshots = state['screenshots'] as List? ?? [];
    // Debug screenshot data
    print('Screenshots list length: ${screenshots.length}');
    if (screenshots.isNotEmpty) {
      print('First screenshot type: ${screenshots[0].runtimeType}');
      if (screenshots[0] is String) {
        final screenshotStr = screenshots[0] as String;
        print('Screenshot string length: ${screenshotStr.length}');
        print(
            'Screenshot string starts with: ${screenshotStr.substring(0, screenshotStr.length > 50 ? 50 : screenshotStr.length)}');
      } else {
        print('Screenshot is not a String: $screenshots');
      }
    } else {
      print('No screenshots found in state: $state');
    }

    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;

    final String actionType = state['action'] as String? ?? 'initial';

    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: ExpansionTile(
        initiallyExpanded: true,
        leading: Icon(
          violations.isNotEmpty
              ? Icons.warning_amber_rounded
              : Icons.check_circle_outline_rounded,
          color: violations.isNotEmpty ? Colors.orange : Colors.green,
        ),
        title: Text(
          'State: ${state['action'] ?? 'Initial'}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          '${violations.length} violations, ${passes.length} passes',
        ),
        children: [
          if (screenshots.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Screenshots:',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      if (screenshots.length > 1)
                        Text(
                          'Swipe to view all ${screenshots.length}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 400, // Adjust height as needed
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: Theme.of(context).dividerColor,
                        width: 1,
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: screenshots.isEmpty
                        ? const Center(child: Text('No screenshots available'))
                        : ScreenshotGallery(
                            screenshots: screenshots,
                            actionType: actionType,
                          ),
                  ),
                ],
              ),
            ),
          ListTile(
            leading: const Icon(Icons.link),
            title: Text(
              stateUrl, // Use the correctly accessed URL
              style: const TextStyle(fontSize: 12),
            ),
          ),
          const Divider(),
          if (violations.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Accessibility Issues (${violations.length}):',
                    style: Theme.of(
                      context,
                    ).textTheme.titleMedium?.copyWith(color: textColor),
                  ),
                  const SizedBox(height: 8),
                  ...violations.map((v) => ViolationWidget(violation: v)),
                ],
              ),
            ),
          if (violations.isEmpty)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                'No accessibility issues found.',
              ),
            ),
        ],
      ),
    );
  }
}

class ViolationWidget extends StatelessWidget {
  final Map<String, dynamic> violation;
  const ViolationWidget({super.key, required this.violation});

  @override
  Widget build(BuildContext context) {
    final nodes = violation['nodes'] as List;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    // Use colors that work in both light and dark modes
    final cardColor = isDarkMode
        ? const Color(0xFF3A3A00) // Dark yellow for dark mode
        : Colors.yellow[100]; // Light yellow for light mode

    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.black54;

    return Card(
      color: cardColor,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ExpansionTile(
        title: Text(
          violation['id'],
          style: TextStyle(fontWeight: FontWeight.bold, color: textColor),
        ),
        subtitle: Text(
          'Impact: ${violation['impact']} | ${violation['help']}',
          style: TextStyle(color: subtitleColor),
        ),
        iconColor: textColor,
        collapsedIconColor: textColor,
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Description: ${violation['description']}',
                  style: TextStyle(
                    fontStyle: FontStyle.italic,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Help: ${violation['helpUrl']}',
                  style: TextStyle(color: textColor),
                ),
                const SizedBox(height: 8),
                Text(
                  'Affected Elements (${nodes.length}):',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
                ...nodes.map(
                  (node) => Padding(
                    padding: const EdgeInsets.only(left: 16.0, top: 4.0),
                    child: Text(
                      node['html'],
                      style: TextStyle(
                        color: textColor,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      ),
                    ),
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

class ScreenshotGallery extends StatefulWidget {
  final List<dynamic> screenshots;
  final String actionType;

  const ScreenshotGallery({
    super.key,
    required this.screenshots,
    this.actionType = 'initial',
  });

  @override
  State<ScreenshotGallery> createState() => _ScreenshotGalleryState();
}

class _ScreenshotGalleryState extends State<ScreenshotGallery> {
  int _currentPage = 0;
  final PageController _pageController = PageController();

  @override
  void initState() {
    super.initState();
    _pageController.addListener(_onPageChanged);
  }

  @override
  void dispose() {
    _pageController.removeListener(_onPageChanged);
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged() {
    final page = _pageController.page?.round() ?? 0;
    if (page != _currentPage) {
      setState(() {
        _currentPage = page;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isInitialAction = widget.actionType == 'initial';
    final String captionPrefix = isInitialAction ? 'Full Page' : 'Viewport';

    return Column(
      children: [
        // Screenshot gallery
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            scrollDirection: Axis.horizontal,
            itemCount: widget.screenshots.length,
            itemBuilder: (context, index) {
              // Ensure the screenshot data is treated as a String before decoding
              final screenshotData = widget.screenshots[index];
              if (screenshotData is String) {
                try {
                  // Try to decode the base64 string
                  final decodedData = base64Decode(screenshotData);
                  return Stack(
                    children: [
                      // The image
                      Center(
                        child: Image.memory(
                          decodedData,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            print('Error rendering image: $error');
                            return Container(
                              width: double.infinity,
                              color: Colors.grey.shade200,
                              child: Center(
                                child: Text('Failed to load image: $error'),
                              ),
                            );
                          },
                        ),
                      ),
                      // Caption overlay at the bottom
                      Positioned(
                        bottom: 0,
                        left: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              vertical: 8, horizontal: 16),
                          color: Colors.black.withOpacity(0.5),
                          child: Text(
                            isInitialAction && widget.screenshots.length > 1
                                ? '$captionPrefix ${index + 1} of ${widget.screenshots.length}'
                                : captionPrefix,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  );
                } catch (e) {
                  print('Error decoding base64 image: $e');
                  return Container(
                    width: double.infinity,
                    color: Colors.red.shade100,
                    child: Center(
                      child: Text('Invalid base64 data: ${e.toString()}'),
                    ),
                  );
                }
              }
              // Return an empty container if data is not a string
              return Container(
                width: double.infinity,
                color: Colors.grey.shade300,
                child: Center(
                  child: Text(
                      'Screenshot data is not a string: ${screenshotData.runtimeType}'),
                ),
              );
            },
          ),
        ),
        // Dots indicator for PageView
        if (widget.screenshots.length > 1)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                widget.screenshots.length,
                (index) => GestureDetector(
                  onTap: () {
                    _pageController.animateToPage(
                      index,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  },
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentPage == index ? 10 : 8,
                    height: _currentPage == index ? 10 : 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _currentPage == index
                          ? Theme.of(context).primaryColor
                          : Colors.grey.withOpacity(0.5),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
