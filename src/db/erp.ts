import { db } from './index.ts';
import { users, companies, terceros, products, vouchers, inventory, bankAccounts, appSettings } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getErpData() {
  try {
    const allCompanies = await db.select().from(companies);
    const allTerceros = await db.select().from(terceros);
    const allProducts = await db.select().from(products);
    const allVouchers = await db.select().from(vouchers);
    const allInventory = await db.select().from(inventory);
    const allBankAccounts = await db.select().from(bankAccounts);
    const stateSetting = await db.select().from(appSettings).where(eq(appSettings.key, 'global_erp_state'));

    return {
      companies: allCompanies,
      terceros: allTerceros,
      products: allProducts,
      vouchers: allVouchers,
      inventory: allInventory,
      bankAccounts: allBankAccounts,
      extraState: stateSetting.length > 0 ? (stateSetting[0].value as any) : null,
    };
  } catch (error) {
    console.error("Database query getErpData failed:", error);
    throw new Error("Failed to load ERP data from Cloud SQL", { cause: error });
  }
}

export async function saveErpData(payload: {
  companiesList?: any[];
  tercerosList?: any[];
  productsList?: any[];
  vouchersList?: any[];
  inventoryList?: any[];
  bankAccountsList?: any[];
  extraState?: any;
}) {
  try {
    // Upsert companies
    if (payload.companiesList && payload.companiesList.length > 0) {
      for (const comp of payload.companiesList) {
        await db.insert(companies)
          .values({
            id: comp.id,
            name: comp.name,
            nit: comp.nit,
            slogan: comp.slogan,
            address: comp.address,
            regimen: comp.regimen,
            currency: comp.currency || 'COP',
            period: comp.period || 2026,
            businessType: comp.businessType || 'tecnologia_servicios',
            enableProduction: comp.enableProduction ?? false,
            enableTechServices: comp.enableTechServices ?? true,
            billingConfig: comp.billingConfig || null,
            payrollParameters: comp.payrollParameters || null,
          })
          .onConflictDoUpdate({
            target: companies.id,
            set: {
              name: comp.name,
              nit: comp.nit,
              slogan: comp.slogan,
              address: comp.address,
              regimen: comp.regimen,
              enableProduction: comp.enableProduction ?? false,
              enableTechServices: comp.enableTechServices ?? true,
              billingConfig: comp.billingConfig || null,
              payrollParameters: comp.payrollParameters || null,
            },
          });
      }
    }

    // Upsert products
    if (payload.productsList && payload.productsList.length > 0) {
      for (const prod of payload.productsList) {
        await db.insert(products)
          .values({
            id: prod.id,
            companyId: prod.companyId || (payload.companiesList?.[0]?.id ?? null),
            name: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            cost: String(prod.cost || 0),
            price: String(prod.price || 0),
            tax: prod.tax || 19,
            type: prod.type || 'terminado',
            lotTracking: prod.lotTracking ?? false,
            shelfLifeDays: prod.shelfLifeDays,
            brand: prod.brand,
            model: prod.model,
          })
          .onConflictDoUpdate({
            target: products.id,
            set: {
              name: prod.name,
              sku: prod.sku,
              barcode: prod.barcode,
              cost: String(prod.cost || 0),
              price: String(prod.price || 0),
              tax: prod.tax || 19,
              type: prod.type || 'terminado',
            },
          });
      }
    }

    // Upsert extra state (vouchers, budgets, etc.) into appSettings for rapid syncing
    if (payload.extraState) {
      await db.insert(appSettings)
        .values({
          key: 'global_erp_state',
          value: payload.extraState,
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: payload.extraState,
            updatedAt: new Date(),
          },
        });
    }

    return { success: true };
  } catch (error) {
    console.error("Database saveErpData failed:", error);
    throw new Error("Failed to save ERP data to Cloud SQL", { cause: error });
  }
}

export async function getDbInspectorData() {
  try {
    const [
      companiesRows,
      usersRows,
      productsRows,
      tercerosRows,
      vouchersRows,
      inventoryRows,
      bankAccountsRows,
    ] = await Promise.all([
      db.select().from(companies),
      db.select().from(users),
      db.select().from(products),
      db.select().from(terceros),
      db.select().from(vouchers),
      db.select().from(inventory),
      db.select().from(bankAccounts),
    ]);

    return {
      databaseName: process.env.SQL_DB_NAME || 'cloud_sql_development_database',
      engine: 'PostgreSQL 18.6',
      host: process.env.SQL_HOST || 'localhost',
      tables: [
        { name: 'companies', count: companiesRows.length, rows: companiesRows.slice(0, 50) },
        { name: 'users', count: usersRows.length, rows: usersRows.slice(0, 50) },
        { name: 'products', count: productsRows.length, rows: productsRows.slice(0, 50) },
        { name: 'terceros', count: tercerosRows.length, rows: tercerosRows.slice(0, 50) },
        { name: 'vouchers', count: vouchersRows.length, rows: vouchersRows.slice(0, 50) },
        { name: 'inventory', count: inventoryRows.length, rows: inventoryRows.slice(0, 50) },
        { name: 'bank_accounts', count: bankAccountsRows.length, rows: bankAccountsRows.slice(0, 50) },
      ],
    };
  } catch (error) {
    console.error("getDbInspectorData failed:", error);
    throw error;
  }
}

