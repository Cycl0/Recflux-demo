import 'dart:io' show Platform;
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

  /// Default port for the dashboard service
  static const int defaultDashboardPort = 3004;

  /// VM IP address for development
  static const String vmIpAddress = "192.168.56.10";

  /// Get the appropriate host for API calls based on platform
  static String getApiHost() {
    if (kIsWeb) {
      print('Running on Web platform, using localhost');
      return 'localhost';
    } else if (Platform.isAndroid) {
      // For Android emulator, use 10.0.2.2 which maps to host's localhost
      // For physical devices connecting to VM, use the VM's IP address
      final androidHost = dotenv.env['API_HOST_ANDROID'] ?? vmIpAddress;
      print('Running on Android platform, using API host: $androidHost');
      return androidHost;
    } else if (Platform.isIOS) {
      // For iOS simulator, use localhost
      // For physical devices, use the IP address from environment or default to localhost
      final iosHost = dotenv.env['API_HOST_IOS'] ?? 'localhost';
      print('Running on iOS platform, using API host: $iosHost');
      return iosHost;
    } else {
      // For desktop platforms
      print('Running on Desktop platform, using localhost');
      return 'localhost';
    }
  }

  /// Get a configuration value from environment variables with fallback
  static String getConfigValue(String key, String defaultValue) {
    final value = dotenv.env[key] ?? defaultValue;
    print('Config value for $key: $value');
    return value;
  }
}
