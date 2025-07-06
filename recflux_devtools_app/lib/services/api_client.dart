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
    this.defaultTimeout = const Duration(seconds: 30),
  }) : defaultHeaders = {
          'Content-Type': 'application/json',
          ...?headers,
        };

  Future<http.Response> get(
    String endpoint, {
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: {...defaultHeaders, ...?headers},
    ).timeout(timeout ?? defaultTimeout);
    return response;
  }

  Future<http.Response> post(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl$endpoint'),
          headers: {...defaultHeaders, ...?headers},
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(timeout ?? defaultTimeout);
    return response;
  }

  Future<http.Response> put(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    final response = await http
        .put(
          Uri.parse('$baseUrl$endpoint'),
          headers: {...defaultHeaders, ...?headers},
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(timeout ?? defaultTimeout);
    return response;
  }

  Future<http.Response> delete(
    String endpoint, {
    Map<String, String>? headers,
    Duration? timeout,
  }) async {
    final response = await http.delete(
      Uri.parse('$baseUrl$endpoint'),
      headers: {...defaultHeaders, ...?headers},
    ).timeout(timeout ?? defaultTimeout);
    return response;
  }
}
