import { Router } from 'express';
import { z } from 'zod';
import puppeteer from 'puppeteer';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { logActivity } from '../lib/activity';
import { deliverWebhook } from '../services/webhook.service';
import { Role } from '@agencyos/shared';

const router = Router();
router.use(authenticate);

interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

const itemSchema = z.object({
  description: z.string().min(1),
  qty: z.number().min(0),
  rate: z.number().min(0),
  amount: z.number().min(0),
});

const invoiceSchema = z.object({
  clientId: z.string(),
  title: z.string().min(1).max(200),
  items: z.array(itemSchema).min(1),
  taxRate: z.number().min(0).max(100).default(0),
  currency: z.string().default('INR'),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

function computeTotals(items: InvoiceItem[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const total = subtotal + subtotal * (taxRate / 100);
  return { subtotal, total };
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function buildInvoiceHtml(data: {
  agencyName: string;
  primaryColor: string;
  invoice: {
    invoiceNumber: string;
    title: string;
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    total: number;
    currency: string;
    dueDate: Date | null;
    notes: string | null;
    createdAt: Date;
  };
  clientName: string;
  clientDomain: string;
  contactName: string | null;
  contactEmail: string | null;
}): string {
  const primary = data.primaryColor || '#1a472a';
  const inv = data.invoice;
  const createdDate = new Date(inv.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const dueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'On receipt';

  const itemRows = inv.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:right">${formatCurrency(item.rate, inv.currency)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111827;font-weight:600;text-align:right">${formatCurrency(item.amount, inv.currency)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#111827; background:#fff; padding:48px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:48px; }
  .agency-name { font-size:24px; font-weight:700; color:${primary}; }
  .invoice-label { font-size:32px; font-weight:800; color:#111827; letter-spacing:-1px; }
  .invoice-number { font-size:14px; color:#6b7280; margin-top:4px; }
  .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:40px; }
  .meta-block label { font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; display:block; margin-bottom:4px; }
  .meta-block p { font-size:13px; color:#374151; line-height:1.5; }
  .meta-block .name { font-size:15px; font-weight:600; color:#111827; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  thead tr { background:${primary}; }
  thead th { padding:10px 12px; text-align:left; font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; color:#fff; }
  thead th:last-child, thead th:nth-child(3), thead th:nth-child(2) { text-align:right; }
  thead th:nth-child(2) { text-align:center; }
  .totals { margin-left:auto; width:280px; }
  .totals-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#374151; border-bottom:1px solid #f3f4f6; }
  .totals-total { display:flex; justify-content:space-between; padding:12px 0 0; font-size:16px; font-weight:700; color:#111827; }
  .notes-section { margin-top:32px; padding:16px; background:#f9fafb; border-radius:8px; }
  .notes-section label { font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; display:block; margin-bottom:6px; }
  .notes-section p { font-size:13px; color:#374151; line-height:1.6; white-space:pre-wrap; }
  .footer { margin-top:48px; padding-top:16px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; font-size:11px; color:#9ca3af; }
</style></head>
<body>
  <div class="header">
    <div>
      <div class="agency-name">${data.agencyName}</div>
    </div>
    <div style="text-align:right">
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-number">${inv.invoiceNumber}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <label>Bill To</label>
      <p class="name">${data.clientName}</p>
      ${data.contactName ? `<p>${data.contactName}</p>` : ''}
      ${data.contactEmail ? `<p>${data.contactEmail}</p>` : ''}
      <p>${data.clientDomain}</p>
    </div>
    <div class="meta-block" style="text-align:right">
      <div style="margin-bottom:12px">
        <label>Invoice Title</label>
        <p>${inv.title}</p>
      </div>
      <div style="margin-bottom:12px">
        <label>Invoice Date</label>
        <p>${createdDate}</p>
      </div>
      <div>
        <label>Due Date</label>
        <p style="font-weight:600;color:#111827">${dueDate}</p>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:50%">Description</th>
        <th style="width:10%">Qty</th>
        <th style="width:20%">Rate</th>
        <th style="width:20%">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>${formatCurrency(inv.subtotal, inv.currency)}</span>
    </div>
    ${inv.taxRate > 0 ? `<div class="totals-row"><span>Tax (${inv.taxRate}%)</span><span>${formatCurrency(inv.total - inv.subtotal, inv.currency)}</span></div>` : ''}
    <div class="totals-total">
      <span>Total Due</span>
      <span style="color:${primary}">${formatCurrency(inv.total, inv.currency)}</span>
    </div>
  </div>

  ${inv.notes ? `<div class="notes-section"><label>Notes</label><p>${inv.notes}</p></div>` : ''}

  <div class="footer">
    <span>Generated by Agency OS</span>
    <span>${data.agencyName} · ${inv.invoiceNumber}</span>
  </div>
</body>
</html>`;
}

// List invoices
router.get('/', asyncHandler(async (req, res) => {
  const { clientId, status, page = '1', limit = '50' } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { agencyId: req.user!.agencyId };
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  const take = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * take;
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ data: invoices, pagination: { page: parseInt(page), limit: take, total } });
}));

// Create invoice
router.post('/', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const data = invoiceSchema.parse(req.body);
  const client = await prisma.client.findFirst({ where: { id: data.clientId, agencyId: req.user!.agencyId } });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

  const count = await prisma.invoice.count({ where: { agencyId: req.user!.agencyId } });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const items = data.items as InvoiceItem[];
  const { subtotal, total } = computeTotals(items, data.taxRate);

  const invoice = await prisma.invoice.create({
    data: {
      agencyId: req.user!.agencyId,
      clientId: data.clientId,
      invoiceNumber,
      title: data.title,
      items: data.items,
      subtotal,
      taxRate: data.taxRate,
      total,
      currency: data.currency,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes ?? null,
    },
    include: { client: { select: { name: true } } },
  });

  await logActivity({
    agencyId: req.user!.agencyId,
    userId: req.user!.userId,
    action: 'INVOICE_CREATED',
    resourceType: 'Invoice',
    resourceId: invoice.id,
    metadata: { invoiceNumber, clientName: client.name, total },
  });

  res.status(201).json({ data: invoice });
}));

// Get single invoice
router.get('/:id', asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, agencyId: req.user!.agencyId },
    include: { client: { select: { name: true, domain: true, contactName: true, contactEmail: true } } },
  });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  res.json({ data: invoice });
}));

// Update invoice (DRAFT only)
router.put('/:id', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  if (invoice.status !== 'DRAFT') { res.status(400).json({ error: 'Only DRAFT invoices can be edited' }); return; }

  const data = invoiceSchema.partial().parse(req.body);
  const items = (data.items ?? invoice.items) as InvoiceItem[];
  const taxRate = data.taxRate ?? invoice.taxRate;
  const { subtotal, total } = computeTotals(items, taxRate);

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      title: data.title,
      items: data.items,
      subtotal,
      taxRate,
      total,
      currency: data.currency,
      dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
    },
    include: { client: { select: { name: true } } },
  });
  res.json({ data: updated });
}));

// Mark as SENT
router.post('/:id/send', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  if (invoice.status !== 'DRAFT') { res.status(400).json({ error: 'Only DRAFT invoices can be sent' }); return; }
  const updated = await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'SENT' } });
  await logActivity({
    agencyId: req.user!.agencyId,
    userId: req.user!.userId,
    action: 'INVOICE_SENT',
    resourceType: 'Invoice',
    resourceId: invoice.id,
    metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.total },
  });
  void deliverWebhook({ agencyId: req.user!.agencyId, event: 'invoice.sent', payload: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, total: invoice.total, clientId: invoice.clientId } });
  res.json({ data: updated });
}));

// Mark as PAID
router.post('/:id/paid', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  if (!['SENT', 'OVERDUE'].includes(invoice.status)) { res.status(400).json({ error: 'Invoice must be SENT or OVERDUE to mark as paid' }); return; }
  const updated = await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'PAID' } });
  await logActivity({
    agencyId: req.user!.agencyId,
    userId: req.user!.userId,
    action: 'INVOICE_PAID',
    resourceType: 'Invoice',
    resourceId: invoice.id,
    metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.total },
  });
  void deliverWebhook({ agencyId: req.user!.agencyId, event: 'invoice.paid', payload: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, total: invoice.total, clientId: invoice.clientId } });
  res.json({ data: updated });
}));

// Mark as OVERDUE
router.post('/:id/overdue', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  if (invoice.status !== 'SENT') { res.status(400).json({ error: 'Only SENT invoices can be marked overdue' }); return; }
  const updated = await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'OVERDUE' } });
  res.json({ data: updated });
}));

// Delete (DRAFT only)
router.delete('/:id', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  if (invoice.status !== 'DRAFT') { res.status(400).json({ error: 'Only DRAFT invoices can be deleted' }); return; }
  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.json({ message: 'Invoice deleted' });
}));

// Generate PDF
router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, agencyId: req.user!.agencyId },
    include: { client: { select: { name: true, domain: true, contactName: true, contactEmail: true } } },
  });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }

  const agency = await prisma.agency.findUnique({ where: { id: req.user!.agencyId } });

  const html = buildInvoiceHtml({
    agencyName: agency?.name ?? 'Agency',
    primaryColor: agency?.primaryColor ?? '#1a472a',
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      items: invoice.items as unknown as InvoiceItem[],
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      total: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
    },
    clientName: invoice.client.name,
    clientDomain: invoice.client.domain,
    contactName: invoice.client.contactName,
    contactEmail: invoice.client.contactEmail,
  });

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(Buffer.from(pdf));
}));

export default router;
