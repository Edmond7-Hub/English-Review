const SM2 = {
    DEFAULT_EASE_FACTOR: 2.5,
    MIN_EASE_FACTOR: 1.3,

    schedule(record, quality) {
        const now = new Date();
        let interval = record.interval || 0;
        let repetition = record.repetition || 0;
        let easeFactor = record.easeFactor || this.DEFAULT_EASE_FACTOR;

        if (quality < 2) {
            repetition = 0;
            interval = 1;
            easeFactor = Math.max(this.MIN_EASE_FACTOR, easeFactor - 0.2);
        } else {
            repetition += 1;
            if (repetition === 1) {
                interval = 1;
            } else if (repetition === 2) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }

            if (quality === 2) {
                easeFactor = Math.max(this.MIN_EASE_FACTOR, easeFactor - 0.15);
            } else if (quality === 3) {
                easeFactor += 0.1;
            }
        }

        const nextReview = new Date(now);
        nextReview.setDate(now.getDate() + interval);

        return {
            ...record,
            interval,
            repetition,
            easeFactor,
            lastReviewedAt: now.toISOString(),
            nextReviewAt: nextReview.toISOString()
        };
    },

    createNewRecord(itemId) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return {
            itemId,
            lastReviewedAt: null,
            nextReviewAt: tomorrow.toISOString(),
            interval: 0,
            repetition: 0,
            easeFactor: this.DEFAULT_EASE_FACTOR,
            status: 'new',
            lapses: 0
        };
    }
};
