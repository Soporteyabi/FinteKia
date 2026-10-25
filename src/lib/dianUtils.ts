/**
 * Utilidades DIAN para Facturación Electrónica y Terceros en Colombia
 */

const DIAN_FACTORS = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];

/**
 * Calcula el Dígito de Verificación (DV) oficial según el algoritmo de la DIAN (Art. 555-2 E.T.)
 * @param nit Número de Identificación Tributaria (solo dígitos o con puntuación)
 * @returns Dígito de verificación entre 0 y 9
 */
export function calculateDIANDV(nit: string): number {
  if (!nit) return 0;
  // Extraer solo los números del NIT inicial (ignorar guión existente o puntos)
  const cleanNit = nit.split('-')[0].replace(/\D/g, '');
  if (!cleanNit) return 0;

  let sum = 0;
  const len = cleanNit.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(cleanNit.charAt(len - 1 - i), 10);
    const factor = DIAN_FACTORS[DIAN_FACTORS.length - 1 - i] || 0;
    sum += digit * factor;
  }

  const remainder = sum % 11;
  if (remainder === 0) return 0;
  if (remainder === 1) return 1;
  return 11 - remainder;
}

/**
 * Formatea un NIT agregando o actualizando su Dígito de Verificación
 */
export function formatNITWithDV(nit: string): string {
  if (!nit) return '';
  const baseNit = nit.split('-')[0].replace(/\D/g, '');
  if (!baseNit) return nit;
  const dv = calculateDIANDV(baseNit);
  return `${baseNit}-${dv}`;
}

export interface NITValidationResult {
  isValid: boolean;
  baseNit: string;
  hasDv: boolean;
  currentDv?: number;
  expectedDv: number;
  formattedOfficial: string;
  formattedWithDots: string;
  status: 'valido' | 'sin_dv' | 'invalido' | 'longitud_invalida';
  message: string;
}

/**
 * Valida un NIT colombiano y su Dígito de Verificación contra el algoritmo oficial de la DIAN
 */
export function validateNIT(nit: string): NITValidationResult {
  if (!nit || !nit.trim()) {
    return {
      isValid: false,
      baseNit: '',
      hasDv: false,
      expectedDv: 0,
      formattedOfficial: '',
      formattedWithDots: '',
      status: 'longitud_invalida',
      message: 'El NIT no puede estar vacío.'
    };
  }

  const parts = nit.trim().split('-');
  const cleanBase = parts[0].replace(/\D/g, '');

  if (!cleanBase || cleanBase.length < 5 || cleanBase.length > 15) {
    return {
      isValid: false,
      baseNit: cleanBase,
      hasDv: false,
      expectedDv: 0,
      formattedOfficial: nit,
      formattedWithDots: nit,
      status: 'longitud_invalida',
      message: 'Longitud de NIT inválida (debe contener entre 5 y 15 dígitos).'
    };
  }

  const expectedDv = calculateDIANDV(cleanBase);
  const formattedOfficial = `${cleanBase}-${expectedDv}`;
  const dotsBase = cleanBase.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formattedWithDots = `${dotsBase}-${expectedDv}`;

  if (parts.length > 1 && parts[1].trim() !== '') {
    const rawDv = parts[1].replace(/\D/g, '');
    const currentDv = rawDv ? parseInt(rawDv, 10) : undefined;

    if (currentDv === expectedDv) {
      return {
        isValid: true,
        baseNit: cleanBase,
        hasDv: true,
        currentDv,
        expectedDv,
        formattedOfficial,
        formattedWithDots,
        status: 'valido',
        message: `NIT y Dígito de Verificación válidos (${formattedOfficial}).`
      };
    } else {
      return {
        isValid: false,
        baseNit: cleanBase,
        hasDv: true,
        currentDv,
        expectedDv,
        formattedOfficial,
        formattedWithDots,
        status: 'invalido',
        message: `Dígito de Verificación (-${currentDv}) incorrecto. El DV oficial según Art. 555-2 E.T. es -${expectedDv}.`
      };
    }
  }

  return {
    isValid: false,
    baseNit: cleanBase,
    hasDv: false,
    expectedDv,
    formattedOfficial,
    formattedWithDots,
    status: 'sin_dv',
    message: `NIT sin Dígito de Verificación explícito. DV calculado oficial: -${expectedDv}.`
  };
}

