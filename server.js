const express   = require('express');
const bodyParser= require('body-parser');
const fs        = require('fs');
const path      = require('path');
const dotenv    = require('dotenv');

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

// check if the OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set!');
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// serve static files from the data directory
app.get('/api/get-openai-key', (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'API key not configured on server'
    });
  }
  res.json({
    apiKey: process.env.OPENAI_API_KEY
  });
});

// save assessment data to a file
app.post('/save-assessment', (req, res) => {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

    const timestamp = Date.now();
    const userName = req.body.personal?.name
      ? req.body.personal.name.trim().replace(/\s+/g,'_')
      : 'anonymous';
    const fileName = `${userName}_${timestamp}.json`;
    const filePath = path.join(dataDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ ok: true, path: `/data/${fileName}` });
  } catch (err) {
    console.error('Error when storing the assessment data:', err);
    res.status(500).json({ ok: false, error: 'Failed to save file.' });
  }
});

// get the latest assessment JSON
app.get('/latest-assessment', (req, res) => {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      return res.status(404).json({ ok: false, error: 'No data directory.' });
    }
    // read .json files in the data directory
    const files = fs.readdirSync(dataDir)
                    .filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      return res.status(404).json({ ok: false, error: 'No assessment file found.' });
    }
    // sort files by modification time and get the latest one
    const latest = files
      .map(fn => ({ fn, mtime: fs.statSync(path.join(dataDir, fn)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)[0].fn;

    const content = fs.readFileSync(path.join(dataDir, latest), 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(content);
  } catch (err) {
    console.error('Error when reading the latest assessment file:', err);
    res.status(500).json({ ok: false, error: 'Failed to read latest file.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  
  // Check if the OpenAI API key is set
  if (process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key is set.');
  } else {
    console.log('OpenAI API key is not set. Please set the OPENAI_API_KEY environment variable.');
  }
});

// 已删除硬编码的 API 密钥