import 'dart:convert';
import 'api_client.dart';

class AgenticService {
  final ApiClient _client;

  AgenticService({required String baseUrl})
      : _client = ApiClient(baseUrl: baseUrl);

  /// Send a structured query to the agentic service
  Future<Map<String, dynamic>> sendStructuredQuery({
    required String query,
    required String userId,
    Map<String, dynamic>? context,
  }) async {
    try {
      // Extract fields from context
      final actionType = context?['actionType'] ?? 'CHAT';
      final currentCode = context?['currentCode'] ?? '';
      final fileName = context?['fileName'] ?? 'script.js';

      final requestBody = {
        'prompt': query,
        'userId': userId,
        'actionType': actionType,
        'currentCode': currentCode,
        'fileName': fileName,
      };

      print(
          'Agentic Service - Sending request to: ${_client.baseUrl}/api/agentic');
      print('Agentic Service - Request body: ${jsonEncode(requestBody)}');

      // Use a longer timeout for AI operations
      final timeout = Duration(seconds: 600);
      final response = await _client.post(
        '/api/agentic',
        body: requestBody,
        timeout: timeout,
      );

      print('Agentic Service - Response status: ${response.statusCode}');
      print('Agentic Service - Response headers: ${response.headers}');

      if (response.statusCode == 200) {
        // The service returns streaming text, so we need to parse it
        final responseText = response.body;
        print('Agentic Service - Response text length: ${responseText.length}');

        // Try to parse as JSON first
        try {
          final responseData = jsonDecode(responseText);
          print('Agentic Service - Parsed JSON response successfully');
          return responseData;
        } catch (e) {
          // If it's not JSON, return as explanation
          print('Agentic Service - Response is not JSON, treating as text: $e');
          return {
            'explanation': responseText,
          };
        }
      } else {
        print('Agentic Service - Error response body: ${response.body}');
        throw Exception(
            'Failed to send query: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Agentic Service - Exception: $e');
      rethrow; // Rethrow to let the UI handle it appropriately
    }
  }

  /// Get user credits
  Future<Map<String, dynamic>> getUserCredits(String userId) async {
    try {
      print('Agentic Service - Getting credits for user: $userId');
      final response = await _client.get('/api/agentic/credits?userId=$userId');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('Agentic Service - Got credits: $data');
        return data;
      } else {
        print(
            'Agentic Service - Failed to get credits: ${response.statusCode} - ${response.body}');
        throw Exception('Failed to get credits: ${response.statusCode}');
      }
    } catch (e) {
      print('Agentic Service - Error getting user credits: $e');
      rethrow;
    }
  }
}
