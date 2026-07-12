const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');
const { adminAuth, auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const usuarioValidaciones = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').isIn(['admin', 'cajero', 'repartidor']).withMessage('Rol inválido')
];

// Listar usuarios
router.get('/', adminAuth, async (req, res) => {
  try {
    const usuarios = await Usuario.listar();
    res.json(usuarios);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// Obtener usuario por ID
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const usuario = await Usuario.buscarPorId(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// Crear usuario
router.post('/', adminAuth, usuarioValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existente = await Usuario.buscarPorEmail(req.body.email);
    if (existente) return res.status(400).json({ error: 'El email ya está registrado' });

    const usuario = await Usuario.crear(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Actualizar usuario
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { nombre, email, rol, telefono, activo } = req.body;
    const usuario = await Usuario.actualizar(req.params.id, { nombre, email, rol, telefono, activo });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Resetear contraseña
router.put('/:id/password', adminAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    await Usuario.actualizarPassword(req.params.id, password);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
});

// Eliminar usuario
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    const eliminado = await Usuario.eliminar(req.params.id);
    if (!eliminado) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
