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

  /// Load balancer IP address for production
  static const String loadBalancerIpAddress = "4.236.226.138";

  /// VM IP address for development
  static const String vmIpAddress =
      "4.236.226.138"; // Updated from 192.168.56.10

  /// Get the appropriate host for API calls based on platform
  static String getApiHost() {
    if (kIsWeb) {
      print('Running on Web platform, using localhost');
      return 'localhost';
    } else if (Platform.isAndroid) {
      // For Android devices, use the load balancer IP
      final androidHost =
          dotenv.env['API_HOST_ANDROID'] ?? loadBalancerIpAddress;
      print('Running on Android platform, using API host: $androidHost');
      return androidHost;
    } else if (Platform.isIOS) {
      // For iOS simulator, use localhost
      // For physical devices, use the IP address from environment or default to load balancer
      final iosHost = dotenv.env['API_HOST_IOS'] ?? loadBalancerIpAddress;
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
