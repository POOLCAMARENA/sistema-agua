const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { auth } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(file.originalname.toLowerCase().split('.').pop());
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    if (extOk && mimeOk) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  },
});

router.post('/foto', auth, (req, res) => {
  upload.single('foto')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen' });
    }

    try {
      // Reducir tamaño y calidad para que la foto pese poco y se guarde en la BD
      const buffer = await sharp(req.file.buffer)
        .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 65 })
        .toBuffer();

      const base64 = buffer.toString('base64');
      res.json({ url: `data:image/jpeg;base64,${base64}`, filename: null });
    } catch (error) {
      console.error('Error procesando la imagen:', error);
      res.status(400).json({ error: 'No se pudo procesar la imagen' });
    }
  });
});

module.exports = router;
