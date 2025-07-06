class ServiceConfig {
  // Development URLs (local)
  static const String devAgenticServiceUrl = 'http://localhost:3001';
  static const String devCodeDeployServiceUrl = 'http://localhost:3002';
  static const String devKafkaServiceUrl = 'http://localhost:3003';
  static const String devAccessibilityServiceUrl = 'http://localhost:3004';

  // Production URLs
  static const String prodAgenticServiceUrl =
      'http://api.4.156.13.98.nip.io/agentic';
  static const String prodCodeDeployServiceUrl =
      'http://api.4.156.13.98.nip.io/code-deploy';
  static const String prodKafkaServiceUrl =
      'http://api.4.156.13.98.nip.io/kafka';
  static const String prodAccessibilityServiceUrl =
      'http://api.4.156.13.98.nip.io/accessibility';

  // Environment detection
  static bool get isDevelopment =>
      const bool.fromEnvironment('dart.vm.product') == false;

  // Get URLs based on environment
  static String get agenticServiceUrl =>
      isDevelopment ? devAgenticServiceUrl : prodAgenticServiceUrl;

  static String get codeDeployServiceUrl =>
      isDevelopment ? devCodeDeployServiceUrl : prodCodeDeployServiceUrl;

  static String get kafkaServiceUrl =>
      isDevelopment ? devKafkaServiceUrl : prodKafkaServiceUrl;

  static String get accessibilityServiceUrl =>
      isDevelopment ? devAccessibilityServiceUrl : prodAccessibilityServiceUrl;

  // Custom URL override (useful for testing)
  static String? _customAgenticUrl;
  static String? _customCodeDeployUrl;
  static String? _customKafkaUrl;
  static String? _customAccessibilityUrl;

  static void setCustomUrls({
    String? agenticUrl,
    String? codeDeployUrl,
    String? kafkaUrl,
    String? accessibilityUrl,
  }) {
    _customAgenticUrl = agenticUrl;
    _customCodeDeployUrl = codeDeployUrl;
    _customKafkaUrl = kafkaUrl;
    _customAccessibilityUrl = accessibilityUrl;
  }

  static void clearCustomUrls() {
    _customAgenticUrl = null;
    _customCodeDeployUrl = null;
    _customKafkaUrl = null;
    _customAccessibilityUrl = null;
  }

  // Get final URLs (with custom override support)
  static String get finalAgenticServiceUrl =>
      _customAgenticUrl ?? agenticServiceUrl;

  static String get finalCodeDeployServiceUrl =>
      _customCodeDeployUrl ?? codeDeployServiceUrl;

  static String get finalKafkaServiceUrl => _customKafkaUrl ?? kafkaServiceUrl;

  static String get finalAccessibilityServiceUrl =>
      _customAccessibilityUrl ?? accessibilityServiceUrl;
}
