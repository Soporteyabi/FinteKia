import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Voucher, Tercero, Product, Company } from '../types';

export interface SalesReportOptions {
  vouchers: Voucher[];
  terceros: Tercero[];
  products: Product[];
  company?: Company;
  currentUser?: { name: string; role: string; email?: string };
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
  filterStatus?: 'all' | 'aprobados';
  includeVouchersTable?: boolean;
  includeCategoriesTable?: boolean;
  includeTopClientsTable?: boolean;
}

export interface SalesReportData {
  filteredVouchers: Voucher[];
  totalSales: number;
  totalCosts: number;
  grossProfit: number;
  operatingMarginPercent: number;
  totalVouchersCount: number;
  averageTicket: number;
  totalTaxes: number;
  voucherRows: Array<{
    number: string;
    date: string;
    clientName: string;
    concept: string;
    sale: number;
    cost: number;
    profit: number;
    marginPercent: number;
    status: string;
  }>;
  categoryRows: Array<{
    category: string;
    count: number;
    sales: number;
    costs: number;
    profit: number;
    marginPercent: number;
  }>;
  topClientsRows: Array<{
    clientName: string;
    nit: string;
    count: number;
    totalSales: number;
    profit: number;
    marginPercent: number;
  }>;
}

export function formatCOPNumber(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
}

