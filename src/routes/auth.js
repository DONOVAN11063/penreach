const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Teacher } = require('../models');

// POST /api/auth/login - Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ 
                message: 'Username and password are required' 
            });
        }
        
        // Use environment variables for admin credentials
        const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
        
        // Validate credentials
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            // Create JWT token
            const token = jwt.sign(
                { 
                    username: username,
                    role: 'admin',
                    loginTime: new Date().toISOString()
                },
                process.env.JWT_SECRET || 'supersecretkey',
                { expiresIn: '24h' } // Token expires in 24 hours
            );
            
            // Return success response with token
            res.json({
                message: 'Login successful',
                token: token,
                admin: {
                    username: username,
                    role: 'admin'
                }
            });
            
        } else {
            // Invalid credentials
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

// POST /api/auth/verify - Verify JWT token
router.post('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                message: 'No token provided' 
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        
        // Token is valid
        res.json({
            message: 'Token is valid',
            admin: {
                username: decoded.username,
                role: decoded.role
            }
        });
        
    } catch (error) {
        console.error('Token verification error:', error);
        
        // Distinguish between expired and invalid tokens
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        res.status(401).json({ 
            message: 'Invalid token',
            code: 'TOKEN_INVALID'
        });
    }
});

// GET /api/auth/verify - Alternative method for token verification
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                message: 'No token provided' 
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        
        // Token is valid
        res.json({
            message: 'Token is valid',
            admin: {
                username: decoded.username,
                role: decoded.role
            }
        });
        
    } catch (error) {
        console.error('Token verification error:', error);
        
        // Distinguish between expired and invalid tokens
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        res.status(401).json({ 
            message: 'Invalid token',
            code: 'TOKEN_INVALID'
        });
    }
});

// POST /api/auth/teacher/register - Teacher registration
router.post('/teacher/register', async (req, res) => {
    try {
        const { username, password, email, fullName, phases } = req.body;
        
        // Basic validation
        if (!username || !password || !email || !fullName || !phases || !Array.isArray(phases)) {
            return res.status(400).json({ 
                message: 'Username, password, email, full name, and phases are required' 
            });
        }
        
        // Validate phases
        const validPhases = ['Foundation', 'Intermediate', 'Senior', 'FET'];
        const invalidPhases = phases.filter(p => !validPhases.includes(p));
        if (invalidPhases.length > 0) {
            return res.status(400).json({ 
                message: `Invalid phases: ${invalidPhases.join(', ')}` 
            });
        }
        
        // Check if teacher already exists
        const existingTeacher = await Teacher.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingTeacher) {
            return res.status(409).json({ 
                message: 'Username or email already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new teacher
        const teacher = new Teacher({
            username,
            password: hashedPassword,
            email,
            fullName,
            phases
        });
        
        await teacher.save();
        
        // Create JWT token
        const token = jwt.sign(
            { 
                teacherId: teacher._id,
                username: teacher.username,
                role: 'teacher',
                phases: teacher.phases
            },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'Teacher registered successfully',
            token: token,
            teacher: {
                id: teacher._id,
                username: teacher.username,
                email: teacher.email,
                fullName: teacher.fullName,
                phases: teacher.phases
            }
        });
        
    } catch (error) {
        console.error('Teacher registration error:', error);
        res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
});

// POST /api/auth/teacher/login - Teacher login
router.post('/teacher/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ 
                message: 'Username and password are required' 
            });
        }
        
        // Find teacher
        const teacher = await Teacher.findOne({ username });
        
        if (!teacher) {
            return res.status(401).json({ 
                message: 'Invalid username or password' 
            });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, teacher.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Invalid username or password' 
            });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { 
                teacherId: teacher._id,
                username: teacher.username,
                role: 'teacher',
                phases: teacher.phases
            },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token: token,
            teacher: {
                id: teacher._id,
                username: teacher.username,
                email: teacher.email,
                fullName: teacher.fullName,
                phases: teacher.phases
            }
        });
        
    } catch (error) {
        console.error('Teacher login error:', error);
        res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
