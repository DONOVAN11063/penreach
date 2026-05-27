// Debug server to test auth routes
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Simple test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', { username, password: '***' });
        
        if (!username || !password) {
            return res.status(400).json({ 
                message: 'Username and password are required' 
            });
        }
        
        const ADMIN_USERNAME = 'admin';
        const ADMIN_PASSWORD = 'admin123';
        
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { 
                    username: username,
                    role: 'admin',
                    loginTime: new Date().toISOString()
                },
                process.env.JWT_SECRET || 'supersecretkey',
                { expiresIn: '24h' }
            );
            
            res.json({
                message: 'Login successful',
                token: token,
                admin: {
                    username: username,
                    role: 'admin'
                }
            });
        } else {
            res.status(401).json({ 
                message: 'Invalid username or password' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
});

app.get('/api/auth/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                message: 'No token provided' 
            });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        
        res.json({
            message: 'Token is valid',
            admin: {
                username: decoded.username,
                role: decoded.role
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ 
            message: 'Invalid or expired token' 
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Debug server listening on port ${PORT}`);
});
