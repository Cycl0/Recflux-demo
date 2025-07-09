import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  final String baseUrl;
  final Map<String, String> defaultHeaders;
  final Duration defaultTimeout;

  ApiClient({
    required this.baseUrl,
    Map<String, String>? headers,
    this.defaultTimeout =
        const Duration(seconds: 60), // Increased from 30 to 60 seconds
  }) : defaultHeaders = {
          'Content-Type': 'application/json',
          ...?headers,
        };

  Future<http.Response> get(
    String endpoint, {
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    try {
      print('GET Request to: ${baseUrl}${endpoint}');
      final response = await http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: {...defaultHeaders, ...?headers},
      ).timeout(timeout ?? defaultTimeout);
      return response;
    } on TimeoutException catch (e) {
      print('GET Request timeout: $e');
      throw TimeoutException('Connection timeout for GET $baseUrl$endpoint',
          timeout ?? defaultTimeout);
    } catch (e) {
      print('GET Request error: $e');
      rethrow;
    }
  }

  Future<http.Response> post(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    try {
      print('POST Request to: ${baseUrl}${endpoint}');
      if (body != null) {
        print('Request body length: ${jsonEncode(body).length} characters');
      }

      final response = await http
          .post(
            Uri.parse('$baseUrl$endpoint'),
            headers: {...defaultHeaders, ...?headers},
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout ?? defaultTimeout);
      return response;
    } on TimeoutException catch (e) {
      print('POST Request timeout: $e');
      throw TimeoutException('Connection timeout for POST $baseUrl$endpoint',
          timeout ?? defaultTimeout);
    } catch (e) {
      print('POST Request error: $e');
      rethrow;
    }
  }

  Future<http.Response> put(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    try {
      print('PUT Request to: ${baseUrl}${endpoint}');
      final response = await http
          .put(
            Uri.parse('$baseUrl$endpoint'),
            headers: {...defaultHeaders, ...?headers},
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout ?? defaultTimeout);
      return response;
    } on TimeoutException catch (e) {
      print('PUT Request timeout: $e');
      throw TimeoutException('Connection timeout for PUT $baseUrl$endpoint',
          timeout ?? defaultTimeout);
    } catch (e) {
      print('PUT Request error: $e');
      rethrow;
    }
  }

  Future<http.Response> delete(
    String endpoint, {
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    try {
      print('DELETE Request to: ${baseUrl}${endpoint}');
      final response = await http.delete(
        Uri.parse('$baseUrl$endpoint'),
        headers: {...defaultHeaders, ...?headers},
      ).timeout(timeout ?? defaultTimeout);
      return response;
    } on TimeoutException catch (e) {
      print('DELETE Request timeout: $e');
      throw TimeoutException('Connection timeout for DELETE $baseUrl$endpoint',
          timeout ?? defaultTimeout);
    } catch (e) {
      print('DELETE Request error: $e');
      rethrow;
    }
  }
}
