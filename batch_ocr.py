#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch OCR scanned PDFs using the macOS Vision framework via Swift script.
"""

import json
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH")
SWIFT_SCRIPT = ROOT / "ocr_with_vision.swift"


def run_ocr(pdf_path: Path) -> str:
    """Run Swift OCR script on a single PDF."""
    try:
        result = subprocess.run(
            ["swift", str(SWIFT_SCRIPT), str(pdf_path)],
            capture_output=True,
            text=True,
            timeout=120,
        )
        return result.stdout
    except subprocess.TimeoutExpired:
        return "ERROR: OCR timeout"
    except Exception as e:
        return f"ERROR: {e}"


def main():
    with open(ROOT / "extracted_content" / "_classification.json", "r", encoding="utf-8") as f:
        inventory = json.load(f)
    
    scanned_items = [item for item in inventory if item["type"] == "scanned"]
    print(f"Found {len(scanned_items)} scanned PDFs to OCR.")
    
    ocr_dir = ROOT / "ocr_content"
    ocr_dir.mkdir(exist_ok=True)
    
    def process_item(item):
        pdf_path = Path(item["path"])
        safe_name = pdf_path.stem.replace(" ", "_").replace("/", "_")
        out_path = ocr_dir / f"{safe_name}.md"
        
        if out_path.exists():
            print(f"Skipping (exists): {pdf_path.name}")
            return
        
        print(f"OCR: {pdf_path.name}")
        text = run_ocr(pdf_path)
        
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f"# {pdf_path.stem}\n\n")
            f.write(f"**来源**: `{item['relative']}`\n\n")
            f.write(f"**提取方式**: macOS Vision OCR\n\n")
            f.write(text)
        
        print(f"  -> {out_path}")
    
    # Process sequentially to avoid overloading the system
    for item in scanned_items:
        process_item(item)
    
    print(f"\nOCR output: {ocr_dir}")


if __name__ == "__main__":
    main()
