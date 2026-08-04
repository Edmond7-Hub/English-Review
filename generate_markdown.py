#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate a Markdown knowledge base for LeDu English learning app development.
"""

import json
from pathlib import Path
from collections import defaultdict, Counter

ROOT = Path("/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH")

def load_inventory():
    with open(ROOT / "pdf_inventory.json", "r", encoding="utf-8") as f:
        return json.load(f)

def grade_sort_key(grade):
    order = {"一年级": 1, "二年级": 2, "三年级": 3, "四年级": 4, "综合复习": 5, "未知": 99}
    return order.get(grade, 99)

def semester_sort_key(semester):
    order = {"秋季": 1, "冬季": 2, "春季": 3, "夏季": 4, "未知": 99}
    return order.get(semester, 99)

def generate_markdown():
    inventory = load_inventory()
    
    # Build hierarchical structure
    tree = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for item in inventory:
        tree[item["grade"]][item["semester"]][item["content_type"]].append(item)
    
    md = []
    md.append("# 乐读英语学习 App 内容资源清单与数据设计\n")
    md.append("**说明**：本文档汇总了当前文件夹内所有乐读英语学习资料，按内容类型、年级、学期进行整理，并提出面向英语学习 App 开发的内容数据模型与导入建议。\n")
    md.append("---\n\n")
    
    # 1. Overview
    md.append("## 一、资料总览\n")
    md.append(f"- **总文件数**：{len(inventory)} 个 PDF\n")
    md.append("- **内容来源**：乐读英语（LeDu English）各年级/学期教学资料\n")
    md.append("- **资料形式**：PDF（部分为扫描版图片，需 OCR 处理后才能提取文本）\n")
    md.append("- **适用年级**：一年级 至 四年级 + 综合复习\n")
    md.append("\n")
    
    # Stats
    md.append("### 1.1 按年级分布\n")
    grades = Counter(item["grade"] for item in inventory)
    for g in sorted(grades.keys(), key=grade_sort_key):
        md.append(f"- {g}：{grades[g]} 个\n")
    md.append("\n")
    
    md.append("### 1.2 按学期分布\n")
    semesters = Counter(item["semester"] for item in inventory)
    for s in sorted(semesters.keys(), key=semester_sort_key):
        md.append(f"- {s}：{semesters[s]} 个\n")
    md.append("\n")
    
    md.append("### 1.3 按内容类型分布\n")
    types = Counter(item["content_type"] for item in inventory)
    for t, c in types.most_common():
        md.append(f"- {t}：{c} 个\n")
    md.append("\n")
    
    md.append("### 1.4 按受众分布\n")
    audiences = Counter(item["audience"] for item in inventory)
    for a, c in audiences.most_common():
        md.append(f"- {a}：{c} 个\n")
    md.append("\n")
    
    # 2. Content classification
    md.append("## 二、内容分类与说明\n")
    md.append("根据文件名与目录结构，资料可归纳为以下 7 大类：\n")
    md.append("\n")
    md.append("| 类型 | 说明 | 典型文件名 | 用途（App 模块） |\n")
    md.append("|------|------|------------|-----------------|\n")
    md.append("| 知识锦囊/知识清单 | 每课/每单元核心知识点总结，含词汇、语法、阅读等 | `2B 秋季 L1 知识锦囊.pdf`、`3B夏季U1知识清单.pdf` | 知识卡片、课前预习、单元复习 |\n")
    md.append("| 练习/助力包 | 随课练习、课后巩固（学生版/教师版） | `【助力包】2AB_春季L1(学生版).pdf` | 课后练习、题目库 |\n")
    md.append("| 测评 | 阶段测评、月度测评（学生版/教师版） | `2B冬季阶段测评(学生版).pdf`、`3B阶段测评1(教师版).pdf` | 单元测试、能力评估 |\n")
    md.append("| 词汇表 | 单元/学期核心词汇汇总 | `26夏_3B_词汇表.pdf` | 单词本、闪卡 |\n")
    md.append("| 默写表 | 单词/句型默写材料 | `26夏_3B_默写表.pdf`、`冬季2B默写表.pdf` | 听写、拼写练习 |\n")
    md.append("| 语法表/动词表 | 语法规则、不规则动词等 | `不规则动词表.pdf` | 语法速查 |\n")
    md.append("| 复习资料 | 综合复习周计划 | `LeDu English Review Week 1.pdf` | 复习计划、综合训练 |\n")
    md.append("\n")
    
    # 3. Detailed inventory by grade
    md.append("## 三、详细资料清单\n")
    for grade in sorted(tree.keys(), key=grade_sort_key):
        md.append(f"### {grade}\n")
        for semester in sorted(tree[grade].keys(), key=semester_sort_key):
            md.append(f"#### {semester}\n")
            for ctype in sorted(tree[grade][semester].keys()):
                md.append(f"**{ctype}**\n")
                for item in sorted(tree[grade][semester][ctype], key=lambda x: (x.get("lesson") or 0, x.get("unit") or 0, x["filename"])):
                    aud = f" [{item['audience']}]" if item["audience"] != "通用" else ""
                    lesson_info = ""
                    if item.get("lesson"):
                        lesson_info += f" L{item['lesson']}"
                    if item.get("unit"):
                        lesson_info += f" U{item['unit']}"
                    md.append(f"- `{item['filename']}`{lesson_info}{aud}\n")
                md.append("\n")
        md.append("\n")
    
    # 4. App data model
    md.append("## 四、英语学习 App 内容数据模型设计\n")
    md.append("为便于后续 App 开发，建议将内容抽象为以下核心实体：\n")
    md.append("\n")
    md.append("### 4.1 实体关系图（ERD）\n")
    md.append("```\n")
    md.append("Grade (年级) 1--* Semester (学期) 1--* Unit/Lesson (课/单元)\n")
    md.append("Unit/Lesson 1--* ContentItem (内容项)\n")
    md.append("ContentItem 1--* Exercise (练习/题目)\n")
    md.append("ContentItem 1--* Word (词汇)\n")
    md.append("ContentItem 1--* GrammarPoint (语法点)\n")
    md.append("ContentItem *--* Tag (标签)\n")
    md.append("```\n\n")
    
    md.append("### 4.2 核心实体说明\n")
    md.append("\n#### Grade（年级）\n")
    md.append("| 字段 | 类型 | 说明 |\n")
    md.append("|------|------|------|\n")
    md.append("| id | string | 唯一标识，如 `g1`、`g2` |\n")
    md.append("| name | string | 显示名称，如 `一年级` |\n")
    md.append("| order | int | 排序，1-4 |\n")
    md.append("| semesters | array | 关联学期 ID |\n")
    md.append("\n")
    
    md.append("#### Semester（学期）\n")
    md.append("| 字段 | 类型 | 说明 |\n")
    md.append("|------|------|------|\n")
    md.append("| id | string | 唯一标识，如 `g1_autumn` |\n")
    md.append("| name | string | 如 `秋季` |\n")
    md.append("| gradeId | string | 所属年级 |\n")
    md.append("| order | int | 学期顺序：秋=1，冬=2，春=3，夏=4 |\n")
    md.append("| lessons | array | 关联课程/单元 |\n")
    md.append("\n")
    
    md.append("#### Lesson / Unit（课程/单元）\n")
    md.append("| 字段 | 类型 | 说明 |\n")
    md.append("|------|------|------|\n")
    md.append("| id | string | 唯一标识，如 `g3_autumn_l1` |\n")
    md.append("| title | string | 课程标题，如 `2B 秋季 L1` |\n")
    md.append("| displayTitle | string | 展示标题，如 `Unit 1 Are you happy?` |\n")
    md.append("| lessonNumber | int | 课程序号 L1-L17 |\n")
    md.append("| unitNumber | int | 单元序号 U1-U12 |\n")
    md.append("| semesterId | string | 所属学期 |\n")
    md.append("| pdfFiles | array | 关联 PDF 文件路径 |\n")
    md.append("| contentItems | array | 子内容项 |\n")
    md.append("\n")
    
    md.append("#### ContentItem（内容项）\n")
    md.append("| 字段 | 类型 | 说明 |\n")
    md.append("|------|------|------|\n")
    md.append("| id | string | 唯一标识 |\n")
    md.append("| type | enum | `vocabulary` / `grammar` / `reading` / `phonics` / `sentence` / `culture` |\n")
    md.append("| title | string | 内容标题，如 `核心词汇` |\n")
    md.append("| lessonId | string | 所属课程 |\n")
    md.append("| pdfPath | string | 来源 PDF 路径 |\n")
    md.append("| extractedText | string | OCR/提取后的文本 |\n")
    md.append("| mediaUrls | array | 配图/音频 URL |\n")
    md.append("| order | int | 显示顺序 |\n")
    md.append("\n")
    
    md.append("#### Word（词汇）\n")
    md.append("| 字段 | 类型 | 说明 |\n")
    md.append("|------|------|------|\n")
    md.append("| id | string | 唯一标识 |\n")
    md.append("| word | string | 英文单词 |\n")
    md.append("| phonetic | string | 音标，如 `/bɔːd/` |\n")
    md.append("| partOfSpeech | string | 词性，如 `adj.` |\n")
    md.append("| meaning | string | 中文释义 |\n")
    md.append("| example | string | 例句 |\n")
    md.append("| lessonId | string | 所属课程 |\n")
    md.append("| tags | array | 标签，如 `emotion`, `animal` |\n")
    md.append("| audioUrl | string | 发音音频 |\n")
    md.append("| imageUrl | string | 配图 |\n")
    md.append("\n")
    
    md.append("#### GrammarPoint（语法点）\n")
    md.append("| 字段 | 类型 | 说明 |\n")
    md.append("|------|------|------|\n")
    md.append("| id | string | 唯一标识 |\n")
    md.append("| rule | string | 语法规则名称，如 `人称代词` |\n")
    md.append("| explanation | string | 规则说明 |\n")
    md.append("| examples | array | 例句列表 |\n")
    md.append("| lessonId | string | 所属课程 |\n")
    md.append("\n")
    
    md.append("#### Exercise（练习题）\n")
    md.append("| 字段 | 类型 | 说明 |\n")
    md.append("|------|------|------|\n")
    md.append("| id | string | 唯一标识 |\n")
    md.append("| type | enum | `choice` / `fill_blank` / `unscramble` / `translation` / `spelling` / `listening` |\n")
    md.append("| question | string | 题干 |\n")
    md.append("| options | array | 选项（选择题） |\n")
    md.append("| answer | string/array | 正确答案 |\n")
    md.append("| explanation | string | 解析 |\n")
    md.append("| difficulty | int | 难度等级 1-3 |\n")
    md.append("| lessonId | string | 所属课程 |\n")
    md.append("\n")
    
    # 5. Sample JSON
    md.append("## 五、样例数据结构（JSON）\n")
    md.append("以下样例基于 `3B夏季U1知识清单.pdf` 与 `LeDu English Review Week 1.pdf` 的内容结构：\n")
    md.append("\n")
    md.append("```json\n")
    sample_json = {
        "course": {
            "id": "g4_summer_u1",
            "grade": "四年级",
            "semester": "夏季",
            "unit": 1,
            "title": "HE 3B Unit 1 Are you happy?",
            "displayTitle": "Unit 1 Are you happy?",
            "pdfFiles": [
                "英语/04_四年级/01_夏季/知识清单/3B夏季U1知识清单.pdf",
                "英语/04_四年级/01_夏季/26夏_3B_词汇表.pdf",
                "英语/04_四年级/01_夏季/26夏_3B_默写表.pdf"
            ]
        },
        "vocabulary": [
            {
                "word": "bored",
                "phonetic": "/bɔːd/",
                "partOfSpeech": "adj.",
                "meaning": "烦闷的；无聊的",
                "example": "be bored with... 对……感到厌烦",
                "lessonId": "g4_summer_u1"
            },
            {
                "word": "excited",
                "phonetic": "/ɪkˈsaɪtɪd/",
                "partOfSpeech": "adj.",
                "meaning": "兴奋的",
                "example": "be excited about... 对……感到兴奋",
                "lessonId": "g4_summer_u1"
            }
        ],
        "grammar": [
            {
                "rule": "人称代词 / 物主代词 / 's 所有格",
                "explanation": "人称代词直接指代人或事物；物主代词置于名词前表示某人的；'s 所有格表示物品归谁所有。",
                "examples": [
                    "This is Daniel's dancing shoe.",
                    "The lions' eyes are big."
                ],
                "lessonId": "g4_summer_u1"
            }
        ],
        "exercises": [
            {
                "type": "spelling",
                "question": "苹果: a _ _ l _",
                "answer": "apple",
                "lessonId": "g1_review_week1"
            },
            {
                "type": "choice",
                "question": "-- Do you like _______? -- Yes, I do.",
                "options": ["apple", "apples", "an apple"],
                "answer": "apples",
                "lessonId": "g1_review_week1"
            }
        ]
    }
    md.append(json.dumps(sample_json, ensure_ascii=False, indent=2))
    md.append("\n```\n\n")
    
    # 6. App feature mapping
    md.append("## 六、App 功能模块与资料映射\n")
    md.append("\n")
    md.append("| App 功能模块 | 对应资料类型 | 说明 |\n")
    md.append("|-------------|-------------|------|\n")
    md.append("| 单词本 / 闪卡 | 词汇表、默写表 | 按单元展示单词、音标、释义、例句 |\n")
    md.append("| 知识卡片 | 知识锦囊、知识清单 | 每课核心知识点，支持收藏与复习 |\n")
    md.append("| 课后练习 | 助力包（学生版） | 单选、填空、连词成句、翻译等题型 |\n")
    md.append("| 阶段测试 | 阶段测评/月度测评 | 自动生成测试卷、计时、评分 |\n")
    md.append("| 语法速查 | 语法表/动词表、知识清单 | 按年级/语法点检索 |\n")
    md.append("| 复习计划 | Gemini Review Week | 每周复习任务与打卡 |\n")
    md.append("| 学习路径 | 知识锦囊合集 | 按学期/单元规划学习路线 |\n")
    md.append("\n")
    
    # 7. Implementation recommendations
    md.append("## 七、内容数字化实施建议\n")
    md.append("\n### 7.1 数据提取策略\n")
    md.append("1. **PDF 文本层检测**：部分 PDF（如 `3B夏季U1知识清单.pdf`、`LeDu English Review Week 1.pdf`）可直接提取文本；其余多为扫描版图片，需 OCR。\n")
    md.append("2. **批量 OCR 方案**：使用 `pytesseract` + `pdf2image` 将扫描 PDF 转为图片后识别中文与英文；或调用云服务（如 Azure Document Intelligence / Google Document AI）。\n")
    md.append("3. **结构化解析**：针对知识清单、词汇表等版式相对固定的 PDF，可设计正则/模板解析：\n")
    md.append("   - 词汇：`单词 /音标/ 词性. 释义` 模式\n")
    md.append("   - 语法点：`定义及用法：`、`例句：` 等标题\n")
    md.append("   - 练习题：识别题型（选择、填空、连词成句、翻译）\n")
    md.append("4. **人工校对**：OCR 后的词汇音标、例句等需人工校对，确保准确性。\n")
    md.append("\n")
    
    md.append("### 7.2 推荐技术栈\n")
    md.append("- **OCR**：`Tesseract OCR`（本地）或 `Azure/Google Cloud Vision API`（云端）\n")
    md.append("- **PDF 处理**：`PyMuPDF (fitz)`、`pdfplumber`、`pdf2image`\n")
    md.append("- **后端数据库**：PostgreSQL / MongoDB 存储课程、词汇、题目结构\n")
    md.append("- **后端框架**：Node.js/Express、Python/FastAPI 或 Django\n")
    md.append("- **前端框架**：React Native / Flutter / 微信小程序（跨平台）\n")
    md.append("- **音频**：TTS 引擎（如 Azure TTS、讯飞）生成单词/例句发音\n")
    md.append("\n")
    
    md.append("### 7.3 开发优先级建议\n")
    md.append("1. **P0 - 内容目录与课程树**：先完成年级/学期/课程结构，关联 PDF 文件。\n")
    md.append("2. **P0 - 词汇与闪卡**：优先处理 `词汇表` 与 `默写表`，形成可学习的单词本。\n")
    md.append("3. **P1 - 知识卡片**：将 `知识锦囊` / `知识清单` 转换为卡片式浏览。\n")
    md.append("4. **P1 - 练习题库**：解析 `助力包` 与 `测评`，形成可交互题目。\n")
    md.append("5. **P2 - 复习计划**：基于 `Gemini Review Week` 设计周复习任务。\n")
    md.append("6. **P2 - 学习报告**：根据练习与测评数据生成学习进度与弱项分析。\n")
    md.append("\n")
    
    md.append("## 八、附录：全部文件清单\n")
    md.append("\n")
    md.append("| 序号 | 文件名 | 年级 | 学期 | 类型 | 受众 | L/U |\n")
    md.append("|------|--------|------|------|------|------|-----|\n")
    for idx, item in enumerate(inventory, 1):
        lesson_unit = ""
        if item.get("lesson"):
            lesson_unit += f"L{item['lesson']}"
        if item.get("unit"):
            lesson_unit += f"U{item['unit']}" if lesson_unit else f"U{item['unit']}"
        md.append(f"| {idx} | `{item['filename']}` | {item['grade']} | {item['semester']} | {item['content_type']} | {item['audience']} | {lesson_unit} |\n")
    md.append("\n")
    
    md.append("---\n")
    md.append("**生成时间**：自动生成于内容盘点脚本。\n")
    md.append("**后续步骤**：根据本清单，可进一步对扫描版 PDF 进行 OCR，并将内容导入数据库。\n")
    
    output_path = ROOT / "乐读英语_App_内容资源清单.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("".join(md))
    print(f"Markdown 文档已生成：{output_path}")

if __name__ == "__main__":
    generate_markdown()
