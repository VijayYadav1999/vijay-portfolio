const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();

const uploadDir = path.join(__dirname, 'uploads');
const resumePath = path.join(uploadDir, 'resume.pdf');
const publicResumePath = path.join(__dirname, 'Resume_Vijay_Yadav.pdf');
const adminPassword = process.env.RESUME_ADMIN_PASSWORD || 'portfolio123';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(resumePath) && fs.existsSync(publicResumePath)) {
  fs.copyFileSync(publicResumePath, resumePath);
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, 'resume.pdf')
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin/resume', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-resume.html'));
});

app.post('/admin/resume', upload.single('resume'), (req, res) => {
  const password = req.body.password;

  if (password !== adminPassword) {
    return res.status(401).json({ message: 'Incorrect password.' });
  }

  if (!req.file || req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ message: 'Please upload a PDF file.' });
  }

  // Ensure the uploaded file is saved to the uploads folder
  try {
    // copy to uploads/resume.pdf (overwrite)
    fs.copyFileSync(req.file.path, resumePath);

    // also copy to the public resume path so the site embed/download uses the latest file
    try {
      fs.copyFileSync(req.file.path, publicResumePath);
    } catch (e) {
      console.error('Failed to copy uploaded resume to public folder:', e.message);
    }

    // remove the temporary upload if it exists at a different path
    if (fs.existsSync(req.file.path) && req.file.path !== resumePath) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }

    res.json({ message: 'Resume updated successfully.' });
  } catch (err) {
    console.error('Error saving uploaded resume:', err);
    return res.status(500).json({ message: 'Failed to save uploaded resume.' });
  }
});

app.get('/resume.pdf', (req, res) => {
  if (!fs.existsSync(resumePath)) {
    return res.status(404).send('Resume not found.');
  }

  res.sendFile(resumePath);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Portfolio server running on port ${PORT}`);
});
