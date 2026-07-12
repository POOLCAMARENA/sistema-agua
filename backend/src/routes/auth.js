const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const pool = require('../config/database');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const usuario = await Usuario.buscarPorEmail(email);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordValido = await Usuario.verificarPassword(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // Actualizar última sesión
    await pool.query('UPDATE usuarios SET ultima_sesion = CURRENT_TIMESTAMP WHERE id = $1', [usuario.id]);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Obtener usuario actual
router.get('/me', auth, async (req, res) => {
  try {
    const usuario = await Usuario.buscarPorId(req.user.id);
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// Cambiar contraseña
router.put('/cambiar-password', auth, async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    const usuario = await Usuario.buscarPorId(req.user.id);
    const passwordValido = await Usuario.verificarPassword(password_actual, usuario.password);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    await Usuario.actualizarPassword(req.user.id, password_nueva);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

module.exports = router;
