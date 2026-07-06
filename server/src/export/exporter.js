import ExcelJS from 'exceljs';

// Colunas únicas para CSV e XLSX (mantém os dois formatos consistentes).
const COLUMNS = [
  { header: 'Nome', key: 'name' },
  { header: 'Telefone', key: 'phone' },
  { header: 'Endereço', key: 'address' },
  { header: 'Avaliação', key: 'rating' },
  { header: 'Qtd. avaliações', key: 'reviewsCount' },
  { header: 'E-mail', key: 'email' },
  { header: 'Instagram', key: 'instagram' },
  { header: 'Facebook', key: 'facebook' },
  { header: 'LinkedIn', key: 'linkedin' },
  { header: 'WhatsApp', key: 'whatsapp' },
  { header: 'Estágio', key: 'stage' },
  { header: 'Status', key: 'status' },
  { header: 'Confiança', key: 'confidence' },
  { header: 'Origem', key: 'source' },
  { header: 'Latitude', key: 'lat' },
  { header: 'Longitude', key: 'lng' },
];

function rowsFromLeads(leads) {
  return leads.map((l) => {
    const e = l.enrichment ?? {};
    return {
      name: l.name ?? '',
      phone: l.phone ?? '',
      address: l.address ?? '',
      rating: l.rating ?? '',
      reviewsCount: l.reviewsCount ?? '',
      email: e.email ?? '',
      instagram: e.instagram ?? '',
      facebook: e.facebook ?? '',
      linkedin: e.linkedin ?? '',
      whatsapp: e.whatsapp ?? '',
      stage: l.stage ?? 'novo',
      status: l.enrichmentStatus ?? '',
      confidence: e.confidence ?? '',
      source: l.source ?? '',
      lat: l.lat ?? '',
      lng: l.lng ?? '',
    };
  });
}

const escapeCsv = (v) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV padrão (vírgula, universal para CRMs). BOM p/ o Excel ler UTF-8 direito.
export function toCSV(leads) {
  const rows = rowsFromLeads(leads);
  const head = COLUMNS.map((c) => c.header).join(',');
  const body = rows.map((r) => COLUMNS.map((c) => escapeCsv(r[c.key])).join(',')).join('\r\n');
  return '﻿' + head + (body ? '\r\n' + body : '');
}

export async function toXLSX(leads) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Leads');
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: Math.max(12, c.header.length + 3) }));
  ws.addRows(rowsFromLeads(leads));
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF1F4' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }]; // congela o cabeçalho
  ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + COLUMNS.length)}1` };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
