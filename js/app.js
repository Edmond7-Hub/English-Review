const App = {
    items: [],
    records: [],
    mistakes: [],
    settings: {},
    currentPlan: [],
    currentIndex: 0,
    todayStats: { correct: 0, wrong: 0 },

    async init() {
        try {
            await Storage.init();
            this.settings = await Storage.getSettings();
            this.items = await Storage.getAll('items');
            this.records = await Storage.getAll('reviewRecords');
            this.mistakes = await Storage.getAll('mistakeRecords');
            TTS.init();
            this.bindEvents();
            this.updateHomeScreen();
        } catch (err) {
            console.error('App.init failed', err);
        }
        this.showScreen('loading-screen');
        setTimeout(() => {
            this.showScreen('main-screen');
        }, 1500);
    },

    bindEvents() {
        document.getElementById('start-study-btn').addEventListener('click', () => this.startStudy());
        document.getElementById('refresh-materials-btn').addEventListener('click', () => this.refreshMaterials());
        document.getElementById('mistakes-btn').addEventListener('click', () => this.showMistakes());
        document.getElementById('stats-btn').addEventListener('click', () => this.showStats());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('settings-back-btn').addEventListener('click', () => this.showScreen('main-screen'));
        document.getElementById('stats-back-btn').addEventListener('click', () => this.showScreen('main-screen'));
        document.getElementById('mistakes-back-btn').addEventListener('click', () => this.showScreen('main-screen'));
        document.getElementById('back-btn').addEventListener('click', () => this.showScreen('main-screen'));
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('backup-btn').addEventListener('click', () => this.exportBackup());
        document.getElementById('restore-btn').addEventListener('click', () => this.importBackup());
        document.getElementById('import-input').addEventListener('change', (e) => this.handleImport(e));

        document.getElementById('daily-duration').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                document.getElementById('custom-duration').classList.remove('hidden');
            } else {
                document.getElementById('custom-duration').classList.add('hidden');
            }
        });

        document.querySelectorAll('#settings-screen input, #settings-screen select').forEach(el => {
            el.addEventListener('change', () => this.saveSettings());
        });

        document.getElementById('clear-cache-btn')?.addEventListener('click', () => this.clearCacheAndReload());
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    },

    updateHomeScreen() {
        const dueCount = this.getDueItems().length;
        const todayTotal = Math.min(dueCount + parseInt(this.settings.dailyNewItemLimit || 10), Math.max(this.items.length, 1));
        document.getElementById('today-count').textContent = Math.min(dueCount, todayTotal);
        document.getElementById('today-total').textContent = todayTotal;
        document.getElementById('streak-days').textContent = this.calculateStreak();
        document.getElementById('today-status').textContent = dueCount > 0 ? `今天有 ${dueCount} 个知识点待复习` : '今天已完成，真棒！';

        const progress = todayTotal > 0 ? ((todayTotal - dueCount) / todayTotal) * 100 : 100;
        document.getElementById('progress-circle').setAttribute('stroke-dasharray', `${progress}, 100`);
    },

    getDueItems() {
        const now = new Date().toISOString();
        const recordMap = new Map(this.records.map(r => [r.itemId, r]));
        return this.items.filter(item => {
            const rec = recordMap.get(item.id);
            if (!rec) return true;
            return rec.nextReviewAt <= now;
        });
    },

    calculateStreak() {
        return 0;
    },

    async startStudy() {
        if (this.items.length === 0) {
            alert('还没有学习素材，请先点击“刷新素材”导入 Markdown 文件。');
            return;
        }

        const dueItems = this.getDueItems();
        const reviewedIds = new Set(this.records.map(r => r.itemId));
        const newItems = this.items
            .filter(i => !reviewedIds.has(i.id))
            .slice(0, parseInt(this.settings.dailyNewItemLimit || 10));

        const planItems = [...dueItems, ...newItems].slice(0, Math.max(1, Math.floor((this.settings.dailyDurationMinutes || 35) / 1.5)));
        const grammarItems = this.items.filter(i => i.type === 'grammar' || i.section === 'Grammar').slice(0, 3);
        this.currentPlan = Questions.generate(planItems, grammarItems, planItems.length);
        this.currentIndex = 0;
        this.todayStats = { correct: 0, wrong: 0 };

        if (this.currentPlan.length === 0) {
            alert('今天没有需要复习的内容，太棒了！');
            return;
        }

        this.showScreen('study-screen');
        this.renderQuestion();
    },

    renderQuestion() {
        const q = this.currentPlan[this.currentIndex];
        if (!q) {
            this.showScreen('main-screen');
            return;
        }

        document.getElementById('study-counter').textContent = `${this.currentIndex + 1} / ${this.currentPlan.length}`;
        document.getElementById('study-progress-bar').style.width = `${(this.currentIndex / this.currentPlan.length) * 100}%`;

        const card = document.getElementById('question-card');

        if (q.mode === 'review') {
            if (q.type === 'word-card') {
                this.renderWordCard(card, q.item);
            } else if (q.type === 'grammar-card') {
                this.renderGrammarCard(card, q.item);
            }
        } else {
            this.renderQuiz(card, q);
        }

        document.getElementById('feedback-panel').classList.add('hidden');
    },

    renderWordCard(card, item) {
        const text = item.content?.text || '';
        const phonetic = item.content?.phonetic || '';
        const meaning = item.content?.meaning || '';
        const partOfSpeech = item.content?.partOfSpeech || '';

        card.innerHTML = `
            <div class="question-type"> 学习新词</div>
            <div class="review-card">
                <div class="review-word">${this.escapeHtml(text)}</div>
                <div class="review-phonetic">${this.escapeHtml(phonetic)}</div>
                <div class="review-pos">${this.escapeHtml(partOfSpeech)}</div>
                <div class="review-meaning">${this.escapeHtml(meaning)}</div>
            </div>
            <div class="review-hint">点击“下一题”进入练习</div>
        `;

        if (this.settings.autoPlayAudio && text) {
            TTS.speak(text, { settings: this.settings });
        }

        // 点击任意位置也能进入下一题
        card.onclick = () => this.nextQuestion();
    },

    renderGrammarCard(card, item) {
        const text = item.content?.text || '';
        const meaning = item.content?.meaning || '';
        const example = item.content?.example || '';

        card.innerHTML = `
            <div class="question-type">📖 语法点</div>
            <div class="review-card">
                <div class="review-word">${this.escapeHtml(text)}</div>
                <div class="review-meaning">${this.escapeHtml(meaning)}</div>
                ${example ? `<div class="review-example">${this.escapeHtml(example)}</div>` : ''}
            </div>
            <div class="review-hint">点击“下一题”继续</div>
        `;

        card.onclick = () => this.nextQuestion();
    },

    renderQuiz(card, q) {
        let optionsHtml = '';
        if (q.type === 'spelling') {
            optionsHtml = `
                <input type="text" id="spelling-input" class="spelling-input" placeholder="请输入完整单词" autocomplete="off">
                <button class="primary-btn submit-spelling">提交</button>
            `;
        } else {
            optionsHtml = `<div class="options">
                ${q.options.map((opt, idx) => `<button class="option-btn" data-idx="${idx}">${this.escapeHtml(opt)}</button>`).join('')}
            </div>`;
        }

        card.innerHTML = `
            <div class="question-type">${this.getTypeLabel(q.type)}</div>
            <h2>${this.escapeHtml(q.prompt)}</h2>
            ${q.promptSub ? `<div class="phonetic">${this.escapeHtml(q.promptSub)}</div>` : ''}
            ${optionsHtml}
        `;

        if (q.type === 'spelling') {
            card.querySelector('.submit-spelling').addEventListener('click', () => {
                const input = card.querySelector('#spelling-input');
                this.handleSpelling(input.value, q);
            });
            card.querySelector('#spelling-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleSpelling(e.target.value, q);
                }
            });
        } else {
            card.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleAnswer(e.target, q));
            });
        }

        if (this.settings.autoPlayAudio && q.item && q.item.content && q.item.content.text) {
            TTS.speak(q.item.content.text, { settings: this.settings });
        }
    },

    getTypeLabel(type) {
        const labels = {
            'word-meaning': '词义选择',
            'meaning-word': '单词选择',
            'picture-choice': '图文匹配',
            'spelling': '拼写补全',
            'fill-blank': '选择填空',
            'true-false': '判断对错'
        };
        return labels[type] || '练习';
    },

    handleSpelling(value, question) {
        const userAnswer = value.trim().toLowerCase();
        const isCorrect = userAnswer === question.answer.toLowerCase();
        const card = document.getElementById('question-card');
        card.innerHTML += `<div class="spelling-result ${isCorrect ? 'correct' : 'wrong'}">你的答案：${this.escapeHtml(value)}</div>`;
        this.recordResult(question, isCorrect);
        this.showFeedback(isCorrect, question);
    },

    escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async handleAnswer(button, question) {
        const selected = button.textContent.trim();
        const isCorrect = selected === question.answer;
        const buttons = document.querySelectorAll('.option-btn');

        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent.trim() === question.answer) {
                btn.classList.add('correct');
            } else if (btn === button && !isCorrect) {
                btn.classList.add('wrong');
            }
        });

        await this.recordResult(question, isCorrect);
        this.showFeedback(isCorrect, question);
    },

    async recordResult(question, isCorrect) {
        const itemId = question.item.id;
        let record = this.records.find(r => r.itemId === itemId);
        if (!record) {
            record = SM2.createNewRecord(itemId);
            this.records.push(record);
        }

        const quality = isCorrect ? 3 : 0;
        const updated = SM2.schedule(record, quality);
        Object.assign(record, updated);
        await Storage.put('reviewRecords', record);

        if (!isCorrect) {
            await this.addMistake(itemId, question);
        } else {
            await this.removeMistakeIfMastered(itemId);
        }
    },

    async addMistake(itemId, question) {
        let rec = this.mistakes.find(m => m.itemId === itemId);
        if (!rec) {
            rec = { itemId, wrongCount: 0, lastWrongAt: null, consecutiveCorrect: 0, wrongAnswers: [] };
            this.mistakes.push(rec);
        }
        rec.wrongCount += 1;
        rec.lastWrongAt = new Date().toISOString();
        rec.consecutiveCorrect = 0;
        rec.wrongAnswers.push({
            at: new Date().toISOString(),
            userAnswer: question.answer,
            correctAnswer: question.answer,
            questionType: question.type
        });
        await Storage.put('mistakeRecords', rec);
    },

    async removeMistakeIfMastered(itemId) {
        const rec = this.mistakes.find(m => m.itemId === itemId);
        if (!rec) return;
        rec.consecutiveCorrect += 1;
        if (rec.consecutiveCorrect >= (this.settings.masteryThreshold || 3)) {
            await Storage.delete('mistakeRecords', itemId);
            this.mistakes = this.mistakes.filter(m => m.itemId !== itemId);
        } else {
            await Storage.put('mistakeRecords', rec);
        }
    },

    showFeedback(isCorrect, question) {
        const panel = document.getElementById('feedback-panel');
        panel.classList.remove('hidden', 'correct', 'wrong');
        panel.classList.add(isCorrect ? 'correct' : 'wrong');
        document.getElementById('feedback-text').textContent = isCorrect ? '答对啦！' : '再想想哦～';
        document.getElementById('feedback-explanation').textContent = question.explanation || '';

        if (isCorrect) this.todayStats.correct++; else this.todayStats.wrong++;
    },

    nextQuestion() {
        this.currentIndex++;
        this.renderQuestion();
    },

    showSettings() {
        document.getElementById('daily-duration').value = this.settings.dailyDurationMinutes;
        document.getElementById('new-item-limit').value = this.settings.dailyNewItemLimit;
        document.getElementById('auto-play').checked = this.settings.autoPlayAudio;
        document.getElementById('speech-voice').value = this.settings.speechVoice;
        document.getElementById('speech-rate').value = this.settings.speechRate;
        document.getElementById('speech-rate-value').textContent = this.settings.speechRate;
        document.getElementById('mastery-threshold').value = this.settings.masteryThreshold;
        this.showScreen('settings-screen');
    },

    async saveSettings() {
        this.settings = {
            dailyDurationMinutes: parseInt(document.getElementById('daily-duration').value) || 35,
            dailyNewItemLimit: parseInt(document.getElementById('new-item-limit').value) || 10,
            autoPlayAudio: document.getElementById('auto-play').checked,
            speechVoice: document.getElementById('speech-voice').value,
            speechRate: parseFloat(document.getElementById('speech-rate').value) || 0.8,
            masteryThreshold: parseInt(document.getElementById('mastery-threshold').value) || 3
        };
        await Storage.setSettings(this.settings);
        this.updateHomeScreen();
    },

    async showStats() {
        const total = this.items.length;
        const mastered = this.records.filter(r => r.repetition >= 3).length;
        const totalAttempts = this.todayStats.correct + this.todayStats.wrong;
        const accuracy = totalAttempts > 0 ? Math.round((this.todayStats.correct / totalAttempts) * 100) : 0;
        document.getElementById('total-items').textContent = total;
        document.getElementById('mastered-items').textContent = mastered;
        document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
        document.getElementById('study-days').textContent = this.calculateStreak();
        this.showScreen('stats-screen');
    },

    async showMistakes() {
        const list = document.getElementById('mistakes-list');
        if (this.mistakes.length === 0) {
            list.innerHTML = '<p class="empty">暂无错题，太棒了！</p>';
        } else {
            list.innerHTML = this.mistakes.map(m => {
                const item = this.items.find(i => i.id === m.itemId);
                if (!item) return '';
                return `
                    <div class="mistake-card">
                        <div class="word">${item.content.text}</div>
                        <div class="meta">${item.content.phonetic || ''} ${item.content.meaning || ''}</div>
                        <div class="meta">错 ${m.wrongCount} 次 · 连续答对 ${m.consecutiveCorrect} 次</div>
                    </div>
                `;
            }).join('');
        }
        this.showScreen('mistakes-screen');
    },

    async refreshMaterials() {
        const input = document.getElementById('file-input');
        input.onchange = async (e) => {
            const files = Array.from(e.target.files).filter(f => f.name.endsWith('.md'));
            if (files.length === 0) return;
            const result = await Parser.refreshMaterials(files);
            alert(`刷新完成！新增 ${result.added} 个，更新 ${result.updated} 个，归档 ${result.archived} 个`);
            this.items = await Storage.getAll('items');
            this.updateHomeScreen();
        };
        input.click();
    },

    async exportBackup() {
        const json = await Storage.exportToJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledu_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importBackup() {
        document.getElementById('import-input').click();
    },

    async clearCacheAndReload() {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(r => r.unregister()));
        }
        if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        }
        window.location.reload();
    },

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        await Storage.importFromJSON(text);
        this.items = await Storage.getAll('items');
        this.records = await Storage.getAll('reviewRecords');
        this.mistakes = await Storage.getAll('mistakeRecords');
        this.settings = await Storage.getSettings();
        alert('数据恢复成功！');
        this.updateHomeScreen();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
