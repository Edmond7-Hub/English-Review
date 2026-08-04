const Questions = {
    generate(items, count = 10) {
        const questions = [];
        const shuffled = [...items].sort(() => 0.5 - Math.random());

        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            const item = shuffled[i];
            const type = this.pickQuestionType(item);
            const question = this.createQuestion(item, type, items);
            if (question) questions.push(question);
        }

        return questions;
    },

    pickQuestionType(item) {
        if (item.type === 'word') {
            return Math.random() > 0.5 ? 'word-meaning' : 'meaning-word';
        }
        return 'word-meaning';
    },

    createQuestion(item, type, allItems) {
        if (type === 'word-meaning') {
            return this.wordToMeaning(item, allItems);
        } else if (type === 'meaning-word') {
            return this.meaningToWord(item, allItems);
        }
        return null;
    },

    wordToMeaning(item, allItems) {
        const correct = item.content.meaning || item.content.text;
        const options = [correct];
        const distractors = allItems
            .filter(i => i.id !== item.id)
            .map(i => i.content.meaning || i.content.text)
            .filter(Boolean);

        while (options.length < 4 && distractors.length > 0) {
            const pick = distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0];
            if (pick && !options.includes(pick)) options.push(pick);
        }

        return {
            item,
            type: 'word-meaning',
            prompt: item.content.text,
            promptSub: item.content.phonetic || '',
            options: this.shuffle(options),
            answer: correct,
            explanation: `${item.content.text} ${item.content.phonetic || ''} — ${item.content.meaning || ''}`
        };
    },

    meaningToWord(item, allItems) {
        const correct = item.content.text;
        const options = [correct];
        const distractors = allItems
            .filter(i => i.id !== item.id)
            .map(i => i.content.text)
            .filter(Boolean);

        while (options.length < 4 && distractors.length > 0) {
            const pick = distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0];
            if (pick && !options.includes(pick)) options.push(pick);
        }

        return {
            item,
            type: 'meaning-word',
            prompt: item.content.meaning || item.content.text,
            promptSub: '',
            options: this.shuffle(options),
            answer: correct,
            explanation: `${item.content.text} ${item.content.phonetic || ''} — ${item.content.meaning || ''}`
        };
    },

    shuffle(array) {
        return array.sort(() => 0.5 - Math.random());
    }
};
