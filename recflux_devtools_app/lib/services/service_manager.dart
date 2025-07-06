import 'agentic_service.dart';
import 'code_deploy_service.dart';
import 'kafka_service.dart';
import 'accessibility_service.dart';

class ServiceManager {
  static final ServiceManager _instance = ServiceManager._internal();
  factory ServiceManager() => _instance;
  ServiceManager._internal();

  late final AgenticService agenticService;
  late final CodeDeployService codeDeployService;
  late final KafkaService kafkaService;
  late final AccessibilityService accessibilityService;

  /// Initialize all services with their base URLs
  void initialize({
    required String agenticServiceUrl,
    required String codeDeployServiceUrl,
    required String kafkaServiceUrl,
    required String accessibilityServiceUrl,
  }) {
    agenticService = AgenticService(baseUrl: agenticServiceUrl);
    codeDeployService = CodeDeployService(baseUrl: codeDeployServiceUrl);
    kafkaService = KafkaService(baseUrl: kafkaServiceUrl);
    accessibilityService =
        AccessibilityService(baseUrl: accessibilityServiceUrl);
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
  bool get isInitialized =>
      agenticService != null &&
      codeDeployService != null &&
      kafkaService != null &&
      accessibilityService != null;
}
