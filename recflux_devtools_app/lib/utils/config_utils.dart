import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Configuration utilities for the Recflux DevTools app
class ConfigUtils {
  /// Default port for the test server
  static const int defaultTestPort = 3002;

  /// Default port for the code deployment server
  static const int defaultCodeDeployPort = 3001;

  /// Default port for the accessibility service
  static const int defaultAccessibilityPort = 3003;

  /// Get the appropriate host for API calls based on platform
  static String getApiHost() {
    return kIsWeb ? 'localhost' : '10.0.2.2';
  }

  /// Get a configuration value from environment variables with fallback
  static String getConfigValue(String key, String defaultValue) {
    return dotenv.env[key] ?? defaultValue;
  }
}
