import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
export function configureAuth(app) {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, SESSION_SECRET } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
        console.warn('Google OAuth not configured. Missing envs.');
        return;
    }
    app.use(session({
        secret: SESSION_SECRET || 'dev-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
    }, (_accessToken, _refreshToken, profile, done) => {
        const user = {
            id: profile.id,
            provider: 'google',
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            photo: profile.photos?.[0]?.value
        };
        return done(null, user);
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.get('/auth/google', (req, res, next) => {
        // Preserve WhatsApp sender (from) via state param
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const authenticator = passport.authenticate('google', {
            scope: ['profile', 'email'],
            state
        });
        authenticator(req, res, next);
    });
    app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth/failure' }), async (req, res) => {
        // Store user on session
        req.session.user = req.user;
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
        // Redirect back to WhatsApp chat using wa.me deep link.
        const from = typeof req.query.state === 'string' ? req.query.state : undefined;
        const businessNumber = process.env.WHATSAPP_PHONE_NUMBER;
        // Link WhatsApp sender to logged in user for future tool calls
        if (from) {
            try {
                linkWhatsAppToUser(from, req.session.user);
            }
            catch { }
        }
        // wa.me only needs the number (recipient). If we have `from`, prefer redirecting to our business chat page.
        // Fallback to /auth/success if we lack context
        if (businessNumber) {
            const waUrl = `https://wa.me/${businessNumber}`;
            return res.redirect(waUrl);
        }
        return res.redirect('/auth/success');
    });
    app.get('/auth/success', (req, res) => {
        if (!req.session.user)
            return res.status(401).json({ error: 'Not logged in' });
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
const whatsappToUser = new Map();
export function linkWhatsAppToUser(whatsappFrom, user) {
    whatsappToUser.set(whatsappFrom, user);
}
export function getUserByWhatsApp(whatsappFrom) {
    return whatsappToUser.get(whatsappFrom);
}
