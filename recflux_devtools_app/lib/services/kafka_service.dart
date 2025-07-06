import 'dart:convert';
import 'api_client.dart';

class KafkaService {
  final ApiClient _client;

  KafkaService({required String baseUrl})
      : _client = ApiClient(baseUrl: baseUrl);

  /// Send a message to Kafka
  Future<Map<String, dynamic>> sendMessage({
    required String topic,
    required Map<String, dynamic> message,
    String? key,
  }) async {
    try {
      final response = await _client.post('/kafka/send', body: {
        'topic': topic,
        'message': message,
        'key': key,
      });

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to send message: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error sending message to Kafka: $e');
    }
  }

  /// Get available topics
  Future<List<String>> getTopics() async {
    try {
      final response = await _client.get('/kafka/topics');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<String>.from(data['topics']);
      } else {
        throw Exception('Failed to get topics: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting Kafka topics: $e');
    }
  }

  /// Get message history for a topic
  Future<List<Map<String, dynamic>>> getMessageHistory(String topic) async {
    try {
      final response = await _client.get('/kafka/history/$topic');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['messages']);
      } else {
        throw Exception(
            'Failed to get message history: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting message history: $e');
    }
  }
}
