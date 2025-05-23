const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const port = 3000;

// Supabase Configuration
const supabaseUrl = 'https://emjpbeisdagdqqgdksei.supabase.co ';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtanBiZWlzZGFnZHFxZ2Rrc2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MjcwODcsImV4cCI6MjA2MzUwMzA4N30.G2ZIp7ZHTaH7FN-jpafKQkIGK-hnI7-Q4prg6F1GtOw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware
app.use(express.json());

// Routes
// GET all users
app.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new user
app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) throw new Error('Name and email are required');

    const { data, error } = await supabase.from('users').insert([{ name, email }]);
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update user
app.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE user
app.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});