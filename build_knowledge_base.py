#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build a structured Markdown knowledge base from extracted PDF content.
Merges both text-based PDF extractions and PaddleOCR scanned PDF results.
"""

import json
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH")
EXTRACT_DIR = ROOT / "extracted_content"
OCR_DIR = ROOT / "ocr_content_paddle"
OUT_DIR = ROOT / "knowledge_base"
OUT_DIR.mkdir(exist_ok=True)


def get_content_from_md(md_path: Path) -> str:
    """Read markdown content, returning the text."""
    if not md_path.exists():
        return ""
    return md_path.read_text(encoding="utf-8")


def build_grade_knowledge_base():
    """Build a combined markdown knowledge base by grade/semester."""
    # Load classification
    with open(EXTRACT_DIR / "_classification.json", "r", encoding="utf-8") as f:
        inventory = json.load(f)
    
    tree = defaultdict(lambda: defaultdict(list))
    extracted_count = 0
    
    for item in inventory:
        pdf_path = Path(item["path"])
        
        # Determine source: text extraction or PaddleOCR
        if item["type"] == "scanned":
            md_path = OCR_DIR / f"{pdf_path.stem.replace(' ', '_').replace('/', '_')}.md"
            source_label = "PaddleOCR"
        else:
            md_path = ROOT / item["markdown"]
            source_label = "text"
        
        if not md_path.exists():
            continue
        
        text = md_path.read_text(encoding="utf-8")
        lines = text.strip().splitlines()
        # Skip files without real content
        if len(lines) <= 8:
            continue
        
        extracted_count += 1
        
        # Determine grade/semester from relative path
        rel = item["relative"]
        grade = "未知"
        semester = "未知"
        if "一年级" in rel or "Grade 1" in rel:
            grade = "一年级"
        elif "二年级" in rel or "Grade 2" in rel:
            grade = "二年级"
        elif "三年级" in rel or "Grade 3" in rel:
            grade = "三年级"
        elif "四年级" in rel or "Grade 4" in rel:
            grade = "四年级"
        
        if "秋季" in rel:
            semester = "秋季"
        elif "冬季" in rel:
            semester = "冬季"
        elif "春季" in rel:
            semester = "春季"
        elif "夏季" in rel:
            semester = "夏季"
        
        tree[grade][semester].append({
            "filename": item["filename"],
            "relative": rel,
            "text": text,
            "source": source_label
        })
    
    # Order grades/semesters
    grade_order = {"一年级": 1, "二年级": 2, "三年级": 3, "四年级": 4, "综合复习": 5, "未知": 99}
    semester_order = {"秋季": 1, "冬季": 2, "春季": 3, "夏季": 4, "未知": 99}
    
    # Generate combined markdown
    index_md = ["# 乐读英语知识库（按年级/学期整理）\n\n"]
    index_md.append("本知识库从所有 PDF 资料中整理而来，包含直接提取的文本层内容以及通过 PaddleOCR 识别的扫描版内容，按年级、学期、单元组织，方便后续 App 开发调用。\n\n")
    index_md.append("**说明**：扫描版 PDF 经过 PaddleOCR（PP-OCRv4）识别，可能存在少量识别错误，建议后续人工校对。\n\n")
    index_md.append("---\n\n")
    
    for grade in sorted(tree.keys(), key=lambda g: grade_order.get(g, 99)):
        index_md.append(f"## {grade}\n\n")
        
        for semester in sorted(tree[grade].keys(), key=lambda s: semester_order.get(s, 99)):
            index_md.append(f"### {semester}\n\n")
            
            for item in tree[grade][semester]:
                index_md.append(f"#### {item['filename']}\n\n")
                index_md.append(f"**来源**: `{item['relative']}`\n\n")
                index_md.append(f"**提取方式**: {item['source']}\n\n")
                
                # Add content but remove the duplicated metadata lines
                content_lines = item["text"].splitlines()
                filtered = []
                for i, line in enumerate(content_lines):
                    if i == 0 and line.startswith("# "):
                        # skip original title
                        continue
                    if line.startswith("**来源**:"):
                        continue
                    if line == "**提取方式**: text" or line == "**提取方式**: PaddleOCR":
                        continue
                    filtered.append(line)
                index_md.append("\n".join(filtered))
                index_md.append("\n\n---\n\n")
    
    # Write combined file
    combined_path = OUT_DIR / "knowledge_base_all.md"
    with open(combined_path, "w", encoding="utf-8") as f:
        f.write("".join(index_md))
    print(f"Combined knowledge base: {combined_path}")
    
    # Per-grade files
    for grade in sorted(tree.keys(), key=lambda g: grade_order.get(g, 99)):
        grade_md = [f"# {grade} 英语知识库\n\n"]
        for semester in sorted(tree[grade].keys(), key=lambda s: semester_order.get(s, 99)):
            grade_md.append(f"## {semester}\n\n")
            for item in tree[grade][semester]:
                grade_md.append(f"### {item['filename']}\n\n")
                grade_md.append(f"**来源**: `{item['relative']}`\n\n")
                grade_md.append(f"**提取方式**: {item['source']}\n\n")
                content_lines = item["text"].splitlines()
                filtered = []
                for i, line in enumerate(content_lines):
                    if i == 0 and line.startswith("# "):
                        continue
                    if line.startswith("**来源**:"):
                        continue
                    if line == "**提取方式**: text" or line == "**提取方式**: PaddleOCR":
                        continue
                    filtered.append(line)
                grade_md.append("\n".join(filtered))
                grade_md.append("\n\n---\n\n")
        
        grade_path = OUT_DIR / f"{grade}_knowledge_base.md"
        with open(grade_path, "w", encoding="utf-8") as f:
            f.write("".join(grade_md))
        print(f"  {grade}: {grade_path}")
    
    # Summary
    summary = {
        "total_files": len(inventory),
        "text_based_files": sum(1 for item in inventory if item["type"] == "text"),
        "scanned_files_ocr": sum(1 for item in inventory if item["type"] == "scanned"),
        "extracted_files": extracted_count
    }
    
    with open(OUT_DIR / "_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"\nSummary: {summary}")


if __name__ == "__main__":
    build_grade_knowledge_base()
