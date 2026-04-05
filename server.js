const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

loadEnvFile();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'budgeting-buddy';
const SESSION_COOKIE_NAME = 'bb_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const DATA_COLLECTIONS = ['income', 'expenses', 'savings', 'settings'];
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const SESSION_SECRET = getSessionSecret();

let dbPromise;

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getSessionSecret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  if (IS_PRODUCTION) {
    throw new Error('SESSION_SECRET is required in production.');
  }

  return 'development-session-secret-change-me';
}

function getDb() {
  if (!dbPromise) {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    dbPromise = client.connect().then((connectedClient) => connectedClient.db(MONGODB_DB));
  }

  return dbPromise;
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email
  };
}

function serializeDocument(document) {
  if (!document) return null;

  const { _id, ...rest } = document;
  return {
    id: _id.toString(),
    ...rest
  };
}

function ensureValidCollection(type) {
  return DATA_COLLECTIONS.includes(type);
}

async function ensureDemoUser(db) {
  if (IS_PRODUCTION || process.env.DEMO_USER_ENABLED === 'false') {
    return;
  }

  const users = db.collection('users');
  const existing = await users.findOne({ email: 'demo@example.com' });

  if (existing) return;

  const { salt, hash } = createPasswordHash('demo123');
  await users.insertOne({
    name: 'Demo User',
    email: 'demo@example.com',
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, entry) => {
    const [name, ...valueParts] = entry.trim().split('=');
    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(valueParts.join('=') || '');
    return cookies;
  }, {});
}

