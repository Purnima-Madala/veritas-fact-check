import PDFDocument from 'pdfkit';
import type { Analysis } from '../types.js';

export async function buildReport(analysis: Analysis): Promise<Buffer> {
  return new Promise((resolve) => { const doc = new PDFDocument({ margin: 52 }); const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(22).fillColor('#102a43').text('Veritas Fact Check Report'); doc.moveDown();
    doc.fontSize(11).fillColor('#52606d').text(`Generated ${new Date(analysis.createdAt).toLocaleString()}`); doc.moveDown();
    doc.fontSize(14).fillColor('#102a43').text('Claim'); doc.fontSize(11).fillColor('#243b53').text(analysis.claim); doc.moveDown();
    doc.fontSize(14).fillColor('#102a43').text(`Recommendation — ${analysis.consensus}% consensus`); doc.fontSize(11).fillColor('#243b53').text(analysis.recommendation); doc.moveDown();
    analysis.models.forEach((m) => { doc.fontSize(13).fillColor('#102a43').text(`${m.name}: ${m.verdict} (${m.confidence}% confidence)`); doc.fontSize(10).fillColor('#243b53').text(m.response); if (m.sources.length) doc.fillColor('#52606d').text(`Sources: ${m.sources.map(s => s.title).join('; ')}`); doc.moveDown(); });
    doc.end();
  });
}
