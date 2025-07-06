# Microservices Architecture for Flutter App

This directory contains the modular microservices architecture for accessing your backend services from the Flutter app.

## Architecture Overview

```
lib/
├── services/
│   ├── api_client.dart          # Base HTTP client
│   ├── agentic_service.dart     # Agentic-structured-service client
│   ├── code_deploy_service.dart # Code-deploy-service client
│   ├── kafka_service.dart       # Kafka-producer-service client
│   ├── accessibility_service.dart # Accessibility-service client
│   └── service_manager.dart     # Service coordinator
├── config/
│   └── service_config.dart      # Service URLs configuration
├── models/
│   └── microservice_provider.dart # Provider for state management
└── examples/
    └── microservice_usage_examples.dart # Usage examples
```

## Quick Start

### 1. Initialize Services

The services are automatically initialized in `main.dart`:

```dart
// Initialize microservices
ServiceManager().initialize(
  agenticServiceUrl: ServiceConfig.finalAgenticServiceUrl,
  codeDeployServiceUrl: ServiceConfig.finalCodeDeployServiceUrl,
  kafkaServiceUrl: ServiceConfig.finalKafkaServiceUrl,
  accessibilityServiceUrl: ServiceConfig.finalAccessibilityServiceUrl,
);
```

### 2. Use in Widgets

```dart
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<MicroserviceProvider>(
      builder: (context, microserviceProvider, child) {
        return ElevatedButton(
          onPressed: () async {
            try {
              final response = await microserviceProvider.sendStructuredQuery(
                query: "Hello, world!",
                userEmail: "user@example.com",
              );
              print('Response: $response');
            } catch (e) {
              print('Error: $e');
            }
          },
          child: Text('Send Query'),
        );
      },
    );
  }
}
```

## Service Configuration

### Development vs Production

The `ServiceConfig` class automatically switches between development and production URLs:

```dart
// Development URLs (localhost)
static const String devAgenticServiceUrl = 'http://localhost:3001';

// Production URLs (your domain)
static const String prodAgenticServiceUrl = 'https://your-domain.com/agentic';
```

### Custom URL Override

For testing or custom deployments:

```dart
// Set custom URLs
ServiceConfig.setCustomUrls(
  agenticUrl: 'http://custom-server:3001',
  codeDeployUrl: 'http://custom-server:3002',
);

// Clear custom URLs
ServiceConfig.clearCustomUrls();
```

## Available Services

### 1. Agentic Service (`agentic_service.dart`)

Handles structured queries and user credits.

```dart
// Send structured query
final response = await microserviceProvider.sendStructuredQuery(
  query: "Generate a React component",
  userEmail: "user@example.com",
  context: {"framework": "react", "style": "functional"},
);

// Get user credits
final credits = await microserviceProvider.getUserCredits("user@example.com");
```

### 2. Code Deploy Service (`code_deploy_service.dart`)

Handles code deployment to various platforms.

```dart
// Deploy code
final deployment = await microserviceProvider.deployCode(
  code: "console.log('Hello World');",
  language: "javascript",
  platform: "vercel",
  options: {"framework": "nextjs"},
);

// Check deployment status
final status = await microserviceProvider.getDeploymentStatus("deployment-id");
```

### 3. Kafka Service (`kafka_service.dart`)

Handles message publishing to Kafka topics.

```dart
// Send message to Kafka
await microserviceProvider.sendKafkaMessage(
  topic: "user-events",
  message: {
    "userId": "123",
    "action": "login",
    "timestamp": DateTime.now().toIso8601String(),
  },
  key: "user-123",
);
```

### 4. Accessibility Service (`accessibility_service.dart`)

Analyzes code for accessibility issues.

```dart
// Analyze accessibility
final analysis = await microserviceProvider.analyzeAccessibility(
  code: "<button>Click me</button>",
  language: "html",
  options: {"level": "AA"},
);

// Get guidelines
final guidelines = await microserviceProvider.accessibility.getGuidelines("html");
```

## Error Handling

All services include comprehensive error handling:

```dart
try {
  final response = await microserviceProvider.sendStructuredQuery(
    query: "Hello",
    userEmail: "user@example.com",
  );
  // Handle success
} catch (e) {
  // Handle error
  print('Error: $e');
}
```

## State Management

The `MicroserviceProvider` provides state management:

```dart
Consumer<MicroserviceProvider>(
  builder: (context, provider, child) {
    return Column(
      children: [
        if (provider.isLoading)
          CircularProgressIndicator(),
        if (provider.lastError != null)
          Text('Error: ${provider.lastError}'),
        if (provider.lastResponse != null)
          Text('Response: ${provider.lastResponse}'),
      ],
    );
  },
);
```

## Testing

### Unit Testing

```dart
test('should send structured query', () async {
  final provider = MicroserviceProvider();
  
  // Mock the service or use test URLs
  ServiceConfig.setCustomUrls(
    agenticUrl: 'http://localhost:3001',
  );
  
  final response = await provider.sendStructuredQuery(
    query: "test",
    userEmail: "test@example.com",
  );
  
  expect(response, isNotNull);
});
```

### Integration Testing

```dart
testWidgets('should display loading state', (tester) async {
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => MicroserviceProvider()),
      ],
      child: MyWidget(),
    ),
  );
  
  // Test loading states, error handling, etc.
});
```

## Best Practices

1. **Always handle errors**: Wrap service calls in try-catch blocks
2. **Use loading states**: Check `provider.isLoading` for UI feedback
3. **Validate responses**: Check response structure before using data
4. **Cache when appropriate**: Store frequently accessed data
5. **Use proper typing**: Define response models for better type safety

## Troubleshooting

### Common Issues

1. **Connection refused**: Check if microservices are running
2. **CORS errors**: Ensure proper CORS configuration on backend
3. **Authentication errors**: Verify user authentication state
4. **Timeout errors**: Check network connectivity and service health

### Debug Mode

Enable debug logging:

```dart
// In main.dart
if (kDebugMode) {
  print('Service URLs:');
  print('- Agentic: ${ServiceConfig.finalAgenticServiceUrl}');
  print('- Code Deploy: ${ServiceConfig.finalCodeDeployServiceUrl}');
  print('- Kafka: ${ServiceConfig.finalKafkaServiceUrl}');
  print('- Accessibility: ${ServiceConfig.finalAccessibilityServiceUrl}');
}
```

## Contributing

When adding new services:

1. Create a new service class in `services/`
2. Add it to `ServiceManager`
3. Update `ServiceConfig` with URLs
4. Add methods to `MicroserviceProvider`
5. Create usage examples
6. Update this documentation 