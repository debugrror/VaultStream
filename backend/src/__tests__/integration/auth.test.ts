import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../routes/auth';
import { database } from '@config/database';
import { User } from '@models/User';

let app: Application;

beforeAll(async () => {
  // Connect to test database
  await database.connect();
  
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterAll(async () => {
  await User.deleteMany({});
  await database.disconnect();
});

describe('Auth Integration Tests', () => {
  const testUser = {
    email: 'integrationtest@example.com',
    username: 'integrationtester',
    password: 'SecurePassword123',
  };

  let authToken: string;

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(testUser.email);
    expect(response.body.data.token).toBeDefined();

    authToken = response.body.data.token;
  });

  it('should reject duplicate registration', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(400);
  });

  it('should login with correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword',
      })
      .expect(401);
  });

  it('should get current user with valid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data.user.email).toBe(testUser.email);
  });

  it('should reject request without token', async () => {
    await request(app)
      .get('/api/auth/me')
      .expect(401);
  });
});
