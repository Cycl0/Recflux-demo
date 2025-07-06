import 'dart:convert';
import 'api_client.dart';

class AgenticService {
  final ApiClient _client;

  AgenticService({required String baseUrl})
      : _client = ApiClient(baseUrl: baseUrl);

  /// Send a structured query to the agentic service
  Future<Map<String, dynamic>> sendStructuredQuery({
    required String query,
    required String userEmail,
    Map<String, dynamic>? context,
  }) async {
    try {
      // Extract fields from context
      final actionType = context?['actionType'] ?? 'CHAT';
      final currentCode = context?['currentCode'] ?? '';
      final fileName = context?['fileName'] ?? 'script.js';

      final requestBody = {
        'prompt': query,
        'userEmail': userEmail,
        'actionType': actionType,
        'currentCode': currentCode,
        'fileName': fileName,
      };

      print(
          'Agentic Service - Sending request to: ${_client.baseUrl}/api/agentic');
      print('Agentic Service - Request body: ${jsonEncode(requestBody)}');

      final response = await _client.post('/api/agentic', body: requestBody);

      print('Agentic Service - Response status: ${response.statusCode}');
      print('Agentic Service - Response headers: ${response.headers}');

      if (response.statusCode == 200) {
        // The service returns streaming text, so we need to parse it
        final responseText = response.body;
        print('Agentic Service - Response text: $responseText');

        // Try to parse as JSON first
        try {
          final responseData = jsonDecode(responseText);
          print('Agentic Service - Parsed JSON response: $responseData');
          return responseData;
        } catch (e) {
          // If it's not JSON, return as explanation
          print('Agentic Service - Response is not JSON, treating as text');
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
      throw Exception('Error communicating with agentic service: $e');
    }
  }

  /// Get user credits
  Future<Map<String, dynamic>> getUserCredits(String userEmail) async {
    try {
      final response =
          await _client.get('/api/agentic/credits?email=$userEmail');

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get credits: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting user credits: $e');
    }
  }
}
