const express = require('express');
const router = express.Router();

// POST /api/cart/reserve - Reserve stock for a set (stub: always succeeds; real reservation at checkout)
router.post('/reserve', async (req, res) => {
  try {
    const { set_id, quantity } = req.body || {};
    if (set_id == null || quantity == null) {
      return res.status(400).json({ error: 'set_id and quantity are required' });
    }
    // Stub: no persistent reservation table yet; stock checked at checkout
    res.status(200).json({ reserved: true, set_id: Number(set_id), quantity: Number(quantity) });
  } catch (err) {
    console.error('Cart reserve error:', err);
    res.status(500).json({ error: 'Failed to reserve' });
  }
});

// DELETE /api/cart/reservations - Release all reservations for current user/session (stub)
router.delete('/reservations', async (req, res) => {
  try {
    // Stub: no persistent reservations; always success
    res.status(200).json({ released: true });
  } catch (err) {
    console.error('Cart release error:', err);
    res.status(500).json({ error: 'Failed to release reservations' });
  }
});

module.exports = router;
