import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'user_model.dart';

class AuthService with ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  GoogleSignIn? _googleSignIn;
  Function()? _onAuthStateChanged;

  String? _userEmail;
  String? _userName;
  String? _userPhotoUrl;
  bool _isSignedIn = false;

  String? get userEmail => _userEmail;
  String? get userName => _userName;
  String? get userPhotoUrl => _userPhotoUrl;
  bool get isSignedIn => _isSignedIn;

  UserModel? get user {
    if (!_isSignedIn || _userEmail == null) return null;
    return UserModel(
      email: _userEmail!,
      name: _userName,
      photoUrl: _userPhotoUrl,
    );
  }

  String get testEmail => 'test@example.com';

  void setAuthStateChangedCallback(Function() callback) {
    _onAuthStateChanged = callback;
  }

  AuthService() {
    _initGoogleSignIn();
    _initSupabaseAuth();
  }

  void _initGoogleSignIn() {
    final clientId = dotenv.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'];
    if (clientId != null && clientId.isNotEmpty && kIsWeb) {
      _googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
        clientId: clientId,
      );
      print('Initialized Google Sign-In for web with clientId');
    } else if (!kIsWeb) {
      _googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);
    } else {
      print(
          'Google Sign-In client ID not configured. Google Sign-In will be disabled.');
    }
  }

  void _initSupabaseAuth() {
    // Listen to auth state changes
    _supabase.auth.onAuthStateChange.listen((data) {
      final AuthChangeEvent event = data.event;
      final Session? session = data.session;

      print('Auth state changed: $event');

      if (event == AuthChangeEvent.signedIn && session != null) {
        _updateUserFromSession(session);
      } else if (event == AuthChangeEvent.signedOut) {
        _clearUserData();
      }
    });

    // Check if user is already signed in
    final session = _supabase.auth.currentSession;
    if (session != null) {
      _updateUserFromSession(session);
    }
  }

  void _updateUserFromSession(Session session) {
    final user = session.user;
    _userEmail = user.email?.toLowerCase();
    _userName = user.userMetadata?['full_name'] ?? user.userMetadata?['name'];
    _userPhotoUrl = user.userMetadata?['avatar_url'];
    _isSignedIn = true;

    print('User signed in via Supabase: $_userEmail');
    notifyListeners();
    _onAuthStateChanged?.call();

    // Ensure user exists in our users table
    _ensureUserExists(user);
  }

  Future<void> _ensureUserExists(User user) async {
    try {
      // Check if user already exists in our users table
      if (user.email == null) {
        print('User email is null, cannot create user record');
        return;
      }

      final existingUser = await _supabase
          .from('users')
          .select()
          .eq('email', user.email!)
          .maybeSingle();

      if (existingUser == null) {
        print('Creating new user record for: ${user.email}');

        // Create user in our users table
        final userData = <String, dynamic>{
          'email': user.email ?? '',
          'username':
              user.email?.split('@')[0] ?? 'user_${user.id.substring(0, 8)}',
        };

        if (user.appMetadata?['provider'] == 'google') {
          userData['google_id'] = user.id;
        }

        final fullName =
            user.userMetadata?['full_name'] ?? user.userMetadata?['name'];
        if (fullName != null) {
          userData['full_name'] = fullName;
        }

        final avatarUrl = user.userMetadata?['avatar_url'];
        if (avatarUrl != null) {
          userData['avatar_url'] = avatarUrl;
        }

        await _supabase.from('users').insert(userData);
        print('Created user record in database: ${user.email}');
      } else {
        print(
            'Found existing user record: ${existingUser['id']} for email: ${user.email}');
      }
    } catch (e) {
      print('Error ensuring user exists: $e');
    }
  }

  void _clearUserData() {
    _userEmail = null;
    _userName = null;
    _userPhotoUrl = null;
    _isSignedIn = false;
    notifyListeners();
    _onAuthStateChanged?.call();
  }

  Future<bool> signInWithGoogle() async {
    if (_googleSignIn == null) {
      print(
          'Google Sign-In is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env file.');
      return false;
    }

    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn!.signIn();
      if (googleUser == null) {
        return false;
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      print(
          'Google auth - idToken: ${googleAuth.idToken != null ? "present" : "null"}');
      print(
          'Google auth - accessToken: ${googleAuth.accessToken != null ? "present" : "null"}');

      AuthResponse response;

      if (googleAuth.idToken != null) {
        // Try with idToken first
        response = await _supabase.auth.signInWithIdToken(
          provider: OAuthProvider.google,
          idToken: googleAuth.idToken!,
          accessToken: googleAuth.accessToken,
        );
      } else if (googleAuth.accessToken != null) {
        // For web, we'll use the OAuth flow which will redirect
        if (kIsWeb) {
          await _supabase.auth.signInWithOAuth(
            OAuthProvider.google,
            redirectTo: '${Uri.base.origin}/auth/callback',
          );
          return true; // The redirect will handle the rest
        } else {
          throw Exception(
              'Access token authentication not supported on mobile');
        }
      } else {
        throw Exception('No authentication tokens received from Google');
      }

      if (response.user != null) {
        print(
            'Successfully signed in with Google via Supabase: ${response.user!.email}');
        return true;
      } else {
        print(
            'Failed to sign in with Google via Supabase - no user in response');
        return false;
      }
    } catch (error) {
      print('Error signing in with Google: $error');
      return false;
    }
  }

  Future<bool> signInWithEmailPassword(String email, String password) async {
    try {
      final AuthResponse response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        print('Successfully signed in with email: ${response.user!.email}');
        return true;
      } else {
        print('Failed to sign in with email');
        return false;
      }
    } catch (error) {
      print('Error signing in with email/password: $error');
      return false;
    }
  }

  Future<bool> signInAsTestUser() async {
    try {
      // For test user, we'll create a session manually
      _userEmail = testEmail;
      _userName = 'Test User';
      _userPhotoUrl = null;
      _isSignedIn = true;

      print('Signed in as test user: $_userEmail');
      notifyListeners();
      return true;
    } catch (error) {
      print('Error signing in as test user: $error');
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      if (_googleSignIn != null) {
        await _googleSignIn!.signOut();
      }

      await _supabase.auth.signOut();
      _clearUserData();
    } catch (error) {
      print('Error signing out: $error');
    }
  }
}
