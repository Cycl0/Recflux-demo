import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:async';

import 'user_model.dart';

class AuthService extends ChangeNotifier {
  final SupabaseClient _supabase;
  User? _user;
  String? _supabaseUserId;
  int? _credits;
  String? _subscriptionStatus;
  bool _isLoading = true;
  bool _isCreditsLoading = true;
  Timer? _refreshTimer;

  AuthService(this._supabase) {
    _initializeAuth();
  }

  User? get user => _user;
  String? get supabaseUserId => _supabaseUserId;
  int? get credits => _credits;
  String? get subscriptionStatus => _subscriptionStatus;
  bool get isLoading => _isLoading;
  bool get isCreditsLoading => _isCreditsLoading;

  Future<void> _initializeAuth() async {
    _isLoading = true;
    notifyListeners();

    // Get current auth state
    final session = _supabase.auth.currentSession;
    _user = _supabase.auth.currentUser;

    if (_user != null && _user!.email != null) {
      await _fetchUserData(_user!.email!);
    }

    _isLoading = false;
    notifyListeners();

    // Listen for auth changes
    _supabase.auth.onAuthStateChange.listen((data) {
      final AuthChangeEvent event = data.event;
      final Session? session = data.session;

      _user = session?.user;

      if (_user != null && _user!.email != null) {
        _fetchUserData(_user!.email!);
      } else {
        _credits = null;
        _subscriptionStatus = null;
        _supabaseUserId = null;
        _isCreditsLoading = false;
      }

      notifyListeners();
    });

    // Set up periodic refresh for credits (every 5 minutes)
    _refreshTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      if (_user != null && _user!.email != null) {
        _fetchUserData(_user!.email!);
      }
    });
  }

  Future<void> _fetchUserData(String userEmail, {int retryCount = 0}) async {
    if (kDebugMode) {
      print(
          '[CREDITS] fetchUserData called for email: $userEmail, retry: $retryCount');
    }

    _isCreditsLoading = true;
    notifyListeners();

    try {
      // First, get the user ID by email for more secure operations
      if (kDebugMode) {
        print('[CREDITS] Looking up user ID for email: $userEmail');
      }

      final userIdResponse = await _supabase
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .single();

      final userId = userIdResponse['id'];
      if (userId == null) {
        if (retryCount < 3) {
          // Retry after delay if user might still be registering
          if (kDebugMode) {
            print(
                'User ID not found, retrying in ${(retryCount + 1) * 1000}ms...');
          }

          await Future.delayed(Duration(milliseconds: (retryCount + 1) * 1000));
          return _fetchUserData(userEmail, retryCount: retryCount + 1);
        }

        if (kDebugMode) {
          print(
              'User ID not found for email: $userEmail after $retryCount retries');
        }

        _credits = 0;
        _subscriptionStatus = null;
        _supabaseUserId = null;
        _isCreditsLoading = false;
        notifyListeners();
        return;
      }

      // Store the user ID for future use
      _supabaseUserId = userId;
      if (kDebugMode) {
        print('[CREDITS] Found user ID: $userId for email: $userEmail');
      }

      // Now use the user ID to fetch credits and plan
      if (kDebugMode) {
        print('[CREDITS] Querying supabase for user data by ID: $userId');
      }

      final userDataResponse = await _supabase
          .from('users')
          .select('credits, plan')
          .eq('id', userId)
          .single();

      _credits = userDataResponse['credits'] ?? 0;
      _subscriptionStatus = userDataResponse['plan'];

      if (kDebugMode) {
        print(
            '[CREDITS] User data fetched successfully: $_credits credits, plan: $_subscriptionStatus');
      }
    } catch (error) {
      if (kDebugMode) {
        print('Error fetching user data: $error');
      }

      if (error.toString().contains('Row not found') && retryCount < 3) {
        // Retry after delay if user might still be registering
        if (kDebugMode) {
          print('User not found, retrying in ${(retryCount + 1) * 1000}ms...');
        }

        await Future.delayed(Duration(milliseconds: (retryCount + 1) * 1000));
        return _fetchUserData(userEmail, retryCount: retryCount + 1);
      }

      _credits = 0;
      _subscriptionStatus = null;
      _supabaseUserId = null;
    } finally {
      _isCreditsLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshCredits() async {
    if (_user?.email != null) {
      await _fetchUserData(_user!.email!);
    }
  }

  Future<void> signIn() async {
    // Start the native Google Sign-In flow.
    final googleSignIn = GoogleSignIn(
      serverClientId: dotenv.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'],
    );
    final googleUser = await googleSignIn.signIn();
    final googleAuth = await googleUser!.authentication;
    final accessToken = googleAuth.accessToken;
    final idToken = googleAuth.idToken;

    if (idToken == null) {
      throw 'No ID token from Google!';
    }

    // Use the ID token to sign in to Supabase.
    await _supabase.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: idToken,
      accessToken: accessToken,
    );
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
    _user = null;
    _credits = null;
    _subscriptionStatus = null;
    _supabaseUserId = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
