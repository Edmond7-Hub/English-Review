const Parser = {
    generateId(sourceFile, unit, section, text) {
        const raw = `${sourceFile}::${unit}::${section}::${text}`;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    },

    parseMarkdown(markdown, sourceFile) {
        const items = [];
        const lines = markdown.split('\n').map(l => l.trim());
        let currentUnit = 'Unknown';
        let currentSection = 'Vocabulary';
        let currentGrade = '未知';
        let currentSemester = '未知';

        const gradeMatch = sourceFile.match(/\d+_(一|二|三|四|五|六)年级/);
        if (gradeMatch) {
            const gradeMap = { '一': '一年级', '二': '二年级', '三': '三年级', '四': '四年级', '五': '五年级', '六': '六年级' };
            currentGrade = gradeMap[gradeMatch[1]] || '未知';
        }
        if (sourceFile.includes('秋季')) currentSemester = '秋季';
        else if (sourceFile.includes('冬季')) currentSemester = '冬季';
        else if (sourceFile.includes('春季')) currentSemester = '春季';
        else if (sourceFile.includes('夏季')) currentSemester = '夏季';

        // 首先按页分割，去掉页眉页脚噪声
        const noiseWords = ['Word List', '欧标', '词汇', '音标', '词义', '乐读', '专注小班', '本册词汇', '单词表音频', '乐进', '剑桥', '学生用书'];

        // 按行扫描，识别多行词汇块（CEFR / word / phonetic / pos+meaning）
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            // 检测 Unit 标题
            const unitMatch = line.match(/Unit\s*(\d+)\s*(.*)/i);
            if (unitMatch && line.length < 60) {
                currentUnit = `Unit ${unitMatch[1]}${unitMatch[2] ? ' ' + unitMatch[2] : ''}`;
                continue;
            }

            // 检测板块
            if (this.isSectionHeader(line, 'Vocabulary')) { currentSection = 'Vocabulary'; continue; }
            if (this.isSectionHeader(line, 'Phonics')) { currentSection = 'Phonics'; continue; }
            if (this.isSectionHeader(line, 'Reading')) { currentSection = 'Reading'; continue; }
            if (this.isSectionHeader(line, 'Grammar')) { currentSection = 'Grammar'; continue; }

            // 跳过噪声行
            if (noiseWords.some(n => line.includes(n)) && line.length < 30) continue;
            // 跳过纯数字行（如页码）
            if (/^\d+$/.test(line)) continue;
            // 跳过 CEFR 等级行（A1/A2/B1/B2）
            if (/^(A1|A2|B1|B2|C1|C2)$/i.test(line)) continue;
            // 跳过页眉
            if (line.startsWith('## 第') || line.startsWith('# ') || line.startsWith('**')) continue;

            // 多行词汇块识别：当前行是音标行（/.../）
            if (line.startsWith('/') && line.endsWith('/') && line.length > 2) {
                const phonetic = line;
                const wordLine = i > 0 ? lines[i - 1] : '';
                const meaningLine = i < lines.length - 1 ? lines[i + 1] : '';

                // 验证 word 行是纯英文单词
                if (wordLine && /^[a-zA-Z][a-zA-Z\-']*$/.test(wordLine)) {
                    const word = wordLine;
                    // 解析 meaning 行：可能是 "adj. 害怕的" 或 "adj 害怕的" 或 "n.（外）孙女"
                    let partOfSpeech = '';
                    let meaning = meaningLine;
                    const posMatch = meaningLine.match(/^([a-z]+\.)\s*(.*)/);
                    if (posMatch) {
                        partOfSpeech = posMatch[1];
                        meaning = posMatch[2];
                    } else {
                        const posMatch2 = meaningLine.match(/^([a-z]+)\s+(.*)/);
                        if (posMatch2 && ['adj', 'n', 'v', 'adv', 'prep', 'conj', 'pron', 'num'].includes(posMatch2[1])) {
                            partOfSpeech = posMatch2[1] + '.';
                            meaning = posMatch2[2];
                        }
                    }

                    // 跳过无效内容
                    if (meaning && !/^[a-zA-Z]/.test(meaning) && meaning.length < 30) {
                        const content = {
                            text: word,
                            phonetic,
                            partOfSpeech,
                            meaning
                        };

                        items.push({
                            id: this.generateId(sourceFile, currentUnit, currentSection, word),
                            type: 'word',
                            grade: currentGrade,
                            semester: currentSemester,
                            unit: currentUnit,
                            sourceFile,
                            section: currentSection,
                            content,
                            cefr: '',
                            tags: [],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            status: 'active'
                        });
                    }
                }
            }

            // 处理 Reading 词汇表：编号. 短语 中文
            if (currentSection === 'Reading') {
                const readingMatch = line.match(/^(\d+)\.\s*([a-zA-Z][a-zA-Z\s\-']*)\s+(.+)$/);
                if (readingMatch) {
                    const phrase = readingMatch[2].trim();
                    const meaning = readingMatch[3].trim();
                    if (meaning && !/^[a-zA-Z]/.test(meaning)) {
                        items.push({
                            id: this.generateId(sourceFile, currentUnit, 'Reading', phrase),
                            type: 'phrase',
                            grade: currentGrade,
                            semester: currentSemester,
                            unit: currentUnit,
                            sourceFile,
                            section: 'Reading',
                            content: { text: phrase, phonetic: '', partOfSpeech: '', meaning },
                            cefr: '',
                            tags: [],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            status: 'active'
                        });
                    }
                }
            }

            // 处理 Grammar：以 Grammar 板块下的标题行作为语法点
            if (currentSection === 'Grammar' && line.length > 2 && line.length < 60) {
                // 跳过例句和口诀等
                if (line.includes('Example') || line.includes('例句') || line.includes('口诀') || line.includes('Notice')) continue;
                if (line.startsWith('have got') || line.startsWith('there be') || line.match(/some\/any/)) {
                    const text = line;
                    items.push({
                        id: this.generateId(sourceFile, currentUnit, 'Grammar', text),
                        type: 'grammar',
                        grade: currentGrade,
                        semester: currentSemester,
                        unit: currentUnit,
                        sourceFile,
                        section: 'Grammar',
                        content: { text, phonetic: '', partOfSpeech: '', meaning: '', example: '' },
                        cefr: '',
                        tags: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        status: 'active'
                    });
                }
            }
        }

        return items;
    },

    isSectionHeader(line, sectionName) {
        const patterns = {
            'Vocabulary': /^(Vocabulary|单词|Word\s*List|词汇表)$/i,
            'Phonics': /^(Phonics|自然拼读)$/i,
            'Reading': /^(Reading|阅读|Mind\s*Map)$/i,
            'Grammar': /^(Grammar|语法)$/i
        };
        return patterns[sectionName] && patterns[sectionName].test(line);
    },

    async refreshMaterials(markdownFiles) {
        const newItems = [];
        for (const file of markdownFiles) {
            const text = await file.text();
            const parsed = this.parseMarkdown(text, file.name);
            newItems.push(...parsed);
        }

        const existingItems = await Storage.getAll('items');
        const existingMap = new Map(existingItems.map(i => [i.id, i]));

        let added = 0;
        let updated = 0;
        let archived = 0;

        const newMap = new Map(newItems.map(i => [i.id, i]));

        for (const newItem of newItems) {
            const existing = existingMap.get(newItem.id);
            if (!existing) {
                await Storage.put('items', newItem);
                added++;
            } else {
                const same = JSON.stringify(existing.content) === JSON.stringify(newItem.content);
                if (!same) {
                    existing.content = newItem.content;
                    existing.updatedAt = newItem.updatedAt;
                    await Storage.put('items', existing);
                    updated++;
                }
            }
        }

        for (const existing of existingItems) {
            if (!newMap.has(existing.id) && existing.status === 'active') {
                existing.status = 'archived';
                await Storage.put('items', existing);
                archived++;
            }
        }

        return { added, updated, archived, total: newItems.length };
    }
};
