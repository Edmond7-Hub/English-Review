# 记忆曲线复习引擎 - SM-2 算法设计

## 1. 算法伪代码

```
function schedule(item, quality) {
    // quality: 0=完全忘记, 1=犹豫想起, 2=想起但难, 3=轻松想起
    
    record = item.reviewRecord;
    
    if (quality < 2) {
        // 答错：重置
        record.repetition = 0;
        record.interval = 1;
        record.easeFactor = max(1.3, record.easeFactor - 0.2);
    } else {
        // 答对
        record.repetition += 1;
        
        if (record.repetition === 1) {
            record.interval = 1;
        } else if (record.repetition === 2) {
            record.interval = 6;
        } else {
            record.interval = Math.round(record.interval * record.easeFactor);
        }
        
        // 根据质量微调难度
        if (quality === 2) {
            record.easeFactor = max(1.3, record.easeFactor - 0.15);
        } else if (quality === 3) {
            record.easeFactor += 0.1;
        }
    }
    
    record.lastReviewedAt = now();
    record.nextReviewAt = now().addDays(record.interval);
    
    return record;
}
```

## 2. 核心参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `easeFactor` | 2.5 | 初始难度系数 |
| `minEaseFactor` | 1.3 | 最低难度系数 |
| `initialInterval` | 1 天 | 第一次答对后的间隔 |
| `secondInterval` | 6 天 | 第二次答对后的间隔 |

## 3. 单元测试用例

### 用例 1：新词首次答对

输入：
- repetition = 0
- easeFactor = 2.5
- quality = 3

输出：
- repetition = 1
- interval = 1
- easeFactor = 2.6

### 用例 2：连续答错

输入：
- repetition = 3
- easeFactor = 2.5
- quality = 0

输出：
- repetition = 0
- interval = 1
- easeFactor = 2.3

### 用例 3：长期掌握

输入：
- repetition = 5
- easeFactor = 2.8
- quality = 3

输出：
- repetition = 6
- interval = 之前间隔 × 2.8（四舍五入）
- easeFactor = 2.9

## 4. 每日学习包生成

```
function generateDailyPlan(items, records, settings) {
    // 1. 找出到期的复习项
    dueItems = records.filter(r => r.nextReviewAt <= today()).map(r => findItem(r.itemId));
    
    // 2. 按优先级排序（先到期的在前）
    dueItems.sort((a, b) => a.nextReviewAt - b.nextReviewAt);
    
    // 3. 补充新知识点
    newItems = items.filter(i => !hasRecord(i.id) && i.status === 'new').slice(0, settings.dailyNewItemLimit);
    
    // 4. 合并并限制数量（根据每日时长估算）
    estimatedItems = Math.floor(settings.dailyDurationMinutes / 1.5); // 平均每题1.5分钟
    plan = [...dueItems, ...newItems].slice(0, estimatedItems);
    
    return plan;
}
```

## 5. 错题本优先级

错题记录中的知识点：
- 在每日计划中的优先级高于正常复习
- 需连续答对 `masteryThreshold` 次才能从错题本移除
- 每次答错重置连续答对计数
