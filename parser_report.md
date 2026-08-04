# 素材解析报告

## 一、数据源说明

所有学习资料已整理为 Markdown 文件，位于 `/Users/edmondfan/Documents/AI_SPACE/03_FANXINYE_ENGLISH/knowledge_base/` 目录：

| 文件 | 内容 |
|------|------|
| `knowledge_base_all.md` | 所有年级/学期汇总 |
| `一年级_knowledge_base.md` ~ `四年级_knowledge_base.md` | 各年级分册 |

## 二、内容板块识别

通过扫描全部 Markdown 文件，资料中出现的主要板块标题关键词如下：

| 板块 | 关键词（正则） | 说明 |
|------|---------------|------|
| Vocabulary | `Vocabulary`, `单词`, `word list`, `Words` | 核心词汇表 |
| Phonics | `Phonics`, `自然拼读` | 音标+示例词 |
| Reading | `Reading`, `阅读`, `Mind Map` | 文章框架+阅读词汇 |
| Grammar | `Grammar`, `语法` | 语法点+用法+例句 |
| Skills | `Skills`, `练一练` | 剑桥考试题型解析 |

## 三、可结构化提取的内容

### 3.1 词汇表（Vocabulary）

**四年级 3B 词汇表格式**：

```
A1
bored
/bo:d/
adj.烦闷的；无聊的
```

每个词条包含：
- CEFR 等级（A1/A2/B1）
- 单词（如 `bored`）
- 音标（如 `/bo:d/`）
- 词性+释义（如 `adj.烦闷的；无聊的`）

**三年级 2B 词汇表格式**：

```
24
twenty-four
```

为数字/简单词汇，结构更简单。

### 3.2 阅读词汇（Reading Vocabulary）

阅读文章后常跟随：

```
1. blog 博客
2. still 仍然
```

包含：编号 + 英文 + 中文释义。

### 3.3 语法点（Grammar）

典型结构：

```
Grammar
some/any（一些）
some/any+可数名词复数/不可数名词

口诀：肯用some，否疑any
Example:
I have got some water.
```

包含：语法标题、规则说明、例句、口诀。

## 四、解析挑战与建议

### 4.1 OCR 误差

扫描版 PDF 经 PaddleOCR 识别后存在以下问题：

| 问题类型 | 示例 | 处理建议 |
|----------|------|----------|
| 音标字符识别错误 | `/bo:d/` → `/bɔːd/` 正确形式应为 `/bɔːd/` | 建立音标字符映射表 |
| 词性连接无空格 | `adj.烦闷的` → 应拆分为 `adj.` + `烦闷的` | 正则匹配词性前缀 |
| 表格结构丢失 | 阅读表格被拆成多行无序文本 | 用关键词恢复表格关系 |
| 页眉页脚噪声 | "乐读 专注小班直播课" | 清洗固定噪声行 |

### 4.2 年级/学期差异

- 一年级/二年级：以单词、句型为主，语法内容较少
- 三年级：开始出现数字、序数词、方位介词、there be 句型等语法点
- 四年级：词汇量增大，包含从句、时态、频率副词等更复杂语法

## 五、结构化数据 Schema 建议

```json
{
  "id": "sha256::grade::semester::unit::type::content",
  "grade": "四年级",
  "semester": "夏季",
  "unit": "Unit 1 Are You Happy?",
  "lesson": "L1",
  "sourceFile": "04_四年级/01_夏季/26夏_3B_词汇表.pdf",
  "section": "Vocabulary",
  "type": "word",
  "content": {
    "word": "bored",
    "phonetic": "/bɔːd/",
    "partOfSpeech": "adj.",
    "meaning": "烦闷的；无聊的",
    "example": "be bored with...",
    "exampleTranslation": "对……感到厌烦"
  },
  "cefr": "A1",
  "tags": ["emotion"]
}
```

## 六、下一步工作

1. 编写解析器脚本，将 Markdown 转换为结构化 JSON
2. 对 OCR 错误进行批量清洗和校正
3. 建立知识点唯一 ID 生成规则
4. 将结构化数据导入 HTML 应用
