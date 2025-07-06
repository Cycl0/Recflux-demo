import 'dart:convert';
import 'api_client.dart';

class CodeDeployService {
  final ApiClient _client;

  CodeDeployService({required String baseUrl})
      : _client = ApiClient(baseUrl: baseUrl);

  /// Deploy code to a platform
  Future<Map<String, dynamic>> deployCode({
    required String code,
    required String language,
    required String platform,
    Map<String, dynamic>? options,
  }) async {
    try {
      final response = await _client.post('/deploy', body: {
        'code': code,
        'language': language,
        'platform': platform,
        'options': options,
      });

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to deploy code: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error deploying code: $e');
    }
  }

  /// Get deployment status
  Future<Map<String, dynamic>> getDeploymentStatus(String deploymentId) async {
    try {
      final response = await _client.get('/deploy/status/$deploymentId');

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Failed to get deployment status: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting deployment status: $e');
    }
  }

  /// Get available platforms
  Future<List<String>> getAvailablePlatforms() async {
    try {
      final response = await _client.get('/deploy/platforms');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<String>.from(data['platforms']);
      } else {
        throw Exception('Failed to get platforms: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting available platforms: $e');
    }
  }
}
