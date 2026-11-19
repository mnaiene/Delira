require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const atendimentosRoutes = require('./routes/atendimentos');
const despesasRoutes = require('./routes/despesas');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/atendimentos', atendimentosRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
