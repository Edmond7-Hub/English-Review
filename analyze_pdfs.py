#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analyze LeDu English PDF materials and categorize them for app development.
"""

import os
import re
import json
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/英语")

def get_pdf_list():
    return sorted(ROOT.rglob("*.pdf"))

def categorize_by_filename(path: Path) -> dict:
    name = path.stem
    parent = path.parent
    rel_parts = path.relative_to(ROOT).parts
    
    # Grade / Semester / Level extraction from path
    grade = "未知"
    semester = "未知"
    level = "未知"
    
    if "一年级" in str(path):
        grade = "一年级"
    elif "二年级" in str(path):
        grade = "二年级"
    elif "三年级" in str(path):
        grade = "三年级"
    elif "四年级" in str(path):
        grade = "四年级"
    elif "Gemini" in str(path):
        grade = "综合复习"
    
    if "秋季" in str(path):
        semester = "秋季"
    elif "冬季" in str(path):
        semester = "冬季"
    elif "春季" in str(path):
        semester = "春季"
    elif "夏季" in str(path):
        semester = "夏季"
    
    # Determine content type from filename
    content_type = "其他"
    if "知识锦囊" in name or "知识清单" in name:
        content_type = "知识锦囊/知识清单"
    elif "助力包" in name:
        content_type = "练习/助力包"
    elif "测评" in name or "测评" in name:
        content_type = "测评"
    elif "词汇表" in name:
        content_type = "词汇表"
    elif "默写表" in name:
        content_type = "默写表"
    elif "动词表" in name:
        content_type = "语法表/动词表"
    elif "Review" in name:
        content_type = "复习资料"
    elif "合集" in name or "整合" in name:
        content_type = "知识锦囊合集"
    
    # Audience
    audience = "通用"
    if "学生版" in name:
        audience = "学生版"
    elif "教师版" in name:
        audience = "教师版"
    
    # Lesson/Unit extraction
    lesson = None
    unit = None
    # Patterns: L1, L12, U1, U12, 预备一级L1-L4, etc.
    m = re.search(r'[Ll](\d+)', name)
    if m:
        lesson = int(m.group(1))
    m = re.search(r'[Uu](\d+)', name)
    if m:
        unit = int(m.group(1))
    
    return {
        "path": str(path),
        "filename": name,
        "grade": grade,
        "semester": semester,
        "content_type": content_type,
        "audience": audience,
        "lesson": lesson,
        "unit": unit,
    }

def main():
    pdfs = get_pdf_list()
    
    categorized = []
    for pdf in pdfs:
        cat = categorize_by_filename(pdf)
        cat["file_size"] = pdf.stat().st_size
        categorized.append(cat)
    
    # Summary statistics
    stats = {
        "total_files": len(pdfs),
        "by_grade": Counter(c["grade"] for c in categorized),
        "by_semester": Counter(c["semester"] for c in categorized),
        "by_type": Counter(c["content_type"] for c in categorized),
        "by_audience": Counter(c["audience"] for c in categorized),
    }
    
    print("=" * 60)
    print("乐读英语学习资料盘点")
    print("=" * 60)
    print(f"\n总文件数: {stats['total_files']}\n")
    
    print("按年级分布:")
    for k, v in sorted(stats["by_grade"].items()):
        print(f"  {k}: {v} 个")
    
    print("\n按学期分布:")
    for k, v in sorted(stats["by_semester"].items()):
        print(f"  {k}: {v} 个")
    
    print("\n按内容类型分布:")
    for k, v in stats["by_type"].most_common():
        print(f"  {k}: {v} 个")
    
    print("\n按受众分布:")
    for k, v in sorted(stats["by_audience"].items()):
        print(f"  {k}: {v} 个")
    
    # Export structured data
    output_path = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/pdf_inventory.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(categorized, f, ensure_ascii=False, indent=2)
    print(f"\n结构化清单已保存至: {output_path}")

if __name__ == "__main__":
    main()
