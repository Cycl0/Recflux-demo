import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/auth_service.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class AuthCallbackScreen extends StatefulWidget {
  const AuthCallbackScreen({super.key});

  @override
  State<AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends State<AuthCallbackScreen> {
  bool _isProcessing = true;
  String _statusMessage = 'Processing authentication...';
  bool _isError = false;

  @override
  void initState() {
    super.initState();
    _processAuthCallback();
  }

  Future<void> _processAuthCallback() async {
    try {
      if (kIsWeb) {
        await _processWebAuth();
      } else {
        await _processMobileAuth();
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _statusMessage = 'Authentication error: $e';
        _isError = true;
      });
      print('Auth error: $e');
    }
  }

  Future<void> _processWebAuth() async {
    final authService = Provider.of<AuthService>(context, listen: false);

    // For web, the URL is already handled by the Supabase client
    // We just need to check if the session exists
    final session = Supabase.instance.client.auth.currentSession;

    if (session != null) {
      print('Web auth successful: ${session.user.email}');
      // The session will automatically update the AuthService

      if (mounted) {
        setState(() {
          _isProcessing = false;
          _statusMessage = 'Authentication successful!';
        });

        // Navigate to home after a short delay
        Future.delayed(const Duration(seconds: 1), () {
          Navigator.of(context).pushReplacementNamed('/home');
        });
      }
    } else {
      if (mounted) {
        setState(() {
          _isProcessing = false;
          _statusMessage = 'Authentication failed. Please try again.';
          _isError = true;
        });
      }
    }
  }

  Future<void> _processMobileAuth() async {
    // For mobile, we need to manually check the session
    // The deep link handling is done in main.dart
    final session = Supabase.instance.client.auth.currentSession;

    if (session != null) {
      print('Mobile auth successful: ${session.user.email}');
      // The session will automatically update the AuthService

      if (mounted) {
        setState(() {
          _isProcessing = false;
          _statusMessage = 'Authentication successful!';
        });

        // Navigate to home after a short delay
        Future.delayed(const Duration(seconds: 1), () {
          Navigator.of(context).pushReplacementNamed('/home');
        });
      }
    } else {
      // Wait a bit longer for the session to be available
      await Future.delayed(const Duration(seconds: 3));
      final retrySession = Supabase.instance.client.auth.currentSession;

      if (retrySession != null) {
        print('Mobile auth successful after retry: ${retrySession.user.email}');
        // The session will automatically update the AuthService

        if (mounted) {
          setState(() {
            _isProcessing = false;
            _statusMessage = 'Authentication successful!';
          });

          // Navigate to home after a short delay
          Future.delayed(const Duration(seconds: 1), () {
            Navigator.of(context).pushReplacementNamed('/home');
          });
        }
      } else {
        // Try one more time with a longer delay
        await Future.delayed(const Duration(seconds: 3));
        final lastRetrySession = Supabase.instance.client.auth.currentSession;

        if (lastRetrySession != null) {
          print(
              'Mobile auth successful after final retry: ${lastRetrySession.user.email}');

          if (mounted) {
            setState(() {
              _isProcessing = false;
              _statusMessage = 'Authentication successful!';
            });

            Future.delayed(const Duration(seconds: 1), () {
              Navigator.of(context).pushReplacementNamed('/home');
            });
          }
        } else {
          if (mounted) {
            setState(() {
              _isProcessing = false;
              _statusMessage = 'Authentication failed. Please try again.';
              _isError = true;
            });
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isProcessing)
              const CircularProgressIndicator()
            else if (_isError)
              const Icon(Icons.error_outline, color: Colors.red, size: 48)
            else
              const Icon(Icons.check_circle, color: Colors.green, size: 48),
            const SizedBox(height: 16),
            Text(
              _statusMessage,
              style: TextStyle(
                fontSize: 18,
                color: _isError ? Colors.red : null,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (_isError)
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushReplacementNamed('/login');
                },
                child: const Text('Return to Login'),
              ),
          ],
        ),
      ),
    );
  }
}
