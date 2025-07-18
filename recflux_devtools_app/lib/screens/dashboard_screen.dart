import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../utils/config_utils.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<dynamic> _results = [];
  Timer? _timer;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    print('Initializing DashboardScreen');
    _fetchResults();
    _timer =
        Timer.periodic(const Duration(seconds: 5), (timer) => _fetchResults());
  }

  Future<void> _fetchResults() async {
    if (!mounted) return;
    setState(() {
      _isLoading = _results.isEmpty;
      _error = null;
    });
    try {
      final apiHost = ConfigUtils.getApiHost();
      final port = ConfigUtils.defaultDashboardPort;
      final url = 'http://$apiHost:$port/results';
      print('Fetching dashboard results from: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      print('Dashboard response status code: ${response.statusCode}');
      if (response.statusCode == 200) {
        final responseBody = response.body;
        print('Dashboard response body length: ${responseBody.length}');
        if (responseBody.isEmpty) {
          print('Warning: Empty response body from dashboard');
        }

        if (mounted) {
          final decodedResults = jsonDecode(responseBody);
          print('Decoded results count: ${decodedResults.length}');
          setState(() {
            _results = decodedResults;
          });
        }
      } else {
        throw Exception(
            'Failed to load results: ${response.statusCode}, body: ${response.body}');
      }
    } catch (e) {
      print('Error in _fetchResults: $e');
      if (mounted) {
        setState(() {
          _error = 'Error fetching results: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Accessibility Dashboard'),
        elevation: 0,
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        titleTextStyle: Theme.of(context)
            .textTheme
            .titleLarge
            ?.copyWith(fontWeight: FontWeight.bold),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchResults,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 50),
              const SizedBox(height: 16),
              Text(_error!,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _fetchResults,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              )
            ],
          ),
        ),
      );
    }

    if (_results.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox_outlined, size: 50, color: Colors.grey),
            const SizedBox(height: 16),
            Text('No test results received yet.',
                style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8.0),
      itemCount: _results.length,
      itemBuilder: (context, index) {
        final result = _results.reversed.toList()[index];
        return TestResultCard(result: result);
      },
    );
  }
}

class TestResultCard extends StatelessWidget {
  final Map<String, dynamic> result;

  const TestResultCard({super.key, required this.result});

  Color _getImpactColor(String? impact) {
    switch (impact) {
      case 'critical':
        return Colors.red.shade900;
      case 'serious':
        return Colors.red.shade700;
      case 'moderate':
        return Colors.orange.shade700;
      case 'minor':
        return Colors.amber.shade700;
      default:
        return Colors.grey;
    }
  }

  IconData _getImpactIcon(String? impact) {
    switch (impact) {
      case 'critical':
        return Icons.error;
      case 'serious':
        return Icons.warning;
      case 'moderate':
        return Icons.info;
      case 'minor':
        return Icons.info_outline;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = result['url']?.toString() ?? 'No URL';
    final resolution = result['resolution'] as Map<String, dynamic>? ?? {};
    final width = resolution['width'] ?? 'N/A';
    final height = resolution['height'] ?? 'N/A';
    final states = result['states'] as List<dynamic>? ?? [];

    if (states.isEmpty || states.first is! Map<String, dynamic>) {
      return Card(
          margin: const EdgeInsets.symmetric(vertical: 8.0),
          child: ListTile(
              title: Text(url),
              subtitle: const Text('No valid state data available')));
    }

    final firstState = states.first as Map<String, dynamic>;
    final report =
        firstState['accessibilityReport'] as Map<String, dynamic>? ?? {};
    final screenshots = firstState['screenshots'] as List<dynamic>?;
    final passes = report['passes'] as List<dynamic>? ?? [];
    final violations = report['violations'] as List<dynamic>? ?? [];
    final incomplete = report['incomplete'] as List<dynamic>? ?? [];

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      elevation: 2.0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        title: Text(url,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        subtitle: Text('Resolution: $width x $height'),
        children: [
          Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: _buildSummary(context, passes, violations, incomplete),
          ),
          if (screenshots != null && screenshots.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16.0, 0, 16.0, 12.0),
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12.0),
                ),
                onPressed: () {
                  Navigator.of(context).push(MaterialPageRoute(
                    builder: (context) => ScreenshotViewer(
                      screenshots: screenshots.cast<String>().toList(),
                    ),
                  ));
                },
                icon: const Icon(Icons.image_outlined),
                label: Text('View Screenshots (${screenshots.length})'),
              ),
            ),
          const Divider(height: 1),
          _buildViolationsList(context, violations),
        ],
      ),
    );
  }

  Widget _buildSummary(BuildContext context, List<dynamic> passes,
      List<dynamic> violations, List<dynamic> incomplete) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildSummaryItem(
            context, 'Passed', passes.length, Icons.check_circle, Colors.green),
        _buildSummaryItem(
            context, 'Violations', violations.length, Icons.cancel, Colors.red),
        _buildSummaryItem(context, 'Incomplete', incomplete.length,
            Icons.help_center, Colors.orange),
      ],
    );
  }

  Widget _buildSummaryItem(BuildContext context, String title, int count,
      IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 4),
        Text(
          count.toString(),
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(color: color, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 2),
        Text(title, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }

  Widget _buildViolationsList(BuildContext context, List<dynamic> violations) {
    if (violations.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        color: Colors.green.withOpacity(0.1),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.celebration, color: Colors.green),
            const SizedBox(width: 8),
            Text('No violations found. Great job!',
                style: TextStyle(color: Colors.green.shade800)),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 8.0),
          child: Text('Violations (${violations.length})',
              style: Theme.of(context).textTheme.titleMedium),
        ),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: violations.length,
          separatorBuilder: (context, index) =>
              const Divider(height: 1, indent: 16, endIndent: 16),
          itemBuilder: (context, index) {
            final violation = violation_as_map(violations[index]);
            final help = violation['help']?.toString() ?? 'No details';
            final impact = violation['impact']?.toString();

            return ListTile(
              leading: Tooltip(
                message: 'Impact: ${impact ?? "N/A"}',
                child: Icon(_getImpactIcon(impact),
                    color: _getImpactColor(impact)),
              ),
              title: Text(help),
              dense: true,
            );
          },
        ),
      ],
    );
  }

  Map<String, dynamic> violation_as_map(dynamic violation) {
    if (violation is Map<String, dynamic>) {
      return violation;
    }
    return {};
  }
}

class ScreenshotViewer extends StatelessWidget {
  final List<String> screenshots;

  const ScreenshotViewer({super.key, required this.screenshots});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Screenshots (${screenshots.length})'),
        elevation: 0,
      ),
      body: SafeArea(
        child: PageView.builder(
          itemCount: screenshots.length,
          itemBuilder: (context, index) {
            final base64String = screenshots[index];
            try {
              final imageBytes = base64Decode(base64String);
              return InteractiveViewer(
                panEnabled: true,
                boundaryMargin: const EdgeInsets.all(20),
                minScale: 0.1,
                maxScale: 5,
                child: Center(
                  child: Image.memory(
                    imageBytes,
                    fit: BoxFit.contain,
                  ),
                ),
              );
            } catch (e) {
              return Center(
                  child: Text('Error decoding screenshot: ${e.toString()}'));
            }
          },
        ),
      ),
      bottomNavigationBar: screenshots.length > 1
          ? BottomAppBar(
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Text(
                  'Swipe to view other screenshots',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            )
          : null,
    );
  }
}
