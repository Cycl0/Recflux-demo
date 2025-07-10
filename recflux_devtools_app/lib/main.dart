import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:app_links/app_links.dart';
import 'package:url_strategy/url_strategy.dart';
import 'dart:async';
import 'screens/test_screen.dart';
import 'screens/code_editor_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/auth_callback_screen.dart';
import 'models/test_runner.dart';
import 'models/code_editor.dart';
import 'models/chat_provider.dart';
import 'models/auth_service.dart';
import 'models/microservice_provider.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'utils/config_utils.dart';
import 'services/service_manager.dart';
import 'config/service_config.dart';

Future<void> main() async {
  // Ensure Flutter is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Use path URL strategy for web (removes # from URLs)
  if (kIsWeb) {
    setPathUrlStrategy();
  }

  // Load environment variables
  try {
    await dotenv.load(fileName: ".env");
    print("Environment variables loaded successfully");

    // Initialize Supabase with deep link handling for mobile
    await Supabase.initialize(
      url: dotenv.env['NEXT_PUBLIC_SUPABASE_URL']!,
      anonKey: dotenv.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      debug: true,
    );

    print("Supabase initialized successfully");
  } catch (e) {
    print("Failed to load environment variables or initialize Supabase: $e");
    // Create fallback environment variables for development
    dotenv.env['TEST_USER_EMAIL'] = 'test@example.com';
    dotenv.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = 'your-client-id-here';
    dotenv.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID_ANDROID'] =
        'your-android-client-id-here';
  }

  // Print configuration instructions
  final host = ConfigUtils.getApiHost();

  // For web
  print(
    "For Google Sign-In on web, make sure to add http://$host:8080/ as an authorized JavaScript origin and http://$host:8080/auth/callback as an authorized redirect URI in Google Cloud Console",
  );

  // For Android
  print(
    "For Google Sign-In on Android, make sure to add 'com.example.recflux_test://login-callback' as an authorized redirect URI in Google Cloud Console",
  );

  // Get Supabase client instance
  final supabaseClient = Supabase.instance.client;

  // Create AuthService instance
  final authService = AuthService(supabaseClient);

  // Initialize ServiceManager with AuthService
  final serviceManager = ServiceManager();
  serviceManager.initialize(authService);

  print('Microservices initialized:');
  print('- Agentic Service: ${ServiceConfig.finalAgenticServiceUrl}');
  print('- Code Deploy Service: ${ServiceConfig.finalCodeDeployServiceUrl}');
  print('- Kafka Service: ${ServiceConfig.finalKafkaServiceUrl}');
  print(
      '- Accessibility Service: ${ServiceConfig.finalAccessibilityServiceUrl}');

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => TestRunner()),
        ChangeNotifierProvider(create: (context) => CodeEditorProvider()),
        ChangeNotifierProvider.value(value: authService),
        ChangeNotifierProvider(
            create: (context) => ChatProvider(
                  Provider.of<AuthService>(context, listen: false),
                  ServiceConfig(),
                )),
        ChangeNotifierProvider(
            create: (context) => MicroserviceProvider(
                  Provider.of<AuthService>(context, listen: false),
                )),
      ],
      child: const ProviderConnector(),
    ),
  );
}

class ProviderConnector extends StatefulWidget {
  const ProviderConnector({super.key});

  @override
  State<ProviderConnector> createState() => _ProviderConnectorState();
}

class _ProviderConnectorState extends State<ProviderConnector> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final codeEditorProvider =
          Provider.of<CodeEditorProvider>(context, listen: false);
      // No need for auth state callback, the AuthService now handles this internally
      codeEditorProvider.refreshOnAuthChange();
    });
  }

  @override
  Widget build(BuildContext context) {
    return const RecfluxApp();
  }
}

class RecfluxApp extends StatefulWidget {
  const RecfluxApp({super.key});

  @override
  State<RecfluxApp> createState() => _RecfluxAppState();
}

