#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test PaddleOCR on a single PDF.
"""

from pathlib import Path
from paddleocr import PaddleOCR
import fitz

OCR_DIR = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/ocr_content_paddle")
OCR_DIR.mkdir(exist_ok=True)

print("Initializing PaddleOCR...")
ocr_engine = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)

pdf_path = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/英语/03_三年级/01_秋季/2B 秋季 L1 知识锦囊.pdf")

doc = fitz.open(pdf_path)
page_count = len(doc)
doc.close()
print(f"Pages: {page_count}")

for i in range(page_count):
    doc = fitz.open(pdf_path)
    page = doc[i]
    zoom = 2.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img_path = OCR_DIR / f"_test_page{i+1}.png"
    pix.save(str(img_path))
    doc.close()
    
    print(f"\n--- Page {i+1} ---")
    result = ocr_engine.ocr(str(img_path), cls=True)
    if result and result[0]:
        for line in result[0]:
            if line:
                print(line[1][0])
