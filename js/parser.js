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
        const lines = markdown.split('\n');
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

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const unitMatch = line.match(/Unit\s*(\d+)[\s\-:：]*(.*)/i);
            if (unitMatch) {
                currentUnit = `Unit ${unitMatch[1]}${unitMatch[2] ? ' ' + unitMatch[2] : ''}`;
                continue;
            }

            if (/Vocabulary|单词|word list/i.test(line) && line.length < 30) {
                currentSection = 'Vocabulary';
                continue;
            }
            if (/Phonics|自然拼读/i.test(line) && line.length < 30) {
                currentSection = 'Phonics';
                continue;
            }
            if (/Reading|阅读|Mind Map/i.test(line) && line.length < 30) {
                currentSection = 'Reading';
                continue;
            }
            if (/Grammar|语法/i.test(line) && line.length < 30) {
                currentSection = 'Grammar';
                continue;
            }

            if (currentSection === 'Vocabulary') {
                const wordItem = this.parseVocabularyLine(line, currentUnit, currentSection, sourceFile, currentGrade, currentSemester);
                if (wordItem) items.push(wordItem);
            }
        }

        return items;
    },

    parseVocabularyLine(line, unit, section, sourceFile, grade, semester) {
        if (/^(\d+)\./.test(line)) return null;
        if (/^[一二三四五六七八九十]+$/.test(line)) return null;
        if (line.length < 2) return null;
        if (['Word List', '欧标', '词汇', '音标', '词义', '乐读', '专注小班'].some(n => line.includes(n))) return null;

        const cleanLine = line.replace(/[\s]+/g, ' ').trim();
        const phoneticMatch = cleanLine.match(/^(.*?)\s+([/][^/]+[/])\s+(.*)$/);
        if (phoneticMatch) {
            const word = phoneticMatch[1].trim();
            const phonetic = phoneticMatch[2].trim();
            const meaning = phoneticMatch[3].replace(/^[a-z]+\.\s?/, '').trim();
            const posMatch = phoneticMatch[3].match(/^([a-z]+\.)\s?/);
            const partOfSpeech = posMatch ? posMatch[1] : '';

            const content = {
                text: word,
                phonetic,
                partOfSpeech,
                meaning
            };

            return {
                id: this.generateId(sourceFile, unit, section, word),
                type: 'word',
                grade,
                semester,
                unit,
                sourceFile,
                section,
                content,
                cefr: '',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active'
            };
        }

        return null;
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

        return { added, updated, archived };
    }
};
