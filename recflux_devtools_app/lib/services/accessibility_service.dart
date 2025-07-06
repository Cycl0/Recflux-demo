import 'dart:convert';
import 'api_client.dart';

class AccessibilityService {
  final ApiClient _client;
  static const Duration _analysisTimeout = Duration(seconds: 600);

  AccessibilityService({required String baseUrl})
      : _client = ApiClient(baseUrl: baseUrl);

  /// Analyze accessibility of code
  Future<Map<String, dynamic>> analyzeAccessibility({
    required String code,
    required String language,
    Map<String, dynamic>? options,
  }) async {
    try {
      final response = await _client.post(
        '/analyze',
        body: {
          'code': code,
          'language': language,
          'options': options,
        },
        timeout: _analysisTimeout,
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Failed to analyze accessibility: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error analyzing accessibility: $e');
    }
  }

  /// Get accessibility guidelines
  Future<Map<String, dynamic>> getGuidelines(String language) async {
    try {
      final response = await _client.get('/guidelines/$language');

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get guidelines: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting accessibility guidelines: $e');
    }
  }

  /// Fix accessibility issues
  Future<Map<String, dynamic>> fixAccessibilityIssues({
    required String code,
    required String language,
    required List<String> issues,
  }) async {
    try {
      final response = await _client.post(
        '/fix',
        body: {
          'code': code,
          'language': language,
          'issues': issues,
        },
        timeout: _analysisTimeout,
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to fix issues: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fixing accessibility issues: $e');
    }
  }
}
