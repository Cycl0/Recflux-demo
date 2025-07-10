import 'agentic_service.dart';
import 'code_deploy_service.dart';
import 'kafka_service.dart';
import 'accessibility_service.dart';
import '../models/auth_service.dart';
import '../config/service_config.dart';

class ServiceManager {
  static final ServiceManager _instance = ServiceManager._internal();
  factory ServiceManager() => _instance;
  ServiceManager._internal();

  late AgenticService agenticService;
  late CodeDeployService codeDeployService;
  late KafkaService kafkaService;
  late AccessibilityService accessibilityService;

  bool _isInitialized = false;

  /// Initialize all services with AuthService and ServiceConfig
  void initialize(AuthService authService) {
    agenticService = AgenticService(authService, ServiceConfig());
    codeDeployService =
        CodeDeployService(baseUrl: ServiceConfig.finalCodeDeployServiceUrl);
    kafkaService = KafkaService(baseUrl: ServiceConfig.finalKafkaServiceUrl);
    accessibilityService = AccessibilityService(
        baseUrl: ServiceConfig.finalAccessibilityServiceUrl);
    _isInitialized = true;
  }

  /// Get the agentic service instance
  AgenticService get agentic => agenticService;

  /// Get the code deploy service instance
  CodeDeployService get codeDeploy => codeDeployService;

  /// Get the kafka service instance
  KafkaService get kafka => kafkaService;

  /// Get the accessibility service instance
  AccessibilityService get accessibility => accessibilityService;

  /// Check if all services are initialized
  bool get isInitialized => _isInitialized;
}