export function computeSalesReportData(options: SalesReportOptions): SalesReportData {
  const { vouchers, terceros, products, filterStatus = 'all', startDate, endDate } = options;

  // Filter vouchers that represent sales
  const salesVouchers = vouchers.filter((v) => {
    // Check type or income accounts
    const isSale = v.type === 'venta' || v.type === 'ingreso' || v.lines.some((l) => l.accountCode.startsWith('41'));
    if (!isSale) return false;

    if (filterStatus === 'aprobados' && v.status === 'borrador') {
      return false;
    }

    if (startDate && v.date < startDate) return false;
    if (endDate && v.date > endDate) return false;

    return true;
  });

  const productCostMap = new Map<string, { cost: number; price: number; type: string }>();
  products.forEach((p) => {
    productCostMap.set(p.id, { cost: p.cost || 0, price: p.price || 0, type: p.type || 'producto' });
  });

  const terceroMap = new Map<string, Tercero>();
  terceros.forEach((t) => terceroMap.set(t.id, t));

  let totalSales = 0;
  let totalCosts = 0;
  let totalTaxes = 0;

  const categoryMap = new Map<string, { count: number; sales: number; costs: number }>();
  const clientMap = new Map<string, { nit: string; count: number; sales: number; costs: number }>();

  const voucherRows = salesVouchers.map((v) => {
    const saleAmount = v.total || 0;
    totalSales += saleAmount;

    // Calculate approximate cost for this voucher
    let costAmount = 0;
    if (v.items && v.items.length > 0) {
      v.items.forEach((item) => {
        const prod = productCostMap.get(item.productId);
        const unitCost = prod ? prod.cost : item.unitPrice * 0.6;
        costAmount += (item.qty || 1) * unitCost;
      });
    } else {
      // Fallback: estimate standard cost ratio (62% of sale if not itemized)
      costAmount = saleAmount * 0.62;
    }

    totalCosts += costAmount;

    // Taxes
    const ivaLine = v.lines.find((l) => l.accountCode.startsWith('2408'));
    if (ivaLine) {
      totalTaxes += Math.abs(ivaLine.credit || ivaLine.debit || 0);
    } else {
      totalTaxes += saleAmount * 0.19; // Est. 19% IVA standard
    }

    const profit = saleAmount - costAmount;
    const marginPercent = saleAmount > 0 ? (profit / saleAmount) * 100 : 0;

    const client = terceroMap.get(v.thirdPartyId);
    const clientName = client ? client.name : 'Cliente General';
    const clientNit = client ? client.nit : 'Sin NIT';

    // Accumulate by Client
    const clientAcc = clientMap.get(clientName) || { nit: clientNit, count: 0, sales: 0, costs: 0 };
    clientAcc.count += 1;
    clientAcc.sales += saleAmount;
    clientAcc.costs += costAmount;
    clientMap.set(clientName, clientAcc);

    // Accumulate by Category
    let categoryName = 'Servicios TI & Soporte';
    const lowerConcept = (v.concept || '').toLowerCase();
    if (lowerConcept.includes('equipo') || lowerConcept.includes('laptop') || lowerConcept.includes('hardware') || lowerConcept.includes('servidor')) {
      categoryName = 'Hardware & Equipos';
    } else if (lowerConcept.includes('licencia') || lowerConcept.includes('software') || lowerConcept.includes('cloud')) {
      categoryName = 'Licencias & Software';
    } else if (lowerConcept.includes('produccion') || lowerConcept.includes('planta') || lowerConcept.includes('materia')) {
      categoryName = 'Producción Industrial';
    } else if (lowerConcept.includes('mantenimiento') || lowerConcept.includes('reparacion') || lowerConcept.includes('soporte')) {
      categoryName = 'Mantenimiento & Reparación';
    }

    const catAcc = categoryMap.get(categoryName) || { count: 0, sales: 0, costs: 0 };
    catAcc.count += 1;
    catAcc.sales += saleAmount;
    catAcc.costs += costAmount;
    categoryMap.set(categoryName, catAcc);

    return {
      number: v.number || 'VTA-000',
      date: v.date || new Date().toISOString().split('T')[0],
      clientName,
      concept: v.concept || 'Venta de productos / servicios',
      sale: saleAmount,
      cost: costAmount,
      profit,
      marginPercent,
      status: v.status || 'aprobado',
    };
  });

  const grossProfit = totalSales - totalCosts;
  const operatingMarginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
  const totalVouchersCount = salesVouchers.length;
  const averageTicket = totalVouchersCount > 0 ? totalSales / totalVouchersCount : 0;

  // Transform Category Rows
  const categoryRows = Array.from(categoryMap.entries()).map(([category, data]) => {
    const profit = data.sales - data.costs;
    const marginPercent = data.sales > 0 ? (profit / data.sales) * 100 : 0;
    return {
      category,
      count: data.count,
      sales: data.sales,
      costs: data.costs,
      profit,
      marginPercent,
    };
  }).sort((a, b) => b.sales - a.sales);

  // Transform Top Clients Rows
  const topClientsRows = Array.from(clientMap.entries()).map(([clientName, data]) => {
    const profit = data.sales - data.costs;
    const marginPercent = data.sales > 0 ? (profit / data.sales) * 100 : 0;
    return {
      clientName,
      nit: data.nit,
      count: data.count,
      totalSales: data.sales,
      profit,
      marginPercent,
    };
  }).sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);

  return {
    filteredVouchers: salesVouchers,
    totalSales,
    totalCosts,
    grossProfit,
    operatingMarginPercent,
    totalVouchersCount,
    averageTicket,
    totalTaxes,
    voucherRows,
    categoryRows,
    topClientsRows,
  };
}

