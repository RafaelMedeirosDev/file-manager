import jsPDF from 'jspdf';

export type PdfUser = { name: string; email: string };
export type PdfExam = { name: string; code: string; category: string };

export function generateExamRequestPDF(user: PdfUser, exams: PdfExam[], indication: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const orderNum = 'SOL-' + String(now.getTime()).slice(-6);

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const colW = pageW - margin * 2;
  let y = 0;

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(0, 120, 212);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Laboratório Médico', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Solicitação de Exames', margin, 18);
  doc.text(`${dateStr}  ${timeStr}`, pageW - margin, 11, { align: 'right' });
  doc.text(`Solicitação: ${orderNum}`, pageW - margin, 18, { align: 'right' });

  // ── Helpers ──────────────────────────────────────────────
  const sectionTitle = (label: string, yPos: number): number => {
    doc.setFillColor(240, 245, 255);
    doc.rect(margin, yPos, colW, 7, 'F');
    doc.setTextColor(0, 120, 212);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(label.toUpperCase(), margin + 3, yPos + 5);
    return yPos + 11;
  };

  const field = (label: string, value: string, yPos: number, labelW = 40): number => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label, margin + 3, yPos);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 3 + labelW, yPos);
    return yPos + 6.5;
  };

  // ── Patient ──────────────────────────────────────────────
  y = 36;
  y = sectionTitle('Dados do Paciente', y);
  y = field('Nome', user.name, y);
  y = field('E-mail', user.email, y);
  y += 4;

  // ── Exams table ──────────────────────────────────────────
  y = sectionTitle('Exames Solicitados', y);

  doc.setFillColor(220, 230, 255);
  doc.rect(margin, y - 1, colW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 120, 212);
  doc.text('#', margin + 3, y + 4);
  doc.text('Código', margin + 10, y + 4);
  doc.text('Exame', margin + 35, y + 4);
  doc.text('Categoria', margin + 120, y + 4);
  y += 9;

  exams.forEach((exam, i) => {
    const rowBg: [number, number, number] = i % 2 === 0 ? [255, 255, 255] : [248, 250, 255];
    doc.setFillColor(...rowBg);
    doc.rect(margin, y - 1, colW, 7, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(String(i + 1), margin + 3, y + 4);

    doc.setTextColor(0, 120, 212);
    doc.setFont('helvetica', 'bold');
    doc.text(exam.code, margin + 10, y + 4);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(exam.name, margin + 35, y + 4);
    doc.text(exam.category, margin + 120, y + 4);
    y += 7;
  });

  doc.setDrawColor(200, 210, 240);
  doc.rect(margin, y - exams.length * 7 - 9, colW, exams.length * 7 + 9, 'S');
  y += 6;

  // ── Indication ───────────────────────────────────────────
  y = sectionTitle('Indicação', y);
  if (indication.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(indication, colW - 6);
    doc.text(lines, margin + 3, y);
    y += lines.length * 5.5;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text('Nenhuma indicação informada.', margin + 3, y);
    y += 7;
  }
  y += 4;

  // ── Signature line ────────────────────────────────────────
  y = Math.max(y, 220);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 70, y);
  doc.line(margin + 90, y, margin + 160, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('Médico Solicitante', margin, y + 5);
  doc.text('Data', margin + 90, y + 5);

  // ── Footer ────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(245, 247, 250);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Este documento é confidencial e destinado exclusivamente ao paciente identificado.',
    pageW / 2,
    pageH - 8,
    { align: 'center' },
  );
  doc.text(
    `Gerado em ${dateStr} às ${timeStr}  ·  ${orderNum}`,
    pageW / 2,
    pageH - 4,
    { align: 'center' },
  );

  doc.save(`solicitacao-${orderNum}.pdf`);
}
