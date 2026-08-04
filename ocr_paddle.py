#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OCR scanned PDFs using PaddleOCR (PP-OCRv4, Chinese + English).
"""

import os
import json
from pathlib import Path
from paddleocr import PaddleOCR
import fitz

ROOT = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH")
ENGLISH_ROOT = ROOT / "英语"
OCR_DIR = ROOT / "ocr_content_paddle"
OCR_DIR.mkdir(exist_ok=True)

# Initialize PaddleOCR once
print("Initializing PaddleOCR (first run will download models)...")
ocr_engine = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)


def pdf_page_to_image(pdf_path: Path, page_num: int, zoom: float = 2.0) -> str:
    """Render a PDF page to a PNG image and return its path."""
    doc = fitz.open(pdf_path)
    try:
        page = doc[page_num]
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        img_path = OCR_DIR / f"_temp_{pdf_path.stem}_page{page_num + 1}.png"
        pix.save(str(img_path))
        return str(img_path)
    finally:
        doc.close()


def ocr_pdf(pdf_path: Path) -> dict:
    """OCR all pages of a PDF and return text per page."""
    doc = fitz.open(pdf_path)
    page_count = len(doc)
    doc.close()
    
    pages = []
    for i in range(page_count):
        img_path = None
        try:
            img_path = pdf_page_to_image(pdf_path, i)
            result = ocr_engine.ocr(img_path, cls=True)
            
            texts = []
            if result and result[0]:
                for line in result[0]:
                    if line:
                        texts.append(line[1][0])
            
            pages.append({
                "page": i + 1,
                "text": "\n".join(texts)
            })
        except Exception as e:
            pages.append({
                "page": i + 1,
                "text": f"ERROR: {e}"
            })
        finally:
            if img_path and os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except Exception:
                    pass
    
    return {"source": "paddleocr", "pages": pages}


def main():
    # Load classification
    with open(ROOT / "extracted_content" / "_classification.json", "r", encoding="utf-8") as f:
        inventory = json.load(f)
    
    scanned_items = [item for item in inventory if item["type"] == "scanned"]
    print(f"Found {len(scanned_items)} scanned PDFs to OCR with PaddleOCR.")
    
    for item in scanned_items:
        pdf_path = Path(item["path"])
        safe_name = pdf_path.stem.replace(" ", "_").replace("/", "_")
        out_path = OCR_DIR / f"{safe_name}.md"
        
        if out_path.exists():
            print(f"Skipping (exists): {pdf_path.name}")
            continue
        
        print(f"OCR: {pdf_path.name}")
        try:
            result = ocr_pdf(pdf_path)
            
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(f"# {pdf_path.stem}\n\n")
                f.write(f"**来源**: `{item['relative']}`\n\n")
                f.write(f"**提取方式**: PaddleOCR\n\n")
                
                for page in result["pages"]:
                    f.write(f"## 第 {page['page']} 页\n\n")
                    f.write(page["text"])
                    f.write("\n\n")
            
            print(f"  -> {out_path}")
        except Exception as e:
            print(f"  ERROR processing {pdf_path.name}: {e}")
    
    print(f"\nPaddleOCR output: {OCR_DIR}")


if __name__ == "__main__":
    main()
