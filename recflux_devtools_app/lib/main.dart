import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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
import 'package:flutter/foundation.dart' show kIsWeb;
import 'utils/config_utils.dart';

Future<void> main() async {
  // Ensure Flutter is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  try {
    await dotenv.load(fileName: ".env");
    print("Environment variables loaded successfully");

    await Supabase.initialize(
      url: dotenv.env['NEXT_PUBLIC_SUPABASE_URL']!,
      anonKey: dotenv.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    );
  } catch (e) {
    print("Failed to load environment variables: $e");
    // Create fallback environment variables for development
    dotenv.env['TEST_USER_EMAIL'] = 'test@example.com';
    dotenv.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = 'your-client-id-here';
  }

  // For web, print a message about the redirect URI
  if (kIsWeb) {
    final host = ConfigUtils.getApiHost();
    print(
      "For Google Sign-In on web, make sure to add http://$host:8080/ as an authorized redirect URI in Google Cloud Console",
    );
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => TestRunner()),
        ChangeNotifierProvider(create: (context) => CodeEditorProvider()),
        ChangeNotifierProvider(create: (context) => AuthService()),
        ChangeNotifierProvider(create: (context) => ChatProvider()),
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
      final authService = Provider.of<AuthService>(context, listen: false);
      final codeEditorProvider =
          Provider.of<CodeEditorProvider>(context, listen: false);
      authService.setAuthStateChangedCallback(() {
        codeEditorProvider.refreshOnAuthChange();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return const RecfluxApp();
  }
}

class RecfluxApp extends StatelessWidget {
  const RecfluxApp({super.key});

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
        if (authService.isSignedIn) {
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
          if (authService.isSignedIn)
            Row(
              children: [
                if (authService.userPhotoUrl != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: CircleAvatar(
                      backgroundImage: NetworkImage(authService.userPhotoUrl!),
                      radius: 16,
                    ),
                  ),
                Text(authService.userName ?? authService.userEmail ?? 'User'),
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
