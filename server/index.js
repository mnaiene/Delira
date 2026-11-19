require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const atendimentosRoutes = require('./routes/atendimentos');
const despesasRoutes = require('./routes/despesas');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/atendimentos', atendimentosRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Delira Carwash rodando em http://localhost:${PORT}`);
});
