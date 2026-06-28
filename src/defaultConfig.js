import { createEmptySessions } from './seasonUtils';

export const createDefaultConfig = () => ({
    currentSeason: '12',
    seasons: {
        12: {
            title: 'УМШ',
            seasonNumber: 12,
            sortOrder: 12,
            sessions: createEmptySessions()
        }
    }
});

