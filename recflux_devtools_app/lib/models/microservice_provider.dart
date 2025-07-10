import 'package:flutter/foundation.dart';
import '../services/service_manager.dart';
import '../services/agentic_service.dart';
import '../services/code_deploy_service.dart';
import '../services/kafka_service.dart';
import '../services/accessibility_service.dart';
import '../models/auth_service.dart';

class MicroserviceProvider extends ChangeNotifier {
  final ServiceManager _serviceManager = ServiceManager();
  final AuthService _authService;

  MicroserviceProvider(this._authService);

  // Service instances
  AgenticService get agentic => _serviceManager.agentic;
  CodeDeployService get codeDeploy => _serviceManager.codeDeploy;
  KafkaService get kafka => _serviceManager.kafka;
  AccessibilityService get accessibility => _serviceManager.accessibility;

  // State management
  bool _isLoading = false;
  String? _lastError;
  Map<String, dynamic>? _lastResponse;

  bool get isLoading => _isLoading;
  String? get lastError => _lastError;
  Map<String, dynamic>? get lastResponse => _lastResponse;

  // Agentic service methods
  Future<String> executeAgenticStructuredAction({
    required String prompt,
    String currentCode = '',
    String fileName = 'script.js',
    String actionType = 'EDITAR',
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await agentic.executeAgenticStructuredAction(
        prompt: prompt,
        currentCode: currentCode,
        fileName: fileName,
        actionType: actionType,
      );

      _setLoading(false);
      return response;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return 'Error: $e';
    }
  }

  // Code deploy service methods
  Future<Map<String, dynamic>> deployCode({
    required String code,
    required String language,
    required String platform,
    Map<String, dynamic>? options,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await codeDeploy.deployCode(
        code: code,
        language: language,
        platform: platform,
        options: options,
      );

      _lastResponse = response;
      _setLoading(false);
      return response;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getDeploymentStatus(String deploymentId) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await codeDeploy.getDeploymentStatus(deploymentId);
      _lastResponse = response;
      _setLoading(false);
      return response;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      rethrow;
    }
  }

  // Kafka service methods
  Future<Map<String, dynamic>> sendKafkaMessage({
    required String topic,
    required Map<String, dynamic> message,
    String? key,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await kafka.sendMessage(
        topic: topic,
        message: message,
        key: key,
      );

      _lastResponse = response;
      _setLoading(false);
      return response;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      rethrow;
    }
  }

  // Accessibility service methods
  Future<Map<String, dynamic>> analyzeAccessibility({
    required String code,
    required String language,
    Map<String, dynamic>? options,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await accessibility.analyzeAccessibility(
        code: code,
        language: language,
        options: options,
      );

      _lastResponse = response;
      _setLoading(false);
      return response;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      rethrow;
    }
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _lastError = error;
    notifyListeners();
  }

  void _clearError() {
    _lastError = null;
    notifyListeners();
  }

  void clearLastResponse() {
    _lastResponse = null;
    notifyListeners();
  }

  void clearError() {
    _clearError();
  }
}