export function generateSalesAndMarginPdfReport(options: SalesReportOptions): {
  doc: jsPDF;
  filename: string;
  download: () => void;
  openPreview: () => void;
} {
  const data = computeSalesReportData(options);
  const company = options.company || {
    name: 'FinteKia Solutions S.A.S.',
    nit: '901.554.892-1',
    address: 'Calle 100 # 19-61, Of. 804, Bogotá D.C.',
    slogan: 'Tecnología Contable, DIAN & Gestión Empresarial Inteligente',
    regimen: 'responsable',
  } as Company;

  const currentUser = options.currentUser || { name: 'Washington Quiñones', role: 'Administrador' };
  const periodLabel = options.periodLabel || 'Año Fiscal 2026';
  const currentDateStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTimeStr = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // --- Header Banner (Corporate Dark Sapphire) ---
  doc.setFillColor(11, 37, 69); // #0B2545
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line (Cyan / Electric Sky #0284C7)
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  // Header Brand & Company Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FINTEKIA ERP', marginX, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(186, 230, 253);
  doc.text('SISTEMA INTEGRADO DE GESTIÓN & FACTURACIÓN ELECTRÓNICA DIAN', marginX, 16);

  // Right Side: Company Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(company.name, pageWidth - marginX, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`NIT: ${company.nit} · ${company.address || 'Colombia'}`, pageWidth - marginX, 15, { align: 'right' });
  doc.text(`Régimen: Responsable de IVA · Moneda: COP ($)`, pageWidth - marginX, 20, { align: 'right' });

  // --- Document Subheader & Metadata Box ---
  let cursorY = 35;

  doc.setTextColor(15, 23, 42); // #0F172A
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('INFORME EJECUTIVO DE VENTAS Y MÁRGENES OPERATIVOS', marginX, cursorY);

  cursorY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Período de Análisis: ${periodLabel}  |  Emisión: ${currentDateStr} ${currentTimeStr}  |  Generado por: ${currentUser.name} (${currentUser.role})`, marginX, cursorY);

  cursorY += 5;

  // --- 1. Executive Summary Table (Key Performance Indicators) ---
  const kpiData: any[][] = [
    [
      { content: 'Total Ventas Facturadas (Bruto)', styles: { fontStyle: 'bold' as const } },
      formatCOPNumber(data.totalSales),
      { content: 'Total Compras & Costos Operativos', styles: { fontStyle: 'bold' as const } },
      formatCOPNumber(data.totalCosts),
    ],
    [
      { content: 'Utilidad Operativa Bruta', styles: { fontStyle: 'bold' as const, textColor: [5, 150, 105] } },
      { content: formatCOPNumber(data.grossProfit), styles: { fontStyle: 'bold' as const, textColor: [5, 150, 105] } },
      { content: 'Margen Operativo Porcentual', styles: { fontStyle: 'bold' as const, textColor: [2, 132, 199] } },
      { content: `${data.operatingMarginPercent.toFixed(1)}%`, styles: { fontStyle: 'bold' as const, textColor: [2, 132, 199] } },
    ],
    [
      { content: 'Comprobantes / Facturas Emitidas', styles: { fontStyle: 'normal' as const } },
      `${data.totalVouchersCount} comprobantes`,
      { content: 'Ticket Promedio de Venta', styles: { fontStyle: 'normal' as const } },
      formatCOPNumber(data.averageTicket),
    ],
    [
      { content: 'IVA Liquidado Proyectado (19%)', styles: { fontStyle: 'normal' as const } },
      formatCOPNumber(data.totalTaxes),
      { content: 'Rendimiento Global del Período', styles: { fontStyle: 'normal' as const } },
      data.operatingMarginPercent >= 30 ? 'Rentabilidad Óptima (Sostenible)' : 'Rentabilidad Moderada',
    ],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [[
      { content: 'INDICADORES CLAVE DE RENTABILIDAD & OPERACIÓN (KPIs)', colSpan: 4, styles: { halign: 'left', fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' as const, fontSize: 9 } }
    ]],
    body: kpiData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 50, fillColor: [248, 250, 252] },
      1: { cellWidth: 42, halign: 'right' },
      2: { cellWidth: 50, fillColor: [248, 250, 252] },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 7;

  // --- 2. Margins by Category / Business Line Table ---
  if (options.includeCategoriesTable !== false && data.categoryRows.length > 0) {
    const categoryBody = data.categoryRows.map((cat) => [
      cat.category,
      `${cat.count}`,
      formatCOPNumber(cat.sales),
      formatCOPNumber(cat.costs),
      formatCOPNumber(cat.profit),
      `${cat.marginPercent.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [
        [
          { content: 'ANÁLISIS DE MÁRGENES POR LÍNEA DE NEGOCIO & PRODUCTO', colSpan: 6, styles: { halign: 'left', fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 } },
        ],
        ['Línea de Negocio', 'Comprobantes', 'Total Ventas', 'Costo Directo', 'Utilidad Operativa', 'Margen %'],
      ],
      body: categoryBody,
      foot: [
        [
          'TOTAL CONSOLIDADO',
          `${data.totalVouchersCount}`,
          formatCOPNumber(data.totalSales),
          formatCOPNumber(data.totalCosts),
          formatCOPNumber(data.grossProfit),
          `${data.operatingMarginPercent.toFixed(1)}%`,
        ],
      ],
      theme: 'striped',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: marginX, right: marginX },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 7;
  }

  // --- 3. Top Clients Contribution Table ---
  if (options.includeTopClientsTable !== false && data.topClientsRows.length > 0) {
    const topClientsBody = data.topClientsRows.map((cli, idx) => [
      `#${idx + 1} ${cli.clientName}`,
      cli.nit,
      `${cli.count}`,
      formatCOPNumber(cli.totalSales),
      formatCOPNumber(cli.profit),
      `${cli.marginPercent.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [
        [
          { content: 'TOP 5 CLIENTES CON MAYOR APORTE AL MARGEN OPERATIVO', colSpan: 6, styles: { halign: 'left', fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 } },
        ],
        ['Cliente / Tercero', 'NIT / Identificación', 'Operaciones', 'Ventas Totales', 'Utilidad Generada', 'Margen %'],
      ],
      body: topClientsBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 27, halign: 'right' },
        4: { cellWidth: 27, halign: 'right' },
        5: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: marginX, right: marginX },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 7;
  }

  // --- 4. Detailed Voucher Transactions Table ---
  if (options.includeVouchersTable !== false && data.voucherRows.length > 0) {
    // If not much space left, add page
    if (cursorY > pageHeight - 50) {
      doc.addPage();
      cursorY = 20;
    }

    const vouchersBody = data.voucherRows.map((vr) => [
      vr.number,
      vr.date,
      vr.clientName.length > 25 ? `${vr.clientName.substring(0, 23)}...` : vr.clientName,
      vr.concept.length > 28 ? `${vr.concept.substring(0, 26)}...` : vr.concept,
      formatCOPNumber(vr.sale),
      formatCOPNumber(vr.cost),
      formatCOPNumber(vr.profit),
      `${vr.marginPercent.toFixed(0)}%`,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [
        [
          { content: 'RELACIÓN DETALLADA DE COMPROBANTES DE VENTA (FACTURACIÓN)', colSpan: 8, styles: { halign: 'left', fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 } },
        ],
        ['Comprobante', 'Fecha', 'Tercero / Cliente', 'Concepto Principal', 'Venta Bruta', 'Costo Est.', 'Utilidad', 'Margen'],
      ],
      body: vouchersBody,
      theme: 'striped',
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 16 },
        2: { cellWidth: 38 },
        3: { cellWidth: 42 },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 12, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: marginX, right: marginX },
    });
  }

  // --- Professional Footers across all pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Decorative footer line
    doc.setDrawColor(203, 213, 225); // #CBD5E1
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // #64748B
    doc.text(
      'Documento generado electrónicamente por FinteKia ERP v2.4 · Cumplimiento de estándares contables NIIF y normativa DIAN',
      marginX,
      pageHeight - 8
    );

    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  const cleanDate = new Date().toISOString().split('T')[0];
  const filename = `Reporte_Ventas_y_Margenes_FinteKia_${cleanDate}.pdf`;

  const download = () => {
    doc.save(filename);
  };

  const openPreview = () => {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return {
    doc,
    filename,
    download,
    openPreview,
  };
}
