const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

describe('Authentication Endpoints', () => {
    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        // Clean up and disconnect
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clear users before each test
        await User.deleteMany({});
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPass123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User registered successfully!');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('email', userData.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should return error for duplicate email', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPass123'
            };

            // Register first user
            await request(app)
                .post('/api/auth/register')
                .send(userData);

            // Try to register with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'User already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create a test user
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPass123'
            };

            await request(app)
                .post('/api/auth/register')
                .send(userData);
        });

        it('should login successfully with valid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'TestPass123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
        });

        it('should return error for invalid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Invalid credentials');
        });
    });
}); 