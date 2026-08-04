#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract content from LeDu English PDFs and generate structured Markdown.
Handles both text-based PDFs and scanned PDFs (via OCR).
"""

import os
import re
import json
import subprocess
from pathlib import Path
from collections import defaultdict

import pdfplumber
import fitz

ROOT = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/英语")
OUT_DIR = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/extracted_content")
OUT_DIR.mkdir(exist_ok=True)


def classify_pdf(path: Path) -> str:
    """Check if PDF has extractable text."""
    try:
        doc = fitz.open(path)
        total_text = ""
        for page in doc:
            total_text += page.get_text()
            if len(total_text.strip()) > 50:
                return "text"
        return "scanned"
    except Exception:
        return "error"


def clean_text(text: str) -> str:
    """Clean extracted text."""
    if not text:
        return ""
    # Remove excessive whitespace
    lines = text.splitlines()
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if line:
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def extract_text_pdf(path: Path) -> dict:
    """Extract text from text-based PDF."""
    pages = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages):
            txt = page.extract_text()
            if txt:
                pages.append({
                    "page": i + 1,
                    "text": clean_text(txt)
                })
    return {"source": "text", "pages": pages}


def ocr_pdf(path: Path, output_dir: Path) -> dict:
    """OCR a scanned PDF using available tools."""
    # Try to use ocrmypdf or tesseract directly via pdf2image
    try:
        from pdf2image import convert_from_path
        import pytesseract
        
        pages = []
        images = convert_from_path(str(path), dpi=200)
        for i, img in enumerate(images):
            text = pytesseract.image_to_string(img, lang="chi_sim+eng")
            if text.strip():
                pages.append({
                    "page": i + 1,
                    "text": clean_text(text)
                })
        return {"source": "ocr", "pages": pages}
    except Exception as e:
        return {"source": "error", "error": str(e), "pages": []}


def normalize_filename(path: Path) -> str:
    """Create a safe markdown filename."""
    rel = path.relative_to(ROOT)
    name = str(rel).replace("/", "_").replace("\\", "_").replace(" ", "_")
    # Remove .pdf extension
    name = Path(name).stem
    return f"{name}.md"


def extract_all():
    pdfs = sorted(ROOT.rglob("*.pdf"))
    
    inventory = []
    for pdf in pdfs:
        pdf_type = classify_pdf(pdf)
        inventory.append({
            "path": str(pdf),
            "relative": str(pdf.relative_to(ROOT)),
            "type": pdf_type,
            "filename": pdf.name
        })
    
    # Save classification
    with open(OUT_DIR / "_classification.json", "w", encoding="utf-8") as f:
        json.dump(inventory, f, ensure_ascii=False, indent=2)
    
    # Process each PDF
    for item in inventory:
        pdf_path = Path(item["path"])
        md_filename = normalize_filename(pdf_path)
        md_path = OUT_DIR / md_filename
        
        print(f"Processing [{item['type']}] {pdf_path.name} ...")
        
        if item["type"] == "text":
            result = extract_text_pdf(pdf_path)
        elif item["type"] == "scanned":
            result = ocr_pdf(pdf_path, OUT_DIR)
        else:
            result = {"source": "error", "error": "Failed to classify", "pages": []}
        
        # Write markdown
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(f"# {pdf_path.stem}\n\n")
            f.write(f"**来源**: `{item['relative']}`\n\n")
            f.write(f"**提取方式**: {result.get('source', 'unknown')}\n\n")
            
            if "error" in result:
                f.write(f"**错误**: {result['error']}\n\n")
            
            for page in result.get("pages", []):
                f.write(f"## 第 {page['page']} 页\n\n")
                f.write(page.get("text", ""))
                f.write("\n\n")
        
        item["markdown"] = str(md_path.relative_to(OUT_DIR.parent))
    
    # Update inventory with markdown paths
    with open(OUT_DIR / "_classification.json", "w", encoding="utf-8") as f:
        json.dump(inventory, f, ensure_ascii=False, indent=2)
    
    print(f"\nExtraction complete. Output: {OUT_DIR}")
    return inventory


if __name__ == "__main__":
    extract_all()
