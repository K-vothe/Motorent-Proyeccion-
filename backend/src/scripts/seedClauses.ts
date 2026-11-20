import { prisma } from "../config/prisma.js";

// TEXTOS DE EJEMPLO: reemplázalos por las cláusulas reales de tu contrato
const clausulas = [
  { title: "Uso de la motocicleta", body: "El arrendatario usará la motocicleta únicamente para fines personales y conforme a las normas de tránsito." },
  { title: "Documentos y licencia", body: "El arrendatario declara que su licencia de conducción está vigente y corresponde a la categoría requerida." },
  { title: "Daños, accidente y pérdida", body: "El arrendatario responde por daños, pérdida o hurto según las condiciones pactadas, y debe reportar cualquier incidente de inmediato." },
  { title: "Devolución", body: "La motocicleta debe devolverse en la fecha, hora y estado pactados. El retraso genera cobros adicionales." },
];

for (const c of clausulas) {
  const existe = await prisma.clause.findFirst({ where: { title: c.title } });
  if (!existe) await prisma.clause.create({ data: c });
}

console.log("Cláusulas listas");
await prisma.$disconnect();