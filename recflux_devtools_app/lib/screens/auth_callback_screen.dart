import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthCallbackScreen extends StatefulWidget {
  const AuthCallbackScreen({Key? key}) : super(key: key);

  @override
  State<AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends State<AuthCallbackScreen> {
  @override
  void initState() {
    super.initState();
    _handleAuthCallback();
  }

  Future<void> _handleAuthCallback() async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        // Successfully authenticated, navigate back to main app
        if (mounted) {
          Navigator.of(context).pushReplacementNamed('/home');
        }
      } else {
        // No session, go back to login
        if (mounted) {
          Navigator.of(context).pushReplacementNamed('/login');
        }
      }
    } catch (e) {
      print('Error handling auth callback: $e');
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/login');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Completing authentication...'),
          ],
        ),
      ),
    );
  }
}
