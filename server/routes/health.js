/**
 * Health Check Route
 * 
 * Provides system health information
 * Monitors database, services, and overall system status
 */

const express = require('express');
const router = express.Router();
const connectionManager = require('../utils/sqliteConnectionManager');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    let databaseStatus = {
      connected: false,
      responseTime: null,
      details: null,
    };

    try {
      const dbStartTime = Date.now();
      await connectionManager.query('SELECT 1');
      databaseStatus = {
        connected: true,
        responseTime: Date.now() - dbStartTime,
        details: 'SQLite connection healthy',
      };
    } catch (dbError) {
      databaseStatus = {
        connected: false,
        responseTime: null,
        details: dbError.message,
      };
    }

    // Check translation service
    const translationStatus = {
      available: true, // Assume available unless proven otherwise
      service: 'LibreTranslate + OpenAI + Static Fallback',
      details: 'Multi-layer translation service',
    };

    // Overall system health
    const overallHealth = databaseStatus.connected;
    const totalResponseTime = Date.now() - startTime;

    const healthData = {
      status: overallHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: databaseStatus,
      translation: translationStatus,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    res.status(overallHealth ? 200 : 503).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: 'Health check failed',
        details: error.message,
      },
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: await checkDatabaseHealth(),
        translation: await checkTranslationHealth(),
        fileSystem: await checkFileSystemHealth(),
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    res.json(healthData);
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Database health check
async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    const result = await connectionManager.query('SELECT sqlite_version() as version, datetime("now") as now');
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      version: result.rows[0]?.version || 'Unknown',
      timestamp: result.rows[0]?.now || new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: null,
    };
  }
}

// Translation service health check
async function checkTranslationHealth() {
  try {
    // Check if translation service is available
    const translationService = require('../ai/translation-service-v2');
    
    return {
      status: 'healthy',
      service: 'Enhanced Translation Service',
      features: [
        'LibreTranslate (Primary)',
        'OpenAI (Secondary)',
        'Static Fallback (Tertiary)',
      ],
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

// File system health check
async function checkFileSystemHealth() {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Check uploads directory
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.access(uploadsDir);
    
    return {
      status: 'healthy',
      uploadsDirectory: 'accessible',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

module.exports = router;