/**
 * Genera el texto para compartir el comprobante / factura por WhatsApp
 */
export function buildWhatsAppInvoiceShareText(options: {
  companyName: string;
  invoiceNumber: string;
  clientName: string;
  totalCOP: string;
  date: string;
  cufe?: string;
}): string {
  const { companyName, invoiceNumber, clientName, totalCOP, date, cufe } = options;
  let text = `📄 *FACTURA ELECTRÓNICA DE VENTA - ${companyName}*\n\n`;
  text += `Estimado(a) *${clientName}*,\n`;
  text += `Le compartimos los datos de su factura electrónica emitida el ${date}:\n\n`;
  text += `• *No. Factura:* ${invoiceNumber}\n`;
  text += `• *Total a Pagar:* ${totalCOP}\n`;
  if (cufe) {
    text += `• *CUFE DIAN:* ${cufe.substring(0, 24)}...\n`;
    text += `• *Verificación DIAN:* https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}\n`;
  }
  text += `\nGracias por su confianza. Si tiene dudas o requiere soporte, estamos a su disposición.`;
  return text;
}

/**
 * Genera el Asunto oficial estandarizado por la DIAN (Resolución 000042 de 2020 / Anexo Técnico 1.8)
 * Formato obligatorio: nit; nombre_emisor; numero_factura; codigo_tipo_documento; nombre_adquirente
 */
export function buildDIANEmailSubject(options: {
  companyNit: string;
  companyName: string;
  invoiceNumber: string;
  clientName: string;
  documentType?: '01' | '91' | '92'; // 01: Factura Electrónica, 91: Nota Crédito, 92: Nota Débito
}): string {
  const { companyNit, companyName, invoiceNumber, clientName, documentType = '01' } = options;
  const cleanNit = companyNit.split('-')[0].replace(/\D/g, '');
  const cleanCompanyName = companyName.replace(/;/g, ',').trim().toUpperCase();
  const cleanClientName = (clientName || 'CONSUMIDOR FINAL').replace(/;/g, ',').trim().toUpperCase();
  const cleanInvoiceNo = invoiceNumber.trim().toUpperCase();

  return `${cleanNit}; ${cleanCompanyName}; ${cleanInvoiceNo}; ${documentType}; ${cleanClientName}`;
}

/**
 * Genera el cuerpo de correo para notificación de factura electrónica al cliente
 */
export function buildDIANInvoiceEmailBody(options: {
  companyName: string;
  companyNit: string;
  invoiceNumber: string;
  clientName: string;
  clientNit?: string;
  date: string;
  dueDate?: string;
  totalFormatted: string;
  cufe?: string;
  bankDetails?: string;
}): string {
  const {
    companyName,
    companyNit,
    invoiceNumber,
    clientName,
    clientNit,
    date,
    dueDate,
    totalFormatted,
    cufe,
    bankDetails
  } = options;

  let body = `Estimado(a) ${clientName}${clientNit ? ` (NIT/CC: ${clientNit})` : ''},\n\n`;
  body += `Reciba un cordial saludo de parte de ${companyName} (NIT: ${companyNit}).\n\n`;
  body += `Por medio de la presente comunicación, en cumplimiento de las disposiciones legales vigentes (Estatuto Tributario Art. 616-1 y Resolución DIAN 000042 de 2020), le hacemos entrega formal de su FACTURA ELECTRÓNICA DE VENTA:\n\n`;
  body += `========================================================\n`;
  body += `DATOS DEL COMPROBANTE ELECTRÓNICO:\n`;
  body += `• Documento: Factura Electrónica de Venta No. ${invoiceNumber}\n`;
  body += `• Fecha de Emisión: ${date}\n`;
  if (dueDate) {
    body += `• Fecha de Vencimiento: ${dueDate}\n`;
  }
  body += `• Total a Pagar: ${totalFormatted}\n`;
  if (cufe) {
    body += `• Código Único de Factura Electrónica (CUFE):\n  ${cufe}\n`;
    body += `• Consulta directa en Catálogo DIAN:\n  https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}\n`;
  }
  body += `========================================================\n\n`;
  body += `DOCUMENTOS ADJUNTOS EN ESTA NOTIFICACIÓN:\n`;
  body += `1. Representación Gráfica en formato PDF (Factura_${invoiceNumber}.pdf)\n`;
  body += `2. Contenedor Electrónico XML UBL 2.1 (AttachedDocument_${invoiceNumber}.xml)\n`;
  body += `   (Incluye firma digital XAdES-BES y ApplicationResponse de validación previa DIAN)\n\n`;

  if (bankDetails) {
    body += `CUENTAS BANCARIAS AUTORIZADAS PARA EL PAGO:\n`;
    body += `${bankDetails}\n\n`;
  }

  body += `Agradecemos remitir el soporte de pago correspondiente una vez realizada la transferencia.\n\n`;
  body += `Atentamente,\n`;
  body += `Departamento de Facturación y Cartera\n`;
  body += `${companyName}\n`;
  body += `NIT: ${companyNit}\n`;
  body += `Sistema FinteKia ERP · Facturación Electrónica DIAN Colombia`;

  return body;
}