function createSessionToken(userId, expiresAt) {
  const payload = `${userId}.${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');

  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [userId, expiresAt, signature] = parts;
  const payload = `${userId}.${expiresAt}`;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
    return null;
  }

  if (!ObjectId.isValid(userId) || Number(expiresAt) <= Date.now()) {
    return null;
  }

  return { userId, expiresAt: Number(expiresAt) };
}

function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.httpOnly) segments.push('HttpOnly');
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  if (options.secure) segments.push('Secure');
  if (options.path) segments.push(`Path=${options.path}`);
  if (typeof options.maxAge === 'number') segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);

  return segments.join('; ');
}

function setSessionCookie(res, userId) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = createSessionToken(userId, expiresAt);

  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000
  }));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'Lax',
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: 0
  }));
}

async function getAuthenticatedUser(req) {
  const cookies = parseCookies(req.headers.cookie);
  const session = verifySessionToken(cookies[SESSION_COOKIE_NAME]);

  if (!session) {
    return null;
  }

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) });
  return user || null;
}

async function requireAuth(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Authentication required.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Authentication check failed:', error);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

async function replaceCollection(db, userId, type, items) {
  const collection = db.collection(type);
  await collection.deleteMany({ userId });

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const documents = items.map((item) => {
    const { id, _id, ...rest } = item;
    const timestamp = new Date().toISOString();

    return {
      ...rest,
      userId,
      createdAt: rest.createdAt || timestamp,
      updatedAt: rest.updatedAt || timestamp
    };
  });

  const result = await collection.insertMany(documents);
  return Object.values(result.insertedIds).map((insertedId, index) => serializeDocument({
    _id: insertedId,
    ...documents[index]
  }));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await users.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({ error: 'Email is already in use.' });
    }

    const { salt, hash } = createPasswordHash(password);
    const timestamp = new Date().toISOString();
    const result = await users.insertOne({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const user = await users.findOne({ _id: result.insertedId });
    setSessionCookie(res, user._id.toString());
    return res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Register failed:', error);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    setSessionCookie(res, user._id.toString());
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  return res.status(204).send();
});

app.get('/api/auth/session', requireAuth, async (req, res) => {
  return res.json({ user: toPublicUser(req.user) });
});

app.get('/api/me/export', requireAuth, async (req, res) => {
  const userId = req.user._id.toString();

  try {
    const db = await getDb();
    const [income, expenses, savings, settings] = await Promise.all(
      DATA_COLLECTIONS.map((type) =>
        db.collection(type).find({ userId }).toArray().then((items) => items.map(serializeDocument))
      )
    );

    return res.json({
      income,
      expenses,
      savings,
      settings,
      exportDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Export failed:', error);
    return res.status(500).json({ error: 'Export failed.' });
  }
});

app.delete('/api/me/data', requireAuth, async (req, res) => {
  const userId = req.user._id.toString();

  try {
    const db = await getDb();
    await Promise.all(DATA_COLLECTIONS.map((type) => db.collection(type).deleteMany({ userId })));
    return res.status(204).send();
  } catch (error) {
    console.error('Clear data failed:', error);
    return res.status(500).json({ error: 'Failed to clear data.' });
  }
});

app.patch('/api/me/profile', requireAuth, async (req, res) => {
  const { name, email } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');
    const normalizedEmail = String(email).trim().toLowerCase();
    const duplicate = await users.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id }
    });

    if (duplicate) {
      return res.status(409).json({ error: 'Email is already in use.' });
    }

    await users.updateOne(
      { _id: req.user._id },
      {
        $set: {
          name: String(name).trim(),
          email: normalizedEmail,
          updatedAt: new Date().toISOString()
        }
      }
    );

    const user = await users.findOne({ _id: req.user._id });
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Profile update failed:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.patch('/api/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');
    const user = await users.findOne({ _id: req.user._id });

    if (!user || !verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const { salt, hash } = createPasswordHash(newPassword);
    await users.updateOne(
      { _id: req.user._id },
      {
        $set: {
          passwordSalt: salt,
          passwordHash: hash,
          updatedAt: new Date().toISOString()
        }
      }
    );

    return res.status(204).send();
  } catch (error) {
    console.error('Password update failed:', error);
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

app.get('/api/me/:type', requireAuth, async (req, res) => {
  const { type } = req.params;
  const userId = req.user._id.toString();

  if (!ensureValidCollection(type)) {
    return res.status(404).json({ error: 'Unknown data collection.' });
  }

  try {
    const db = await getDb();
    const items = await db.collection(type).find({ userId }).sort({ createdAt: 1 }).toArray();
    return res.json({ items: items.map(serializeDocument) });
  } catch (error) {
    console.error(`Fetch ${type} failed:`, error);
    return res.status(500).json({ error: `Failed to fetch ${type}.` });
  }
});

app.post('/api/me/:type', requireAuth, async (req, res) => {
  const { type } = req.params;
  const userId = req.user._id.toString();

  if (!ensureValidCollection(type)) {
    return res.status(404).json({ error: 'Unknown data collection.' });
  }

  try {
    const db = await getDb();
    const { id, _id, ...rest } = req.body || {};
    const timestamp = new Date().toISOString();
    const document = {
      ...rest,
      userId,
      createdAt: rest.createdAt || timestamp,
      updatedAt: timestamp
    };

    const result = await db.collection(type).insertOne(document);
    return res.status(201).json({ item: serializeDocument({ _id: result.insertedId, ...document }) });
  } catch (error) {
    console.error(`Create ${type} failed:`, error);
    return res.status(500).json({ error: `Failed to create ${type} item.` });
  }
});

app.put('/api/me/:type', requireAuth, async (req, res) => {
  const { type } = req.params;
  const userId = req.user._id.toString();

  if (!ensureValidCollection(type)) {
    return res.status(404).json({ error: 'Unknown data collection.' });
  }

  try {
    const db = await getDb();
    const items = await replaceCollection(db, userId, type, req.body?.items || []);
    return res.json({ items });
  } catch (error) {
    console.error(`Replace ${type} failed:`, error);
    return res.status(500).json({ error: `Failed to replace ${type}.` });
  }
});

app.patch('/api/me/:type/:id', requireAuth, async (req, res) => {
  const { type, id } = req.params;
  const userId = req.user._id.toString();

  if (!ensureValidCollection(type)) {
    return res.status(404).json({ error: 'Unknown data collection.' });
  }

  try {
    const db = await getDb();
    const result = await db.collection(type).findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      {
        $set: {
          ...req.body,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    return res.json({ item: serializeDocument(result) });
  } catch (error) {
    console.error(`Update ${type} failed:`, error);
    return res.status(500).json({ error: `Failed to update ${type} item.` });
  }
});

app.delete('/api/me/:type/:id', requireAuth, async (req, res) => {
  const { type, id } = req.params;
  const userId = req.user._id.toString();

  if (!ensureValidCollection(type)) {
    return res.status(404).json({ error: 'Unknown data collection.' });
  }

  try {
    const db = await getDb();
    const result = await db.collection(type).deleteOne({ _id: new ObjectId(id), userId });

    if (!result.deletedCount) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(`Delete ${type} failed:`, error);
    return res.status(500).json({ error: `Failed to delete ${type} item.` });
  }
});

app.get('/navbar.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'navbar.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'dashboard.html'));
});

app.get('/income', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'income.html'));
});

app.get('/expenses', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'expenses.html'));
});

app.get('/savings', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'savings.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'settings.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'register.html'));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

getDb()
  .then((db) => ensureDemoUser(db))
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`MongoDB database: ${MONGODB_DB}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
