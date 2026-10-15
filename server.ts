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

  // Ultra-fast health check endpoint for Render spin-up and keep-alive pingers
  app.get(["/health", "/api/health"], (_req, res) => {
    res.status(200).json({ status: "ok", app: "FinteKia ERP", uptime: process.uptime() });
  });

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

  // Direct authentication endpoint for Render web app deployment
  app.post("/api/auth/login", async (req, res) => {
    try {
      const input = String(req.body.email || req.body.username || req.body.user || "").toLowerCase().trim();
      if (!input) {
        return res.status(400).json({ error: "Email o usuario requerido" });
      }
      const erp = await getErpData();
      const usersList = erp.extraState?.users || [];
      const matched = usersList.find((u: any) => 
        u.email.toLowerCase() === input || 
        u.name.toLowerCase().includes(input) ||
        (input === 'admin' && u.role === 'Admin') ||
        (input === 'contador' && u.role === 'Contador') ||
        (input === 'vendedor' && u.role === 'Vendedor') ||
        (input === 'operario' && u.role === 'Operario')
      );

      const user = matched || {
        uid: `usr-${Date.now()}`,
        name: input.includes('@') ? input.split('@')[0] : (input.charAt(0).toUpperCase() + input.slice(1)),
        email: input.includes('@') ? input : `${input.replace(/[^a-z0-9]/g, '')}@fintekia.co`,
        role: "Admin",
        cargo: "Administrador General",
        active: true
      };

      res.json({
        success: true,
        user,
        token: `render_session_${Buffer.from(input).toString('base64')}_${Date.now()}`
      });
    } catch (err: any) {
      console.error("Direct login error:", err);
      res.status(500).json({ error: err.message || "Failed to log in" });
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

  // --- High-Scale Paginated Historical Transactions Endpoints ---
  // Designed for companies with >5 years of ledger history or hundreds of thousands of records
  app.get("/api/erp/transactions/paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const entity = (req.query.entity as string) || "vouchers";
      const type = req.query.type as string | undefined;
      const thirdPartyId = req.query.thirdPartyId as string | undefined;
      const searchQuery = (req.query.q as string || "").toLowerCase().trim();

      const erp = await getErpData();
      let records: any[] = [];

      if (entity === "vouchers") {
        records = erp.vouchers || [];
      } else if (entity === "inventory_movements") {
        records = erp.extraState?.inventoryMovements || [];
      } else if (entity === "payroll_logs") {
        records = erp.extraState?.payrollLogs || [];
      } else {
        records = erp.vouchers || [];
      }

      // Filter in memory / stream
      let filtered = records.filter((r) => {
        // Date range
        const rDate = r.date || r.timestamp || r.createdAt;
        if (startDate && rDate && rDate < startDate) return false;
        if (endDate && rDate && rDate > endDate) return false;

        // Type filter
        if (type && r.type && r.type !== type) return false;

        // Third Party
        if (thirdPartyId && r.thirdPartyId && r.thirdPartyId !== thirdPartyId) return false;

        // Search text
        if (searchQuery) {
          const num = (r.number || "").toLowerCase();
          const concept = (r.concept || "").toLowerCase();
          const third = (r.thirdPartyId || "").toLowerCase();
          if (!num.includes(searchQuery) && !concept.includes(searchQuery) && !third.includes(searchQuery)) {
            return false;
          }
        }

        return true;
      });

      // Sort descending by date
      filtered.sort((a, b) => {
        const dateA = a.date || a.timestamp || a.createdAt || "";
        const dateB = b.date || b.timestamp || b.createdAt || "";
        return dateB.localeCompare(dateA);
      });

      const totalRecords = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
      const startIndex = (page - 1) * limit;
      const paginatedSlice = filtered.slice(startIndex, startIndex + limit);

      // Financial balance summary for the selected slice / range
      const totalDebits = filtered.reduce((acc, r) => acc + (r.lines?.reduce((ls: number, l: any) => ls + (Number(l.debit) || 0), 0) || Number(r.total) || 0), 0);
      const totalCredits = filtered.reduce((acc, r) => acc + (r.lines?.reduce((ls: number, l: any) => ls + (Number(l.credit) || 0), 0) || Number(r.total) || 0), 0);

      res.json({
        success: true,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          periodSummary: {
            startDate: startDate || null,
            endDate: endDate || null,
            totalDebits,
            totalCredits,
            currency: "COP"
          }
        },
        data: paginatedSlice
      });
    } catch (error: any) {
      console.error("Paginated transactions query error:", error);
      res.status(500).json({ error: error.message || "Failed to query paginated transactions" });
    }
  });

  // Partitioned year-by-year summary for historical synchronization (>5 years)
  app.get("/api/erp/sync/historical-partitions", async (_req, res) => {
    try {
      const erp = await getErpData();
      const allVouchers = erp.vouchers || [];

      // Group vouchers by year
      const yearMap: Record<string, { count: number; totalAmount: number; types: Record<string, number> }> = {};
      
      for (const v of allVouchers) {
        const dateStr = v.date || "2026-01-01";
        const year = dateStr.substring(0, 4) || "2026";
        if (!yearMap[year]) {
          yearMap[year] = { count: 0, totalAmount: 0, types: {} };
        }
        yearMap[year].count++;
        yearMap[year].totalAmount += Number(v.total) || 0;
        const vType = v.type || "diario";
        yearMap[year].types[vType] = (yearMap[year].types[vType] || 0) + 1;
      }

      const partitions = Object.entries(yearMap)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([year, stat]) => ({
          year: parseInt(year, 10),
          recordsCount: stat.count,
          totalCOP: stat.totalAmount,
          breakdownByType: stat.types,
          downloadEndpoint: `/api/erp/transactions/paginated?startDate=${year}-01-01&endDate=${year}-12-31&limit=500`
        }));

      res.json({
        success: true,
        historicalPartitions: partitions,
        totalHistoricalRecords: allVouchers.length,
        supportedYears: partitions.map((p) => p.year),
        architecture: "Chunked Lazy Partitioning for Enterprise High Volume"
      });
    } catch (error: any) {
      console.error("Failed to build historical partitions:", error);
      res.status(500).json({ error: error.message || "Failed to calculate partitions" });
    }
  });

  // Batch chunk ingestion for bulk import / mass synchronization
  app.post("/api/erp/transactions/batch-sync", async (req, res) => {
    try {
      const { batchId, chunkIndex, totalChunks, records, entity = "vouchers" } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: "El cuerpo de la petición debe contener un arreglo de 'records'." });
      }

      console.log(`[Batch-Sync] Ingesting chunk ${chunkIndex + 1}/${totalChunks} (Batch ${batchId || "default"}): ${records.length} ${entity} records.`);

      // Append or merge records
      const erp = await getErpData();
      const existingVouchers = erp.vouchers || [];
      const incomingIds = new Set(records.map(r => r.id));
      const merged = [
        ...existingVouchers.filter(v => !incomingIds.has(v.id)),
        ...records
      ];

      await saveErpData({
        vouchersList: merged
      });

      res.json({
        success: true,
        batchId: batchId || `batch_${Date.now()}`,
        chunkIndex,
        totalChunks,
        processedCount: records.length,
        totalVouchersInStore: merged.length,
        status: chunkIndex + 1 >= totalChunks ? "batch_completed" : "chunk_acknowledged"
      });
    } catch (error: any) {
      console.error("Batch sync processing failed:", error);
      res.status(500).json({ error: error.message || "Failed to process batch sync chunk" });
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
