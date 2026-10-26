import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import motoRoutes from './routes/moto.routes.js';
import authroutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import documentoRoutes from './routes/documento.routes.js';
import rentaRoutes from './routes/renta.routes.js';

// Cargar variables de entorno
dotenv.config();

// Inicializar la aplicación de Express
const app: Application = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Ruta principal de prueba
app.get('/', (_req, res) => {
  res.send('Servidor MotoRent con TypeScript funcionando');
});

app.use('/auth', authroutes);
app.use('/dashboard', dashboardRoutes);

// Rutas de la API
app.use('/api', motoRoutes);
app.use('/api', documentoRoutes);
app.use('/api', rentaRoutes);

export default app;