class _RecfluxAppState extends State<RecfluxApp> {
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      _initDeepLinkHandling();
    }
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  Future<void> _initDeepLinkHandling() async {
    // Handle app_links
    try {
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null) {
        print('Got initial deep link from app_links: $initialLink');
        _handleDeepLink(initialLink.toString());
      } else {
        print('No initial deep link found from app_links');
      }
    } catch (e) {
      print('Error getting initial deep link from app_links: $e');
    }

    // Subscribe to app_links future events
    _linkSubscription = _appLinks.uriLinkStream.listen((uri) {
      print('Got deep link from app_links: $uri');
      _handleDeepLink(uri.toString());
    }, onError: (err) {
      print('Error processing deep link from app_links: $err');
    });
  }

  void _handleDeepLink(String link) {
    print('Processing deep link: $link');

    // Check if this is an auth callback
    if (link.contains('login-callback')) {
      print('Detected auth callback in deep link');

      // Extract any auth parameters from the URL if present
      Uri uri = Uri.parse(link);
      Map<String, String> params = {};

      // Extract query parameters
      if (uri.queryParameters.isNotEmpty) {
        params.addAll(uri.queryParameters);
      }

      // Extract fragment parameters if present (after #)
      if (uri.fragment.isNotEmpty) {
        uri.fragment.split('&').forEach((element) {
          if (element.contains('=')) {
            final parts = element.split('=');
            params[parts[0]] = parts[1];
          }
        });
      }

      // Check if we have auth parameters
      if (params.containsKey('access_token') ||
          params.containsKey('refresh_token') ||
          params.containsKey('code')) {
        print('Deep link contains auth parameters: ${params.keys}');

        // If we have an access token, we can try to set the session manually
        if (params.containsKey('access_token')) {
          print('Found access_token in deep link, attempting to use it');
          // The Supabase client should handle these parameters automatically
          // But we can also try to set the session manually if needed
        }
      }

      // Check current session
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        print('Session exists after deep link callback: ${session.user.email}');

        // Navigate to home screen if we're mounted
        if (mounted) {
          // Need to wait a moment for the session to be fully processed
          Future.delayed(const Duration(milliseconds: 500), () {
            Navigator.of(context).pushReplacementNamed('/home');
          });
        }
      } else {
        print('No session found after deep link callback');

        // Try to get the session again after a short delay
        Future.delayed(const Duration(seconds: 2), () {
          final retrySession = Supabase.instance.client.auth.currentSession;
          if (retrySession != null) {
            print('Session found after retry: ${retrySession.user.email}');

            if (mounted) {
              Navigator.of(context).pushReplacementNamed('/home');
            }
          } else {
            print('Still no session found after retry');

            // Navigate to auth callback screen to handle the auth flow
            if (mounted) {
              Navigator.of(context).pushReplacementNamed('/auth/callback');
            }
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Recflux DevTools',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        brightness: Brightness.light,
        textTheme: GoogleFonts.poppinsTextTheme(Theme.of(context).textTheme),
      ),
      darkTheme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        brightness: Brightness.dark,
        textTheme: GoogleFonts.poppinsTextTheme(
          Theme.of(context).primaryTextTheme,
        ),
      ),
      themeMode: ThemeMode.system,
      initialRoute: '/',
      routes: {
        '/': (context) => const AuthenticationWrapper(),
        '/home': (context) => const MainNavigator(),
        '/login': (context) => const LoginScreen(),
        '/auth/callback': (context) => const AuthCallbackScreen(),
      },
    );
  }
}

class AuthenticationWrapper extends StatelessWidget {
  const AuthenticationWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, authService, _) {
        if (authService.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (authService.user != null) {
          return const MainNavigator();
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}

class MainNavigator extends StatefulWidget {
  const MainNavigator({super.key});

  @override
  State<MainNavigator> createState() => _MainNavigatorState();
}

class _MainNavigatorState extends State<MainNavigator> {
  int _selectedIndex = 0;

  // Keep the list of screens as instance variables to preserve their state.
  final List<Widget> _screens = [
    const TestScreen(),
    DashboardScreen(),
    const ChatScreen(),
    const CodeEditorScreen(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recflux DevTools'),
        actions: [
          if (authService.user != null)
            Row(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  child: CircleAvatar(
                    backgroundImage:
                        authService.user?.userMetadata?['avatar_url'] != null
                            ? NetworkImage(
                                authService.user!.userMetadata!['avatar_url'])
                            : null,
                    child: authService.user?.userMetadata?['avatar_url'] == null
                        ? const Icon(Icons.person)
                        : null,
                    radius: 16,
                  ),
                ),
                Text(authService.user?.userMetadata?['name'] ??
                    authService.user?.userMetadata?['full_name'] ??
                    authService.user?.email ??
                    'User'),
                IconButton(
                  icon: const Icon(Icons.logout),
                  tooltip: 'Sign Out',
                  onPressed: () async {
                    await authService.signOut();
                    if (context.mounted) {
                      Navigator.of(context).pushReplacementNamed('/login');
                    }
                  },
                ),
              ],
            ),
        ],
      ),
      body: IndexedStack(index: _selectedIndex, children: _screens),
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(icon: Icon(Icons.science), label: 'Test'),
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.chat), label: 'Chat'),
          BottomNavigationBarItem(icon: Icon(Icons.code), label: 'Editor'),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor:
            isDarkMode ? Colors.lightBlue[300] : Theme.of(context).primaryColor,
        unselectedItemColor: isDarkMode ? Colors.white70 : Colors.grey[700],
        backgroundColor: isDarkMode ? Colors.grey[900] : Colors.white,
        type: BottomNavigationBarType.fixed,
        onTap: _onItemTapped,
      ),
    );
  }
}
