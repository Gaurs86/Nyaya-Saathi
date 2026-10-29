"""Human-readable exports for lawyer-reviewed intake briefs."""
from __future__ import annotations

from html import escape
from io import BytesIO
from pathlib import Path
from typing import Any

from docx import Document
from docx.shared import Inches, Pt
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class UnicodeFontUnavailable(RuntimeError):
    """Raised when an Indic PDF is requested but no suitable font is installed."""


def _text(value: Any) -> str:
    if value is None:
        return "Not provided"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (dict, list)):
        import json
        return json.dumps(value, ensure_ascii=False, indent=2)
    return str(value)


def _first_font(candidates: list[str]) -> str | None:
    return next((candidate for candidate in candidates if Path(candidate).is_file()), None)


def _pdf_font(language: str, text: str) -> str:
    """Find an installed Unicode font; fail clearly rather than garble Indic text."""
    lang = (language or "en").lower()
    common = [
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    if lang == "hi":
        candidates = [
            "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
            *common,
        ]
    elif lang == "kn":
        candidates = [
            "/usr/share/fonts/truetype/noto/NotoSansKannada-Regular.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansKannada/NotoSansKannada-Regular.ttf",
            *common,
        ]
    else:
        candidates = common

    font_path = _first_font(candidates)
    needs_unicode = any(ord(char) > 127 for char in text)
    if font_path is None:
        if lang in {"hi", "kn"} or needs_unicode:
            raise UnicodeFontUnavailable(
                "No suitable Unicode font is installed for this PDF. Install Noto fonts or download the DOCX export, which supports Unicode text."
            )
        return "Helvetica"

    name = "NyayaReviewUnicode"
    if name not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(name, font_path))
    pdfmetrics.registerFontFamily(name, normal=name, bold=name, italic=name, boldItalic=name)
    return name


def _collect_text(brief: dict) -> str:
    chunks: list[str] = []
    def walk(value):
        if isinstance(value, dict):
            for key, item in value.items():
                chunks.append(str(key))
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)
        elif value is not None:
            chunks.append(str(value))
    walk(brief)
    return " ".join(chunks)


def _pdf_paragraph(value: Any, style: ParagraphStyle) -> Paragraph:
    # Escape model- or user-supplied text before passing to ReportLab's XML parser.
    text = escape(_text(value)).replace("\n", "<br/>")
    return Paragraph(text, style)


def _pdf_labeled(label: str, value: Any, style: ParagraphStyle) -> Paragraph:
    safe_label = escape(label)
    safe_value = escape(_text(value)).replace("\n", "<br/>")
    return Paragraph(f"<b>{safe_label}:</b> {safe_value}", style)


def _items_for(brief: dict, key: str) -> list:
    value = brief.get(key)
    return value if isinstance(value, list) else []


