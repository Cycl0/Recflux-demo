import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import type { Express } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

export type User = {
	id: string;
	provider: 'google';
	email?: string;
	name?: string;
	photo?: string;
};

declare module 'express-session' {
	interface SessionData {
		user?: User;
	}
}

export function configureAuth(app: Express) {
	const {
		GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET,
		GOOGLE_CALLBACK_URL,
		SESSION_SECRET
	} = process.env as Record<string, string | undefined>;

	if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
		console.warn('Google OAuth not configured. Missing envs.');
		return;
	}

	app.use(
		session({
			secret: SESSION_SECRET || 'dev-secret',
			resave: false,
			saveUninitialized: false,
			cookie: { secure: false }
		})
	);

	passport.serializeUser((user: any, done) => done(null, user));
	passport.deserializeUser((obj: any, done) => done(null, obj));

	passport.use(
		new GoogleStrategy(
			{
				clientID: GOOGLE_CLIENT_ID,
				clientSecret: GOOGLE_CLIENT_SECRET,
				callbackURL: GOOGLE_CALLBACK_URL
			},
			(_accessToken, _refreshToken, profile: Profile, done) => {
				const user: User = {
					id: profile.id,
					provider: 'google',
					email: profile.emails?.[0]?.value,
					name: profile.displayName,
					photo: profile.photos?.[0]?.value
				};
				return done(null, user);
			}
		)
	);

	app.use(passport.initialize());
	app.use(passport.session());

	app.get('/auth/google', (req, res, next) => {
		// Preserve WhatsApp sender (from) via state param
		const state = typeof req.query.state === 'string' ? req.query.state : undefined;
		const authenticator = passport.authenticate('google', {
			scope: ['profile', 'email'],
			state
		});
		(authenticator as any)(req, res, next);
	});

	app.get(
		'/auth/google/callback',
		passport.authenticate('google', { failureRedirect: '/auth/failure' }),
		async (req, res) => {
			// Store user on session
			req.session.user = req.user as User;
			// Initialize or reset project clone at login
			// try {
			// 	const projectDir = process.env.CLONED_TEMPLATE_DIR || path.resolve(process.cwd(), 'project');
			// 	const templateDir = '/_template';
			// 	try { await fs.rm(projectDir, { recursive: true, force: true }); } catch {}
			// 	await fs.mkdir(projectDir, { recursive: true });
			// 	await fs.cp(templateDir, projectDir, { recursive: true });
			// 	process.env.CLONED_TEMPLATE_DIR = projectDir;
			// 	console.log(`[AUTH] Project initialized at ${projectDir} from template ${templateDir}`);
			// } catch (e: any) {
			// 	console.warn('[AUTH] Failed to initialize project from template:', e?.message || e);
			// }
			// Parse state to get platform and user ID info
			const stateParam = typeof req.query.state === 'string' ? req.query.state : undefined;
			let platform = 'whatsapp'; // default
			let userId = stateParam;
			
			// Try to parse JSON state (new format with platform info)
			if (stateParam) {
				try {
					const parsed = JSON.parse(decodeURIComponent(stateParam));
					if (parsed.platform && parsed.userId) {
						platform = parsed.platform;
						userId = parsed.userId;
					}
				} catch {
					// If not JSON, treat as plain WhatsApp user ID (legacy format)
					userId = stateParam;
				}
			}
			
			console.log(`[AUTH] OAuth callback - platform: ${platform}, userId: ${userId}`);
			
			// Link user to logged in Google account for future tool calls
			if (userId) {
				try { 
					linkWhatsAppToUser(userId, req.session.user as User); 
					console.log(`[AUTH] Linked ${platform} user ${userId} to Google account ${req.session.user?.email}`);
				} catch (e) {
					console.error(`[AUTH] Failed to link user:`, e);
				}
			}
			
			// Redirect based on platform
			if (platform === 'telegram') {
				// For Telegram, redirect directly to the bot using Telegram deep link
				// Format: https://t.me/botusername or tg://resolve?domain=botusername
				const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME || 'your_bot_name_bot';
				const telegramUrl = `https://t.me/${telegramBotUsername}`;
				console.log(`[AUTH] Redirecting Telegram user to: ${telegramUrl}`);
				return res.redirect(telegramUrl);
			} else {
				// For WhatsApp, redirect to wa.me deep link
				const businessNumber = process.env.WHATSAPP_PHONE_NUMBER;
				if (businessNumber) {
					const waUrl = `https://wa.me/${businessNumber}`;
					return res.redirect(waUrl);
				}
			}
			
			return res.redirect('/auth/success');
		}
	);

	app.get('/auth/success', (req, res) => {
		if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
		res.json({ ok: true, user: req.session.user });
	});

	app.get('/auth/failure', (_req, res) => {
		res.status(401).json({ ok: false, error: 'Google auth failed' });
	});

	app.post('/auth/logout', (req, res) => {
		req.logout(() => {
			req.session.destroy(() => {
				res.json({ ok: true });
			});
		});
	});
}

// In-memory map from WhatsApp sender id to the logged-in user
const whatsappToUser: Map<string, User> = new Map();

export function linkWhatsAppToUser(whatsappFrom: string, user: User) {
	whatsappToUser.set(whatsappFrom, user);
}

export function getUserByWhatsApp(whatsappFrom: string): User | undefined {
	return whatsappToUser.get(whatsappFrom);
}


