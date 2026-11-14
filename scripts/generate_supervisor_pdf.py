#!/usr/bin/env python3
"""
Generator PDF Daftar Akun & Kredensial Supervisor / Atasan Langsung
Aplikasi SIMITRA & KPI Pro Dinas Pendidikan Kabupaten Hulu Sungai Tengah
Standar Kertas Resmi: F4 / Folio Landscape (330 mm x 215 mm)
"""

import os
import sys
import sqlite3
from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

# 1. Dimensi Kertas F4 Landscape
F4_WIDTH = 330 * mm
F4_HEIGHT = 215 * mm
PAGE_SIZE = (F4_WIDTH, F4_HEIGHT)

DB_PATH = '/var/www/outsourcing-tracking/data/outsource_track.db'
LOGO_PEMKAB = '/var/www/outsourcing-tracking/public/logos/Lambang_Kabupaten_Hulu_Sungai_Tengah.png'
LOGO_DISDIK = '/var/www/outsourcing-tracking/public/logos/logo-disdik2026.png'
OUTPUT_PDF = '/var/www/outsourcing-tracking/public/docs/Daftar_Akun_Supervisor_OutsourceTrack_Disdik_HST.pdf'
ARTIFACT_PDF = '/home/harnet/.gemini/antigravity-cli/brain/4b07d685-0f3d-4034-95f9-5b88e09df12a/Daftar_Akun_Supervisor_OutsourceTrack_Disdik_HST.pdf'