def export_pdf(case: dict) -> bytes:
    brief = case.get("brief") or {}
    language = brief.get("language", "en")
    font = _pdf_font(language, _collect_text(brief))
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=17 * mm,
        title=f"Nyaya-Saathi reviewed intake brief - {case.get('case_id', '')}",
        author="Nyaya-Saathi",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="NyayaTitle", parent=styles["Title"], fontName=font,
        fontSize=18, leading=22, alignment=TA_CENTER, textColor=colors.HexColor("#243B53"),
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="NyayaHeading", parent=styles["Heading2"], fontName=font,
        fontSize=11.5, leading=15, textColor=colors.HexColor("#176B5B"),
        spaceBefore=10, spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="NyayaBody", parent=styles["BodyText"], fontName=font,
        fontSize=9, leading=12, spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="NyayaSmall", parent=styles["BodyText"], fontName=font,
        fontSize=7.5, leading=10, textColor=colors.HexColor("#52606D"),
    ))

    story = [
        Paragraph("Nyaya-Saathi - Lawyer Intake Brief", styles["NyayaTitle"]),
        _pdf_labeled("Matter title", case.get("title"), styles["NyayaBody"]),
        _pdf_paragraph(f"Status: {str(case.get('status', '')).replace('_', ' ').upper()}", styles["NyayaBody"]),
        _pdf_paragraph(f"Case ID: {case.get('case_id')}", styles["NyayaSmall"]),
        _pdf_paragraph(f"Revision: {case.get('revision')} | Updated: {case.get('updated_at')}", styles["NyayaSmall"]),
    ]
    approval = brief.get("reviewer_approval") or {}
    if case.get("status") == "approved":
        story.append(_pdf_paragraph(
            f"Reviewed by: {approval.get('reviewer_label', 'reviewer')} | {approval.get('reviewed_at', '')}",
            styles["NyayaBody"],
        ))
    else:
        story.append(_pdf_paragraph("DRAFT - NOT APPROVED FOR RELIANCE", styles["NyayaHeading"]))

    def heading(label: str):
        story.append(Paragraph(escape(label), styles["NyayaHeading"]))

    def bullets(values: list):
        if not values:
            story.append(_pdf_paragraph("None recorded.", styles["NyayaBody"]))
            return
        for value in values:
            story.append(_pdf_paragraph("- " + _text(value), styles["NyayaBody"]))

    heading("Document")
    document = brief.get("document") or {}
    for key, label in [
        ("type", "Type"), ("type_confidence", "Classification confidence"),
        ("notice_language", "Notice language"), ("issuing_authority", "Issuing authority"),
        ("case_number", "Case number"), ("readable", "Readable"),
    ]:
        story.append(_pdf_labeled(label, document.get(key), styles["NyayaBody"]))

    heading("Summary")
    story.append(_pdf_paragraph(brief.get("summary"), styles["NyayaBody"]))

    heading("Parties")
    parties = _items_for(brief, "parties")
    if parties:
        data = [[
            Paragraph("<b>Role</b>", styles["NyayaBody"]),
            Paragraph("<b>Name</b>", styles["NyayaBody"]),
            Paragraph("<b>Source quote</b>", styles["NyayaBody"]),
            Paragraph("<b>Page</b>", styles["NyayaBody"]),
        ]]
        for item in parties:
            data.append([_pdf_paragraph(item.get("role"), styles["NyayaBody"]),
                         _pdf_paragraph(item.get("name"), styles["NyayaBody"]),
                         _pdf_paragraph(item.get("source_quote"), styles["NyayaBody"]),
                         _pdf_paragraph(item.get("page_number"), styles["NyayaBody"])])
        table = Table(data, colWidths=[27*mm, 40*mm, 78*mm, 14*mm], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#E8F3F0")),
            ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#CBD2D9")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 5),
            ("RIGHTPADDING", (0,0), (-1,-1), 5),
            ("TOPPADDING", (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ]))
        story.append(table)
    else:
        story.append(_pdf_paragraph("No parties extracted.", styles["NyayaBody"]))

    heading("Demands or claims")
    bullets(_items_for(brief, "demands_or_claims"))

    heading("Dates and periods")
    for item in _items_for(brief, "dates_and_periods"):
        assessment = item.get("preliminary_assessment") or {}
        line = (
            f"{escape(_text(item.get('label')))}: {escape(_text(item.get('original_text')))}"
            f" · source page {escape(_text(item.get('page_number')))}"
            f" · calculated date: {escape(_text(assessment.get('due_date')))}"
            f" · status: {escape(_text(assessment.get('status')))}"
            f" · basis: {escape(_text(assessment.get('basis')))}"
        )
        story.append(_pdf_paragraph(line, styles["NyayaBody"]))

    heading("Legal provisions cited")
    bullets(_items_for(brief, "legal_provisions_cited"))

    heading("Supporting evidence")
    for item in _items_for(brief, "supporting_evidence"):
        story.append(_pdf_paragraph(
            f"{escape(_text(item.get('field')))}: \"{escape(_text(item.get('quote')))}\""
            f" · page {escape(_text(item.get('page_number')))}"
            f" · quote match: {escape(_text(item.get('quote_match_status')))}"
            f" · review status: {escape(_text(item.get('verification_status')))}",
            styles["NyayaBody"],
        ))

    heading("Reviewer corrections")
    corrections = _items_for(brief, "reviewer_corrections")
    if not corrections:
        story.append(_pdf_paragraph("No reviewer corrections recorded.", styles["NyayaBody"]))
    for correction in corrections:
        story.append(_pdf_paragraph(
            f"Revision {escape(_text(correction.get('revision')))} | reviewer {escape(_text(correction.get('reviewer_label')))} | fields: {escape(_text(correction.get('fields')))} | note: {escape(_text(correction.get('note')))}",
            styles["NyayaBody"],
        ))

    heading("Urgency flags")
    bullets(_items_for(brief, "urgency_flags"))
    heading("Information to confirm")
    bullets(_items_for(brief, "information_to_confirm"))
    heading("Lawyer review checklist")
    bullets(_items_for(brief, "lawyer_review_checklist"))
    heading("Limitations")
    bullets(_items_for(brief, "important_limitations"))

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont(font, 7)
        canvas.setFillColor(colors.HexColor("#52606D"))
        canvas.drawString(18*mm, 9*mm, "Contains personal/legal matter information - handle according to organisation policy.")
        canvas.drawRightString(A4[0] - 18*mm, 9*mm, f"Page {document.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()


def export_docx(case: dict) -> bytes:
    brief = case.get("brief") or {}
    document = Document()
    section = document.sections[0]
    section.top_margin = Inches(0.65)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)

    normal = document.styles["Normal"]
    normal.font.name = "Noto Sans"
    normal.font.size = Pt(9)

    document.add_heading("Nyaya-Saathi - Lawyer Intake Brief", 0)
    document.add_paragraph(f"Matter title: {case.get('title')}")
    document.add_paragraph(f"Status: {str(case.get('status', '')).replace('_', ' ').upper()}")
    document.add_paragraph(f"Case ID: {case.get('case_id')} | Revision: {case.get('revision')} | Updated: {case.get('updated_at')}")
    approval = brief.get("reviewer_approval") or {}
    if case.get("status") == "approved":
        document.add_paragraph(f"Reviewed by: {approval.get('reviewer_label', 'reviewer')} | {approval.get('reviewed_at', '')}")
    else:
        p = document.add_paragraph()
        run = p.add_run("DRAFT — NOT APPROVED FOR RELIANCE")
        run.bold = True

    def add_field(label: str, value: Any):
        p = document.add_paragraph()
        p.add_run(label + ": ").bold = True
        p.add_run(_text(value))

    def add_list(label: str, values: list):
        document.add_heading(label, level=1)
        if not values:
            document.add_paragraph("None recorded.")
            return
        for value in values:
            document.add_paragraph(_text(value), style="List Bullet")

    document.add_heading("Document", level=1)
    for key, label in [
        ("type", "Type"), ("type_confidence", "Classification confidence"),
        ("notice_language", "Notice language"), ("issuing_authority", "Issuing authority"),
        ("case_number", "Case number"), ("readable", "Readable"),
    ]:
        add_field(label, (brief.get("document") or {}).get(key))
    document.add_heading("Summary", level=1)
    document.add_paragraph(_text(brief.get("summary")))

    parties = _items_for(brief, "parties")
    document.add_heading("Parties", level=1)
    table = document.add_table(rows=1, cols=4)
    table.style = "Light Shading Accent 1"
    for cell, value in zip(table.rows[0].cells, ["Role", "Name", "Source quote", "Page"]):
        cell.text = value
    for item in parties:
        cells = table.add_row().cells
        for cell, key in zip(cells, ["role", "name", "source_quote", "page_number"]):
            cell.text = _text(item.get(key))

    add_list("Demands or claims", _items_for(brief, "demands_or_claims"))
    document.add_heading("Dates and periods", level=1)
    for item in _items_for(brief, "dates_and_periods"):
        document.add_heading(_text(item.get("label")), level=2)
        add_field("Original text", item.get("original_text"))
        add_field("Page", item.get("page_number"))
        assessment = item.get("preliminary_assessment") or {}
        add_field("Preliminary calculated date", assessment.get("due_date"))
        add_field("Calculation status", assessment.get("status"))
        add_field("Basis", assessment.get("basis"))
    add_list("Legal provisions cited", _items_for(brief, "legal_provisions_cited"))
    document.add_heading("Supporting evidence", level=1)
    for item in _items_for(brief, "supporting_evidence"):
        add_field(_text(item.get("field")), f'“{_text(item.get("quote"))}” (page {_text(item.get("page_number"))}; quote match: {_text(item.get("quote_match_status"))}; {_text(item.get("verification_status"))})')
    add_list("Reviewer corrections", _items_for(brief, "reviewer_corrections"))
    add_list("Urgency flags", _items_for(brief, "urgency_flags"))
    add_list("Information to confirm", _items_for(brief, "information_to_confirm"))
    add_list("Lawyer review checklist", _items_for(brief, "lawyer_review_checklist"))
    add_list("Limitations", _items_for(brief, "important_limitations"))

    output = BytesIO()
    document.save(output)
    return output.getvalue()
