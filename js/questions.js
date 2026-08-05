const Questions = {
    generate(items, grammarPoints = [], count = 10) {
        const questions = [];

        // 1. 先复习/学习：词汇卡片
        const wordReviewItems = items.slice(0, Math.min(count, items.length)).map(item => ({
            mode: 'review',
            type: 'word-card',
            item
        }));
        questions.push(...wordReviewItems);

        // 2. 语法点复习卡片
        const grammarReviewItems = grammarPoints.slice(0, Math.min(3, grammarPoints.length)).map(item => ({
            mode: 'review',
            type: 'grammar-card',
            item
        }));
        questions.push(...grammarReviewItems);

        // 3. 练习题：基于剑桥少儿英语题型
        const quizItems = items.slice(0, Math.min(count, items.length));
        const quizQuestions = this.generateYLEQuiz(quizItems, items, count);
        questions.push(...quizQuestions);

        return questions;
    },

    generateYLEQuiz(targetItems, allItems, count) {
        const questions = [];
        const shuffled = [...targetItems].sort(() => 0.5 - Math.random());

        shuffled.slice(0, count).forEach(item => {
            const type = this.pickYLEQuestionType(item);
            const q = this.createQuestion(item, type, allItems);
            if (q) {
                questions.push({ ...q, mode: 'quiz' });
            }
        });

        return questions;
    },

    pickYLEQuestionType(item) {
        // 剑桥少儿英语常见题型
        const types = ['picture-choice', 'word-meaning', 'spelling', 'fill-blank', 'true-false'];
        return types[Math.floor(Math.random() * types.length)];
    },

    createQuestion(item, type, allItems) {
        if (type === 'picture-choice') {
            return this.pictureChoice(item, allItems);
        } else if (type === 'word-meaning') {
            return this.wordToMeaning(item, allItems);
        } else if (type === 'meaning-word') {
            return this.meaningToWord(item, allItems);
        } else if (type === 'spelling') {
            return this.spelling(item);
        } else if (type === 'fill-blank') {
            return this.fillBlank(item, allItems);
        } else if (type === 'true-false') {
            return this.trueFalse(item);
        }
        return null;
    },

    // 题型1：图文匹配 - 给中文释义，选英文单词
    pictureChoice(item, allItems) {
        if (!item.content || !item.content.text) return null;
        const correct = item.content.text;
        const options = this.getDistractors(item, allItems, 'text', 3);
        options.push(correct);

        return {
            item,
            type: 'picture-choice',
            prompt: `选择英文单词：${item.content.meaning || item.content.text}`,
            promptSub: '',
            options: this.shuffle(options),
            answer: correct,
            explanation: `${item.content.text} — ${item.content.meaning || ''}`
        };
    },

    // 题型2：词义选择 - 给英文单词，选中文意思
    wordToMeaning(item, allItems) {
        const correct = item.content.meaning || item.content.text;
        const options = this.getDistractors(item, allItems, 'meaning', 3);
        options.push(correct);

        return {
            item,
            type: 'word-meaning',
            prompt: `What does "${item.content.text}" mean?`,
            promptSub: item.content.phonetic || '',
            options: this.shuffle(options),
            answer: correct,
            explanation: `${item.content.text} ${item.content.phonetic || ''} — ${item.content.meaning || ''}`
        };
    },

    // 题型3：给中文，选英文单词
    meaningToWord(item, allItems) {
        const correct = item.content.text;
        const options = this.getDistractors(item, allItems, 'text', 3);
        options.push(correct);

        return {
            item,
            type: 'meaning-word',
            prompt: `选择正确的英文单词：${item.content.meaning || item.content.text}`,
            promptSub: '',
            options: this.shuffle(options),
            answer: correct,
            explanation: `${item.content.text} ${item.content.phonetic || ''} — ${item.content.meaning || ''}`
        };
    },

    // 题型4：拼写补全 - 缺字母
    spelling(item) {
        const word = item.content.text;
        if (!word || word.length < 3) return null;
        const hideCount = Math.min(2, Math.floor(word.length / 3));
        let masked = word;
        const indices = [];
        for (let i = 0; i < word.length; i++) indices.push(i);
        this.shuffle(indices);
        const hidden = indices.slice(0, hideCount).sort((a, b) => a - b);
        hidden.forEach(idx => {
            masked = masked.substring(0, idx) + '_' + masked.substring(idx + 1);
        });

        return {
            item,
            type: 'spelling',
            prompt: `补全单词：${masked}`,
            promptSub: item.content.meaning || '',
            options: [],
            answer: word,
            explanation: `${word} — ${item.content.meaning || ''}`
        };
    },

    // 题型5：填空选择
    fillBlank(item, allItems) {
        const correct = item.content.text;
        const options = this.getDistractors(item, allItems, 'text', 2);
        options.push(correct);

        return {
            item,
            type: 'fill-blank',
            prompt: `请选择合适的词填空：I like _______.`,
            promptSub: `提示：${item.content.meaning || ''}`,
            options: this.shuffle(options),
            answer: correct,
            explanation: `${correct} — ${item.content.meaning || ''}`
        };
    },

    // 题型6：判断正误
    trueFalse(item) {
        const isCorrectStatement = Math.random() > 0.5;
        const statement = isCorrectStatement
            ? `${item.content.text} means ${item.content.meaning || item.content.text}.`
            : `${item.content.text} means hello.`;

        return {
            item,
            type: 'true-false',
            prompt: `判断对错：${statement}`,
            promptSub: '',
            options: ['True', 'False'],
            answer: isCorrectStatement ? 'True' : 'False',
            explanation: `${item.content.text} — ${item.content.meaning || ''}`
        };
    },

    getDistractors(targetItem, allItems, field, count) {
        const options = [];
        const distractors = allItems
            .filter(i => i.id !== targetItem.id && i.content && i.content[field])
            .map(i => i.content[field])
            .filter(Boolean);

        while (options.length < count && distractors.length > 0) {
            const pick = distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0];
            if (pick && !options.includes(pick) && pick !== targetItem.content[field]) {
                options.push(pick);
            }
        }
        return options;
    },

    shuffle(array) {
        return [...array].sort(() => 0.5 - Math.random());
    }
};
