import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb, ChangeNotifier;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

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
