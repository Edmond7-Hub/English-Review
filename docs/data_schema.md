# 乐读英语记忆曲线复习APP - 数据结构设计文档

## 1. 知识点（Item）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "LearningItem",
  "type": "object",
  "required": ["id", "type", "grade", "semester", "unit", "sourceFile", "content"],
  "properties": {
    "id": {
      "type": "string",
      "description": "稳定唯一ID：SHA256(来源文件相对路径 + 单元 + 内容文本) 前16位"
    },
    "type": {
      "type": "string",
      "enum": ["word", "phrase", "grammar", "reading_word", "phonics"],
      "description": "知识点类型"
    },
    "grade": { "type": "string", "example": "四年级" },
    "semester": { "type": "string", "example": "夏季" },
    "unit": { "type": "string", "example": "Unit 1 Are You Happy?" },
    "lesson": { "type": "string", "example": "L1" },
    "sourceFile": { "type": "string", "example": "04_四年级/01_夏季/26夏_3B_词汇表.pdf" },
    "section": { "type": "string", "example": "Vocabulary" },
    "cefr": { "type": "string", "example": "A1" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "content": {
      "type": "object",
      "properties": {
        "text": { "type": "string", "description": "英文单词/短语/语法标题" },
        "phonetic": { "type": "string" },
        "partOfSpeech": { "type": "string" },
        "meaning": { "type": "string" },
        "example": { "type": "string" },
        "exampleTranslation": { "type": "string" },
        "collocation": { "type": "string" }
      }
    },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "status": { "type": "string", "enum": ["active", "archived"], "default": "active" }
  }
}
```

## 2. 复习记录（ReviewRecord）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ReviewRecord",
  "type": "object",
  "required": ["itemId", "lastReviewedAt", "nextReviewAt", "interval", "repetition", "easeFactor", "status"],
  "properties": {
    "itemId": { "type": "string" },
    "lastReviewedAt": { "type": "string", "format": "date-time" },
    "nextReviewAt": { "type": "string", "format": "date-time" },
    "interval": { "type": "number", "description": "当前间隔天数" },
    "repetition": { "type": "number", "description": "连续答对次数" },
    "easeFactor": { "type": "number", "description": "难度系数，默认2.5" },
    "status": { "type": "string", "enum": ["new", "learning", "review", "mastered"] },
    "lapses": { "type": "number", "default": 0, "description": "累计遗忘次数" }
  }
}
```

## 3. 错题记录（MistakeRecord）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MistakeRecord",
  "type": "object",
  "required": ["itemId", "wrongCount", "lastWrongAt", "consecutiveCorrect"],
  "properties": {
    "itemId": { "type": "string" },
    "wrongCount": { "type": "number" },
    "lastWrongAt": { "type": "string", "format": "date-time" },
    "consecutiveCorrect": { "type": "number", "description": "连续答对次数，达到阈值后移除" },
    "wrongAnswers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "at": { "type": "string", "format": "date-time" },
          "userAnswer": { "type": "string" },
          "correctAnswer": { "type": "string" },
          "questionType": { "type": "string" }
        }
      }
    }
  }
}
```

## 4. 用户设置（UserSettings）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "UserSettings",
  "type": "object",
  "properties": {
    "dailyDurationMinutes": { "type": "number", "default": 35 },
    "dailyNewItemLimit": { "type": "number", "default": 10 },
    "autoPlayAudio": { "type": "boolean", "default": true },
    "speechRate": { "type": "number", "default": 0.8, "description": "TTS语速，0.5-1.5" },
    "speechVoice": { "type": "string", "description": "en-GB 或 en-US" },
    "reminderTime": { "type": "string", "description": "HH:MM，可选" },
    "masteryThreshold": { "type": "number", "default": 3, "description": "错题移除所需的连续答对次数" }
  }
}
```

## 5. 应用全局状态（AppState）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AppState",
  "type": "object",
  "properties": {
    "version": { "type": "string", "default": "1.0.0" },
    "items": { "type": "array", "items": { "$ref": "#/definitions/LearningItem" } },
    "reviewRecords": { "type": "array", "items": { "$ref": "#/definitions/ReviewRecord" } },
    "mistakeRecords": { "type": "array", "items": { "$ref": "#/definitions/MistakeRecord" } },
    "settings": { "$ref": "#/definitions/UserSettings" },
    "studyLogs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "date": { "type": "string" },
          "itemCount": { "type": "number" },
          "correctCount": { "type": "number" },
          "wrongCount": { "type": "number" },
          "durationMinutes": { "type": "number" }
        }
      }
    }
  }
}
```

## 6. 唯一ID生成规则

```
id = sha256(sourceFile + "::" + unit + "::" + section + "::" + content.text).slice(0, 16)
```

- 使用 SHA-256 哈希保证稳定
- 拼接字段：来源文件相对路径 + 单元名 + 板块名 + 内容文本
- 取前16位字符，兼顾唯一性与可读性
- 避免使用行号，防止文件顺序变化导致ID漂移

## 7. 增量刷新判定逻辑

1. 扫描新 Markdown 文件，生成候选知识点列表
2. 用 ID 与现有库比对：
   - ID 不存在 → 新增（status=new）
   - ID 存在但 content 字段变化 → 更新（保留复习记录）
   - 现有库中存在但新扫描不存在 → 归档（status=archived）
3. 展示变更摘要后写入数据库
