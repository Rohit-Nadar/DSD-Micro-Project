# ============================================================================
# PROJECT: ATM Security & Transaction Verification System
# FILE: backend/receipt.py
# DESCRIPTION: Digital & PDF receipt generator for ATM transactions
# ============================================================================

import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_receipt_number(card_id: str, tx_type: str) -> str:
    """Generates a unique ATM receipt identifier."""
    now = datetime.utcnow()
    timestamp_str = now.strftime("%Y%m%d%H%M%S")
    micro = now.strftime("%f")[:3]
    return f"REC-{card_id[:3]}-{timestamp_str}-{micro}"

def format_text_receipt(tx_data: dict) -> str:
    """Formats an ASCII thermal receipt for immediate on-screen display."""
    card = str(tx_data.get("card_id", "000000"))
    masked_card = f"XXXX-XX{card[-4:]}" if len(card) >= 4 else "XXXXXX"
    timestamp = tx_data.get("timestamp", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
    amount = tx_data.get("amount", 0.0)
    bal_after = tx_data.get("balance_after", 0.0)
    tx_type = tx_data.get("tx_type", "TRANSACTION")
    receipt_no = tx_data.get("receipt_no", "N/A")
    status = "APPROVED" if tx_data.get("approved", True) else "REJECTED"

    lines = [
        "========================================",
        "   KARUNYA DIGITAL BANKING SYSTEM",
        "  ATM SECURITY & TRANSACTION TERMINAL",
        "         TERMINAL ID: KITS-ATM-01",
        "========================================",
        f"DATE/TIME : {timestamp}",
        f"RECEIPT NO: {receipt_no}",
        f"CARD NO   : {masked_card}",
        f"STATUS    : {status}",
        "----------------------------------------",
        f"TRANSACTION: {tx_type}",
        f"AMOUNT     : INR {amount:,.2f}",
        f"AVAIL BAL  : INR {bal_after:,.2f}",
        "----------------------------------------",
        "       VERIFIED VIA SIMULINK DSD",
        "      & HARDWARE FSM VERILOG LOGIC",
        "========================================",
        "      THANK YOU FOR BANKING WITH US!",
        "========================================"
    ]
    return "\n".join(lines)

def generate_pdf_receipt(tx_data: dict) -> bytes:
    """Generates a professional PDF receipt using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=(320, 480), # Thermal paper aspect ratio
        rightMargin=15,
        leftMargin=15,
        topMargin=20,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=12,
        alignment=1, # Center
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontSize=8,
        alignment=1,
        fontName='Helvetica',
        textColor=colors.HexColor('#475569'),
        spaceAfter=10
    )
    bold_cell = ParagraphStyle(
        'BoldCell',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1E293B')
    )
    val_cell = ParagraphStyle(
        'ValCell',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica',
        alignment=2, # Right align
        textColor=colors.HexColor('#0F172A')
    )

    card = str(tx_data.get("card_id", "000000"))
    masked_card = f"XXXX-XX{card[-4:]}" if len(card) >= 4 else "XXXXXX"
    status = "APPROVED" if tx_data.get("approved", True) else "REJECTED"
    status_color = "#16A34A" if tx_data.get("approved", True) else "#DC2626"

    story = []
    story.append(Paragraph("KARUNYA DIGITAL BANK", title_style))
    story.append(Paragraph("ATM Security & Verification System | 25DC205", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    table_data = [
        [Paragraph("Terminal ID", bold_cell), Paragraph("KITS-DSD-ATM-01", val_cell)],
        [Paragraph("Receipt No", bold_cell), Paragraph(str(tx_data.get("receipt_no", "")), val_cell)],
        [Paragraph("Date / Time", bold_cell), Paragraph(str(tx_data.get("timestamp", datetime.utcnow().strftime("%Y-%m-%d %H:%M"))), val_cell)],
        [Paragraph("Card Number", bold_cell), Paragraph(masked_card, val_cell)],
        [Paragraph("Account Holder", bold_cell), Paragraph(str(tx_data.get("account_holder", "Authorized User")), val_cell)],
        [Paragraph("Transaction", bold_cell), Paragraph(str(tx_data.get("tx_type", "ENQUIRY")), val_cell)],
        [Paragraph("Amount", bold_cell), Paragraph(f"INR {float(tx_data.get('amount', 0)):,.2f}", val_cell)],
        [Paragraph("Available Balance", bold_cell), Paragraph(f"INR {float(tx_data.get('balance_after', 0)):,.2f}", val_cell)],
        [Paragraph("Verification Status", bold_cell), Paragraph(f"<font color='{status_color}'><b>{status}</b></font>", val_cell)],
    ]

    if tx_data.get("target_card_id"):
        table_data.insert(6, [Paragraph("Target Card", bold_cell), Paragraph(str(tx_data.get("target_card_id")), val_cell)])

    table = Table(table_data, colWidths=[120, 170])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#F1F5F9'))
    ]))
    story.append(table)

    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=6))
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=7,
        alignment=1,
        fontName='Helvetica-Oblique',
        textColor=colors.HexColor('#64748B')
    )
    story.append(Paragraph("Hardware-Verified via Simulink Stateflow & Verilog Engine", footer_style))
    story.append(Paragraph("Thank you for using Karunya ATM Services", footer_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

