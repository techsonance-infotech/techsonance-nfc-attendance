import { jsPDF } from 'jspdf';

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface BusinessSettings {
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  logoUrl: string | null;
  termsAndConditions: string | null;
  notes: string | null;
}

export async function generateInvoicePDF(
  invoice: InvoiceData,
  items: InvoiceItem[],
  settings: BusinessSettings | null
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };

  // Add logo if available
  if (settings?.logoUrl) {
    try {
      // Note: In production, you'd need to handle CORS and convert the image properly
      // For now, we'll skip the logo if it fails to load
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('[Logo]', margin, yPosition);
      yPosition += 15;
    } catch (error) {
      yPosition += 5;
    }
  }

  // Business Information (Top Left)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(settings?.businessName || 'Your Business', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  if (settings?.businessAddress) {
    yPosition = addWrappedText(settings.businessAddress, margin, yPosition, 80, 5);
  }
  if (settings?.businessPhone) {
    doc.text(`Phone: ${settings.businessPhone}`, margin, yPosition);
    yPosition += 5;
  }
  if (settings?.businessEmail) {
    doc.text(`Email: ${settings.businessEmail}`, margin, yPosition);
    yPosition += 5;
  }

  // Invoice Title (Top Right)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('INVOICE', pageWidth - margin, 20, { align: 'right' });

  // Invoice Details (Top Right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  let rightYPosition = 30;
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - margin, rightYPosition, { align: 'right' });
  rightYPosition += 6;
  doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, pageWidth - margin, rightYPosition, { align: 'right' });
  rightYPosition += 6;
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, pageWidth - margin, rightYPosition, { align: 'right' });
  rightYPosition += 6;

  // Status badge
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const statusColors: Record<string, [number, number, number]> = {
    paid: [34, 197, 94],
    sent: [59, 130, 246],
    draft: [156, 163, 175],
    overdue: [239, 68, 68],
  };
  const statusColor = statusColors[invoice.status] || [156, 163, 175];
  doc.setTextColor(...statusColor);
  doc.text(invoice.status.toUpperCase(), pageWidth - margin, rightYPosition, { align: 'right' });

  // Reset position for bill to section
  yPosition = Math.max(yPosition, rightYPosition) + 15;

  // Bill To Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('BILL TO:', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.clientName, margin, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text(invoice.clientEmail, margin, yPosition);
  yPosition += 5;

  if (invoice.clientAddress) {
    yPosition = addWrappedText(invoice.clientAddress, margin, yPosition, 80, 5);
  }

  yPosition += 10;

  // Items Table Header
  const tableStartY = yPosition;
  const colWidths = {
    description: 85,
    quantity: 25,
    unitPrice: 30,
    amount: 30,
  };

  // Table header background
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition - 5, pageWidth - (2 * margin), 10, 'F');

  // Table headers
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('DESCRIPTION', margin + 2, yPosition);
  doc.text('QTY', margin + colWidths.description + 5, yPosition, { align: 'center' });
  doc.text('UNIT PRICE', margin + colWidths.description + colWidths.quantity + 5, yPosition, { align: 'right' });
  doc.text('AMOUNT', pageWidth - margin - 2, yPosition, { align: 'right' });
  yPosition += 8;

  // Table items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40);

  items.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition - 4, pageWidth - (2 * margin), 8, 'F');
    }

    // Description (with word wrap if needed)
    const descLines = doc.splitTextToSize(item.description, colWidths.description - 5);
    doc.text(descLines, margin + 2, yPosition);
    
    // Quantity
    doc.text(item.quantity.toString(), margin + colWidths.description + 5, yPosition, { align: 'center' });
    
    // Unit Price
    doc.text(formatCurrency(item.unitPrice), margin + colWidths.description + colWidths.quantity + 5, yPosition, { align: 'right' });
    
    // Amount
    doc.text(formatCurrency(item.amount), pageWidth - margin - 2, yPosition, { align: 'right' });
    
    yPosition += Math.max(8, descLines.length * 5);
  });

  // Add some space before totals
  yPosition += 5;

  // Draw line above totals
  doc.setDrawColor(220);
  doc.line(pageWidth - 90, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Totals section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  // Subtotal
  doc.text('Subtotal:', pageWidth - 65, yPosition);
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 6;

  // Tax
  doc.text(`GST (${invoice.taxRate}%):`, pageWidth - 65, yPosition);
  doc.text(formatCurrency(invoice.taxAmount), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 8;

  // Total (bold and larger)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Total:', pageWidth - 65, yPosition);
  doc.text(formatCurrency(invoice.totalAmount), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 12;

  // Invoice Notes
  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Notes:', margin, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    yPosition = addWrappedText(invoice.notes, margin, yPosition, pageWidth - (2 * margin), 5);
    yPosition += 5;
  }

  // Terms and Conditions
  if (settings?.termsAndConditions) {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Terms and Conditions:', margin, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    yPosition = addWrappedText(settings.termsAndConditions, margin, yPosition, pageWidth - (2 * margin), 5);
    yPosition += 5;
  }

  // Business Notes
  if (settings?.notes) {
    // Check if we need a new page
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    yPosition = addWrappedText(settings.notes, margin, yPosition, pageWidth - (2 * margin), 5);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-IN')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return doc;
}

export async function downloadInvoicePDF(invoiceId: number, token: string) {
  try {
    // Fetch invoice data
    const invoiceRes = await fetch(`/api/invoices?id=${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!invoiceRes.ok) throw new Error('Failed to fetch invoice');
    const invoice = await invoiceRes.json();

    // Fetch invoice items
    const itemsRes = await fetch(`/api/invoice-items?invoice_id=${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!itemsRes.ok) throw new Error('Failed to fetch invoice items');
    const items = await itemsRes.json();

    // Fetch business settings
    let settings = null;
    try {
      const settingsRes = await fetch('/api/invoice-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.data !== null) {
          settings = settingsData;
        }
      }
    } catch (error) {
      console.warn('Could not fetch business settings:', error);
    }

    // Generate PDF
    const pdf = await generateInvoicePDF(invoice, items, settings);

    // Download using blob and anchor element (iframe-compatible)
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${invoice.invoiceNumber}.pdf`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export async function printInvoicePDF(invoiceId: number, token: string) {
  try {
    // Fetch invoice data
    const invoiceRes = await fetch(`/api/invoices?id=${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!invoiceRes.ok) throw new Error('Failed to fetch invoice');
    const invoice = await invoiceRes.json();

    // Fetch invoice items
    const itemsRes = await fetch(`/api/invoice-items?invoice_id=${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!itemsRes.ok) throw new Error('Failed to fetch invoice items');
    const items = await itemsRes.json();

    // Fetch business settings
    let settings = null;
    try {
      const settingsRes = await fetch('/api/invoice-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.data !== null) {
          settings = settingsData;
        }
      }
    } catch (error) {
      console.warn('Could not fetch business settings:', error);
    }

    // Generate PDF
    const pdf = await generateInvoicePDF(invoice, items, settings);

    // Get PDF as data URL (base64) for iframe-compatible printing
    const pdfDataUri = pdf.output('dataurlstring');
    
    // Create hidden iframe for printing (iframe-compatible approach)
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    
    document.body.appendChild(printFrame);
    
    // Write PDF to iframe and trigger print
    if (printFrame.contentWindow) {
      printFrame.onload = () => {
        try {
          if (printFrame.contentWindow) {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
          }
          
          // Clean up iframe after printing (with delay to ensure print dialog opens)
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        } catch (error) {
          console.error('Error triggering print:', error);
          document.body.removeChild(printFrame);
          throw error;
        }
      };
      
      // Load PDF into iframe
      printFrame.src = pdfDataUri;
    }
  } catch (error) {
    console.error('Error printing PDF:', error);
    throw error;
  }
}