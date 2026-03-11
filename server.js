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
const DATA_COLLECTIONS = ['income', 'expenses', 'savings', 'settings'];

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

async function replaceCollection(db, userId, type, items) {
  const collection = db.collection(type);
  await collection.deleteMany({ userId });

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const documents = items.map((item) => {
    const { id, _id, ...rest } = item;

    return {
      ...rest,
      userId,
      createdAt: rest.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
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

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/api/users/:userId/export', async (req, res) => {
  const { userId } = req.params;

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

app.delete('/api/users/:userId/data', async (req, res) => {
  const { userId } = req.params;

  try {
    const db = await getDb();
    await Promise.all(DATA_COLLECTIONS.map((type) => db.collection(type).deleteMany({ userId })));
    return res.status(204).send();
  } catch (error) {
    console.error('Clear data failed:', error);
    return res.status(500).json({ error: 'Failed to clear data.' });
  }
});

app.patch('/api/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;
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
      _id: { $ne: new ObjectId(userId) }
    });

    if (duplicate) {
      return res.status(409).json({ error: 'Email is already in use.' });
    }

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          name: String(name).trim(),
          email: normalizedEmail,
          updatedAt: new Date().toISOString()
        }
      }
    );

    const user = await users.findOne({ _id: new ObjectId(userId) });
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Profile update failed:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.patch('/api/users/:userId/password', async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user || !verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const { salt, hash } = createPasswordHash(newPassword);
    await users.updateOne(
      { _id: user._id },
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

app.get('/api/users/:userId/:type', async (req, res) => {
  const { userId, type } = req.params;

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

app.post('/api/users/:userId/:type', async (req, res) => {
  const { userId, type } = req.params;

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

app.put('/api/users/:userId/:type', async (req, res) => {
  const { userId, type } = req.params;

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

app.patch('/api/users/:userId/:type/:id', async (req, res) => {
  const { type, id } = req.params;

  if (!ensureValidCollection(type)) {
    return res.status(404).json({ error: 'Unknown data collection.' });
  }

  try {
    const db = await getDb();
    await db.collection(type).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...req.body,
          updatedAt: new Date().toISOString()
        }
      }
    );

    const item = await db.collection(type).findOne({ _id: new ObjectId(id) });
    return res.json({ item: serializeDocument(item) });
  } catch (error) {
    console.error(`Update ${type} failed:`, error);
    return res.status(500).json({ error: `Failed to update ${type} item.` });
  }
});

app.delete('/api/users/:userId/:type/:id', async (req, res) => {
  const { type, id } = req.params;

  if (!ensureValidCollection(type)) {
    return res.status(404).json({ error: 'Unknown data collection.' });
  }

  try {
    const db = await getDb();
    await db.collection(type).deleteOne({ _id: new ObjectId(id) });
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
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`MongoDB: ${MONGODB_URI}/${MONGODB_DB}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
