import express from 'express';
import path from 'node:path';
import type { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import motoRoutes from './routes/moto.routes.js';
import authroutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import documentoRoutes from './routes/documento.routes.js';
import rentaRoutes from './routes/renta.routes.js';
import verificacionPerfilRoutes from './routes/verificacion-perfil.routes.js';
import resenaRoutes from './routes/resena.routes.js';
import adminRoutes from './routes/admin.routes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Cargar variables de entorno
dotenv.config();

// Inicializar la aplicación de Express
const app: Application = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '35mb' }));

// Fotos públicas de motos. IMPORTANTE: solo se expone /uploads/motos;
// los documentos de verificación (/uploads/verificaciones) siguen siendo privados.
app.use('/uploads/motos', express.static(path.resolve(process.cwd(), 'uploads', 'motos')));

app.use(
  "/doc_swagger",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// Ruta principal de prueba
app.get('/', (_req, res) => {
  res.send('Servidor MotoRent con TypeScript funcionando');
});

app.use('/auth', authroutes);
app.use('/dashboard', dashboardRoutes);

// Rutas de la API
app.use('/api', motoRoutes);
app.use('/api', verificacionPerfilRoutes);
app.use('/api', resenaRoutes);
app.use('/api', adminRoutes);
app.use('/api', documentoRoutes);
app.use('/api', rentaRoutes);

export default app;