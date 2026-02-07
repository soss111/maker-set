const express = require('express');
const router = express.Router();

/**
 * GET /api/monthly-reports
 * List monthly reports. Client expects { reports: [] }.
 */
router.get('/', (req, res) => {
  res.json({ reports: [] });
});

/**
 * POST /api/monthly-reports/generate
 * Trigger report generation. Stub: returns success (real logic can use provider-payments/generate-report).
 */
router.post('/generate', (req, res) => {
  res.json({ success: true, message: 'Report generation requested' });
});

/**
 * GET /api/monthly-reports/:reportId/invoices
 * Invoices for a report. Client expects { invoices: [] }.
 */
router.get('/:reportId/invoices', (req, res) => {
  res.json({ invoices: [] });
});

module.exports = router;