class NumberedCanvas(canvas.Canvas):
    """Canvas dua-lintasan untuk menambahkan nomor halaman total 'Halaman X dari Y'"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor('#64748b'))

        # Running Footer
        footer_y = 7 * mm
        self.drawString(
            12 * mm,
            footer_y,
            "Sistem Informasi SIMITRA & KPI Pro · Dinas Pendidikan Kab. Hulu Sungai Tengah — Dokumen Kredensial Kedinasan Rahasia"
        )

        page_str = f"Halaman {self._pageNumber} dari {total_pages}"
        self.drawRightString(F4_WIDTH - 12 * mm, footer_y, page_str)

        # Hairline separator above footer
        self.setStrokeColor(colors.HexColor('#cbd5e1'))
        self.setLineWidth(0.5)
        self.line(12 * mm, footer_y + 3 * mm, F4_WIDTH - 12 * mm, footer_y + 3 * mm)

        self.restoreState()


def get_supervisors_from_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = """
    SELECT id, nip, name, email, role, division_id, division_name, role_title, phone, vendor_name
    FROM users 
    WHERE role IN ('supervisor', 'coordinator', 'admin')
    ORDER BY 
      CASE role 
        WHEN 'admin' THEN 1 
        WHEN 'supervisor' THEN 2 
        ELSE 3 
      END,
      CASE division_id
        WHEN 'div-kadis' THEN 1
        WHEN 'div-sekretariat' THEN 2
        WHEN 'div-renlap' THEN 3
        WHEN 'div-keuangan' THEN 4
        WHEN 'div-umpeg' THEN 5
        WHEN 'div-sd' THEN 6
        WHEN 'div-smp' THEN 7
        WHEN 'div-paud' THEN 8
        WHEN 'div-sarpras' THEN 9
        ELSE 10
      END,
      name ASC
    """
    rows = cursor.execute(query).fetchall()
    conn.close()
    return rows


def build_pdf():
    os.makedirs(os.path.dirname(OUTPUT_PDF), exist_ok=True)
    os.makedirs(os.path.dirname(ARTIFACT_PDF), exist_ok=True)
    dist_doc_dir = '/var/www/outsourcing-tracking/dist/docs'
    os.makedirs(dist_doc_dir, exist_ok=True)

    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=PAGE_SIZE,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=10 * mm,
        bottomMargin=12 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    style_kop_instansi = ParagraphStyle(
        'KopInstansi',
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0f172a'),
    )
    style_kop_dinas = ParagraphStyle(
        'KopDinas',
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=17,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e3a8a'),
    )
    style_kop_alamat = ParagraphStyle(
        'KopAlamat',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#475569'),
    )

    style_title = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0f172a'),
    )
    style_subtitle = ParagraphStyle(
        'DocSubTitle',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#2563eb'),
    )

    style_th = ParagraphStyle(
        'TableHead',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.white,
    )
    style_td = ParagraphStyle(
        'TableBody',
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1e293b'),
    )
    style_td_center = ParagraphStyle(
        'TableBodyCenter',
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e293b'),
    )
    style_td_bold = ParagraphStyle(
        'TableBodyBold',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0f172a'),
    )
    style_td_pwd = ParagraphStyle(
        'TableBodyPwd',
        fontName='Courier-Bold',
        fontSize=8.5,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#047857'),
    )
    style_role_badge = ParagraphStyle(
        'RoleBadge',
        fontName='Helvetica-Bold',
        fontSize=6.5,
        leading=8.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e3a8a'),
    )

    story = []

    # 1. KOP SURAT RESMI DINAS PENDIDIKAN KAB. HST
    logo_left = None
    if os.path.exists(LOGO_PEMKAB):
        logo_left = Image(LOGO_PEMKAB, width=17 * mm, height=20 * mm)

    logo_right = None
    if os.path.exists(LOGO_DISDIK):
        logo_right = Image(LOGO_DISDIK, width=32 * mm, height=14 * mm)

    kop_text = [
        Paragraph("PEMERINTAH KABUPATEN HULU SUNGAI TENGAH", style_kop_instansi),
        Paragraph("DINAS PENDIDIKAN", style_kop_dinas),
        Paragraph(
            "Jalan Sibli Imansyah No. 01 Barabai, Kabupaten Hulu Sungai Tengah, Kalimantan Selatan (Kode Pos 71315)<br/>"
            "Portal Aplikasi: <u>https://simitra.renlapdisdikhst.pro</u> · Pos-el: <u>disdik@hstkab.go.id</u>",
            style_kop_alamat,
        ),
    ]

    kop_table_data = [[logo_left or "", kop_text, logo_right or ""]]
    kop_table = Table(
        kop_table_data,
        colWidths=[20 * mm, 256 * mm, 30 * mm],
        style=[
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]
    )
    story.append(kop_table)

    # Garis Pembatas Ganda Kop Dinas (Thick + Thin)
    story.append(Spacer(1, 2 * mm))
    line_table = Table(
        [[""], [""]],
        colWidths=[306 * mm],
        rowHeights=[1.5, 0.5],
        style=[
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#0f172a')),
            ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#475569')),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]
    )
    story.append(line_table)
    story.append(Spacer(1, 3 * mm))

    # 2. JUDUL DOKUMEN & KETERANGAN
    story.append(Paragraph("DAFTAR AKUN & KATA SANDI ATASAN LANGSUNG / SUPERVISOR", style_title))
    story.append(Paragraph("APLIKASI MANAJEMEN PRESENSI & EVALUASI KINERJA OUTSOURCETRACK &amp; KPI PRO", style_subtitle))
    story.append(Spacer(1, 3 * mm))

    # 3. TABEL DATA SUPERVISOR
    supervisors = get_supervisors_from_db()

    # Column Widths (Total: 306 mm)
    col_widths = [
        8 * mm,    # No
        62 * mm,   # Nama Lengkap & NIP
        66 * mm,   # Jabatan Kedinasan
        55 * mm,   # Unit Kerja / Bidang
        46 * mm,   # Username / Email Login
        37 * mm,   # Password Default
        32 * mm,   # Peran & Status
    ]

    table_data = [[
        Paragraph("<b>NO</b>", style_th),
        Paragraph("<b>NAMA LENGKAP &amp; NIP</b>", style_th),
        Paragraph("<b>JABATAN KEDINASAN</b>", style_th),
        Paragraph("<b>BIDANG / SUB BAGIAN</b>", style_th),
        Paragraph("<b>LOGIN USERNAME / EMAIL</b>", style_th),
        Paragraph("<b>KATA SANDI DEFAULT</b>", style_th),
        Paragraph("<b>PERAN AKSES</b>", style_th),
    ]]

    for idx, u in enumerate(supervisors, start=1):
        nip_str = u['nip'] if u['nip'] else '-'
        role_label = {
            'admin': 'SUPER ADMIN',
            'supervisor': 'SUPERVISOR',
            'coordinator': 'PENGAWAS MITRA',
        }.get(u['role'], u['role'].upper())

        role_bg = '#dbeafe' if u['role'] == 'supervisor' else ('#fef3c7' if u['role'] == 'coordinator' else '#fce7f3')
        role_fg = '#1e40af' if u['role'] == 'supervisor' else ('#92400e' if u['role'] == 'coordinator' else '#9d174d')

        role_cell = f"""
        <font color="{role_fg}"><b>{role_label}</b></font><br/>
        <font size="6" color="#64748b">Multi-Perangkat</font>
        """

        nama_cell = f"""
        <b>{u['name']}</b><br/>
        <font size="6.5" color="#475569">NIP: {nip_str}</font>
        """

        login_cell = f"""
        <b>{u['email']}</b><br/>
        <font size="6.5" color="#64748b">atau NIP: {nip_str}</font>
        """

        pwd_cell = "<b>Password123!</b>"

        table_data.append([
            Paragraph(str(idx), style_td_center),
            Paragraph(nama_cell, style_td),
            Paragraph(u['role_title'] or '-', style_td),
            Paragraph(u['division_name'] or '-', style_td),
            Paragraph(login_cell, style_td),
            Paragraph(pwd_cell, style_td_pwd),
            Paragraph(role_cell, style_td_center),
        ])

    table_style = TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ])

    # Alternating row colors
    for i in range(1, len(table_data)):
        bg = colors.HexColor('#f8fafc') if i % 2 == 1 else colors.white
        table_style.add('BACKGROUND', (0, i), (-1, i), bg)

    table = Table(table_data, colWidths=col_widths, repeatRows=1, style=table_style)
    story.append(table)
    story.append(Spacer(1, 3.5 * mm))

    # 4. PETUNJUK AKSES & CATATAN KEAMANAN (Callout Box)
    info_style = ParagraphStyle(
        'InfoText',
        fontName='Helvetica',
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor('#1e293b'),
    )

    info_box_data = [[
        Paragraph(
            "<b>PANDUAN &amp; KETENTUAN KEAMANAN AKUN ATASAN LANGSUNG:</b><br/>"
            "1. <b>Alamat Akses Resmi:</b> Masuk melalui browser PC/Laptop/Smartphone di <b>https://simitra.renlapdisdikhst.pro</b>.<br/>"
            "2. <b>Metode Login:</b> Dapat menggunakan <b>Alamat Email</b> atau <b>NIP</b> terdaftar beserta kata sandi default <b>Password123!</b>.<br/>"
            "3. <b>Kebebasan Akses Multi-Perangkat:</b> Berbeda dengan akun staf alih daya yang terikat 1 HP fisik (anti-titip absen), akun Supervisor dan Administrator diberikan fleksibilitas untuk login lintas komputer kantor, laptop kedinasan, maupun smartphone pribadi.<br/>"
            "4. <b>Kewenangan Supervisi:</b> Akun atasan berwenang memvalidasi presensi harian, menyetujui izin dinas luar / lembur, menerbitkan perintah penugasan lapangan (task dispatch), dan mengisi evaluasi 4 pilar kinerja berkala.<br/>"
            "5. <b>Himbauan Keamanan:</b> Harap jaga kerahasiaan kata sandi. Setelah login perdana, atasan dipersilakan memperbarui kata sandi mandiri di modal Profil Akun.",
            info_style
        )
    ]]

    info_table = Table(
        info_box_data,
        colWidths=[306 * mm],
        style=[
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#86efac')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]
    )
    story.append(info_table)
    story.append(Spacer(1, 3 * mm))

    # 5. BLOK TANDA TANGAN KEDINASAN
    ttd_style_center = ParagraphStyle(
        'TtdCenter',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0f172a'),
    )

    ttd_data = [
        [
            Paragraph("Mengetahui,<br/><b>Kepala Dinas Pendidikan<br/>Kabupaten Hulu Sungai Tengah</b><br/><br/><br/><br/><br/><b><u>H. MUHAMMAD ANHAR, S.STP, ME</u></b><br/>Pembina Tingkat I (IV/b)<br/>NIP. 19820916 200012 1 002", ttd_style_center),
            "",
            Paragraph("Barabai, 13 November 2026<br/><b>Sekretaris Dinas Pendidikan<br/>Kabupaten Hulu Sungai Tengah</b><br/><br/><br/><br/><br/><b><u>SALIHIN, S.Pd.SD</u></b><br/>Pembina (IV/a)<br/>NIP. 19780502 200604 1 017", ttd_style_center),
        ]
    ]

    ttd_table = Table(
        ttd_data,
        colWidths=[100 * mm, 106 * mm, 100 * mm],
        style=[
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]
    )

    story.append(KeepTogether([ttd_table]))

    # Build PDF with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)

    # Salin ke artifact directory dan dist public
    import shutil
    shutil.copy2(OUTPUT_PDF, ARTIFACT_PDF)
    shutil.copy2(OUTPUT_PDF, os.path.join(dist_doc_dir, 'Daftar_Akun_Supervisor_OutsourceTrack_Disdik_HST.pdf'))

    print(f"[OK] Berhasil membuat berkas PDF di:")
    print(f"     1. {OUTPUT_PDF}")
    print(f"     2. {ARTIFACT_PDF}")
    print(f"     3. {os.path.join(dist_doc_dir, 'Daftar_Akun_Supervisor_OutsourceTrack_Disdik_HST.pdf')}")

if __name__ == '__main__':
    build_pdf()