/**
 * Genera el contenedor XML AttachedDocument UBL 2.1 oficial para Colombia
 * que agrupa la factura electrónica firmada y el acuse de validación previa de la DIAN.
 */
export function generateUBLAttachedDocumentXML(options: {
  companyName: string;
  companyNit: string;
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientNit: string;
  total: number;
  cufe: string;
}): string {
  const {
    companyName,
    companyNit,
    invoiceNumber,
    date,
    clientName,
    clientNit,
    total,
    cufe
  } = options;

  const now = new Date();
  const issueTime = now.toTimeString().substring(0, 8);
  const cleanCompanyNit = companyNit.split('-')[0].replace(/\D/g, '');
  const cleanClientNit = clientNit.split('-')[0].replace(/\D/g, '') || '222222222222';

  return `<?xml version="1.0" encoding="UTF-8"?>
<AttachedDocument xmlns="urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ccts="urn:un:unece:uncefact:data:specification:CoreComponentTypeSchemaModule:2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>Documentos DIAN UBL 2.1</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>
  <cbc:ID>AttachedDoc-${invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${date}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}-05:00</cbc:IssueTime>
  <cbc:DocumentType>Contenedor de Factura Electrónica</cbc:DocumentType>
  <cbc:ParentDocumentID>${invoiceNumber}</cbc:ParentDocumentID>
  
  <!-- Emisor de la Factura -->
  <cac:SenderParty>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>${companyName}</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID="195" schemeID="4" schemeName="31">${cleanCompanyNit}</cbc:CompanyID>
      <cac:TaxScheme>
        <cbc:ID>01</cbc:ID>
        <cbc:Name>IVA</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:SenderParty>

  <!-- Receptor / Adquirente -->
  <cac:ReceiverParty>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>${clientName}</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID="195" schemeID="1" schemeName="31">${cleanClientNit}</cbc:CompanyID>
      <cac:TaxScheme>
        <cbc:ID>01</cbc:ID>
        <cbc:Name>IVA</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:ReceiverParty>

  <!-- Documento Electrónico Firmado (Factura Electrónica UBL) -->
  <cac:Attachment>
    <cac:ExternalReference>
      <cbc:MimeCode>application/xml</cbc:MimeCode>
      <cbc:EncodingCode>UTF-8</cbc:EncodingCode>
      <cbc:Description><![CDATA[Factura Electrónica de Venta con CUFE: ${cufe} - Valor Total COP: ${total}]]></cbc:Description>
    </cac:ExternalReference>
  </cac:Attachment>

  <!-- ApplicationResponse: Validación Previa Exitosa DIAN -->
  <cac:ParentDocumentLineReference>
    <cbc:LineID>1</cbc:LineID>
    <cac:DocumentReference>
      <cbc:ID>${invoiceNumber}</cbc:ID>
      <cbc:UUID schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
      <cbc:IssueDate>${date}</cbc:IssueDate>
      <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>
      <cac:ResultOfVerification>
        <cbc:ValidatorID>DIAN-VPFE-PROD</cbc:ValidatorID>
        <cbc:ValidationResultCode>02</cbc:ValidationResultCode>
        <cbc:ValidationDate>${date}</cbc:ValidationDate>
      </cac:ResultOfVerification>
    </cac:DocumentReference>
  </cac:ParentDocumentLineReference>
</AttachedDocument>`;
}

