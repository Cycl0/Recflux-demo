import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/auth_service.dart';
import '../config/service_config.dart';

class AgenticService {
  final AuthService _authService;
  final ServiceConfig _config;

  AgenticService(this._authService, this._config);

  Future<String> executeAgenticAction({
    required String prompt,
    String currentCode = '',
    String fileName = 'script.js',
    String actionType = 'GERAR',
  }) async {
    try {
      // Get the user ID from AuthService
      final userId = _authService.supabaseUserId;
      final userEmail = _authService.user?.email;

      if (kDebugMode) {
        print(
            'Executing agentic action with userId: $userId, email: $userEmail');
      }

      if (userEmail == null) {
        throw Exception('User not authenticated');
      }

      final response = await http.post(
        Uri.parse('${ServiceConfig.finalAgenticServiceUrl}/api/agentic'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'prompt': prompt,
          'currentCode': currentCode,
          'fileName': fileName,
          'actionType': actionType,
          'userId': userId, // Use the supabase user ID instead of auth user ID
          'userEmail': userEmail // Keep email as backup
        }),
      );

      if (response.statusCode == 200) {
        String responseBody = response.body;

        // Find and extract the JSON part from the markdown block
        final jsonRegex = RegExp(r"```json\s*([\s\S]*?)\s*```");
        final match = jsonRegex.firstMatch(responseBody);

        if (match != null) {
          responseBody = match.group(1)!;
        }

        // Refresh credits after using the service
        _authService.refreshCredits();

        return responseBody;
      } else {
        return 'Error: ${response.statusCode} - ${response.body}';
      }
    } catch (e) {
      return 'Error executing agentic action: $e';
    }
  }
}
