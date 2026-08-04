#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract sample content from representative LeDu PDFs.
"""

import json
from pathlib import Path
import pdfplumber

ROOT = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/英语")
SAMPLES = [
    # vocabulary
    ROOT / "04_四年级/01_夏季/26夏_3B_词汇表.pdf",
    # dictation
    ROOT / "04_四年级/01_夏季/26夏_3B_默写表.pdf",
    # knowledge pack (younger)
    ROOT / "01_一年级/01_秋季/预备一级知识锦囊L1.pdf",
    # knowledge pack (older)
    ROOT / "03_三年级/01_秋季/2B 秋季 L1 知识锦囊.pdf",
    # practice pack
    ROOT / "03_三年级/03_春季/助力包/【助力包】2AB_春季L1(学生版).pdf",
    # assessment
    ROOT / "03_三年级/02_冬季/助力包/2B冬季阶段测评(学生版).pdf",
    # knowledge checklist
    ROOT / "04_四年级/01_夏季/知识清单/3B夏季U1知识清单.pdf",
    # review
    ROOT / "Gemini 复习资料及练习/一年级 & 二年级/PDF for printing/LeDu English Review Week 1.pdf",
]

def extract_text(path: Path, max_pages=3):
    text_pages = []
    try:
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages[:max_pages]):
                txt = page.extract_text()
                if txt:
                    text_pages.append(txt)
    except Exception as e:
        text_pages.append(f"ERROR: {e}")
    return text_pages

def main():
    results = []
    for sample in SAMPLES:
        if not sample.exists():
            continue
        print(f"\n{'='*60}\n{sample.relative_to(ROOT)}\n{'='*60}")
        pages = extract_text(sample, max_pages=3)
        for i, p in enumerate(pages, 1):
            print(f"\n--- Page {i} ---\n{p[:1500]}")
        results.append({
            "file": str(sample.relative_to(ROOT)),
            "pages": pages,
        })
    
    out = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/sample_extracts.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nSample extracts saved to {out}")

if __name__ == "__main__":
    main()
