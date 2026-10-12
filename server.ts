import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser, getUsers } from "./src/db/users.ts";
import { getErpData, saveErpData, getDbInspectorData } from "./src/db/erp.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Helper for lazy loading Gemini API client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("La clave GEMINI_API_KEY no está configurada en los secretos de la plataforma.");
      }
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // --- Cloud SQL Relational Database Endpoints ---

  // Synchronize authenticated Firebase user into Cloud SQL PostgreSQL
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid || !req.user.email) {
        return res.status(400).json({ error: "Missing required user identity" });
      }
      const { name, role, cargo } = req.body;
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email, name, role, cargo);
      res.json({ success: true, user: dbUser });
    } catch (error: any) {
      console.error("Auth sync error:", error);
      res.status(500).json({ error: error.message || "Failed to sync user" });
    }
  });

  // Fetch registered users from PostgreSQL
  app.get("/api/users", async (_req, res) => {
    try {
      const usersList = await getUsers();
      res.json(usersList);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ error: error.message || "Failed to fetch users" });
    }
  });

  // Get ERP Data from Cloud SQL
  app.get("/api/erp/data", async (_req, res) => {
    try {
      const data = await getErpData();
      res.json(data);
    } catch (error: any) {
      console.error("Failed to fetch ERP data:", error);
      res.status(500).json({ error: error.message || "Failed to fetch ERP data" });
    }
  });

  // Sync / Save ERP Data to Cloud SQL
  app.post("/api/erp/sync", async (req, res) => {
    try {
      const result = await saveErpData(req.body);
      res.json(result);
    } catch (error: any) {
      console.error("Failed to sync ERP data:", error);
      res.status(500).json({ error: error.message || "Failed to save ERP data" });
    }
  });

  // Get Database Inspector Data (Tables, Counts, Preview)
  app.get("/api/db/inspector", async (_req, res) => {
    try {
      const inspectorData = await getDbInspectorData();
      res.json(inspectorData);
    } catch (error: any) {
      console.error("Failed to fetch database inspector data:", error);
      res.status(500).json({ error: error.message || "Failed to inspect database" });
    }
  });

  // Get raw Supabase SQL script
  app.get("/api/db/schema-sql", (_req, res) => {
    try {
      const sqlPath = path.resolve("./supabase_schema.sql");
      if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, "utf-8");
        res.setHeader("Content-Type", "text/plain");
        res.send(sqlContent);
      } else {
        res.status(404).send("-- Schema file not found");
      }
    } catch (error: any) {
      res.status(500).send(`-- Error loading schema: ${error.message}`);
    }
  });

  // API endpoint for Smart AI ERP Advisory
  app.post("/api/gemini/advisor", async (req, res) => {
    try {
      const { companyName, totals, productsCount, stockList, deficitsList, payrollSummary } = req.body;
      
      const prompt = `
        Actúa como un Consultor Financiero Experto de Colombia para la empresa "${companyName}".
        Analiza las siguientes métricas del sistema contable y de producción (MRP) de la organización:

        1. Métricas Financieras:
           - Ventas Totales: ${totals.sales}
           - Gastos Totales: ${totals.expenses}
           - Utilidad Neta: ${totals.profit} (Margen Neto: ${totals.margin})

        2. Base Operativa:
           - Número de Productos en Catálogo: ${productsCount}
           - Stock Disponible: ${JSON.stringify(stockList)}

        3. Planificación MRP:
           - Déficits y Alertas de Materia Prima: ${JSON.stringify(deficitsList)}

        4. Resumen de Nómina Procesada:
           - Empleados y desprendibles vigentes: ${JSON.stringify(payrollSummary)}

        Por favor, genera un informe breve de asesoría (en formato Markdown elegante) estructurado en:
        - 📊 **Diagnóstico Financiero** (Valoración de márgenes, gastos/ventas bajo la perspectiva de impuestos de IVA/Retención en la fuente Colombiana).
        - 🌾 **Optimización de Producción y Deficiencias de Stock** (Recomendaciones precisas sobre la planificación MRP del inventario o insumos que faltan y compras a realizar).
        - 👥 **Análisis de Capacidad Laboral** (Comentarios sobre salarios, auxilio de transporte o distribución de cargas de trabajo).
        - ✨ **Recomendación Estratégica DIAN** (Comentario ágil sobre obligaciones fiscales previstas).

        Mantén un tono profesional, pragmático, alentador y sumamente claro.
      `;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Eres FinteKia AI Consultant, un asesor corporativo virtual experto en regulaciones tributarias de la DIAN, finanzas empresariales colombianas y control MRP.",
          temperature: 0.7,
        },
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error.message || error);
      res.status(500).json({ error: error.message || "Error al procesar la asesoría de Inteligencia Artificial." });
    }
  });

  // Serve static UI / Setup development middleware HMR rules
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), "dist"))
      ? path.join(process.cwd(), "dist")
      : path.resolve(__dirname);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical error in starting Express Fullstack Server:", err);
});
