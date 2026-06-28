const DEFAULT_PROGRAM_TITLE = 'УМШ';

export const createEmptySessions = () => ({
    session1: { photos: '', lectures: '', presentations: '', tests: [], program: '' },
    session2: { photos: '', lectures: '', presentations: '', tests: [], program: '' },
    session3: { photos: '', lectures: '', presentations: '', tests: [], program: '' }
});

const getLegacySeasonNumber = (seasonId) => {
    const value = String(seasonId ?? '').trim();
    return /^\d+$/.test(value) ? Number(value) : null;
};

export const getSeasonTitle = (seasonId, season = {}) =>
    String(season.title || DEFAULT_PROGRAM_TITLE).trim();

export const getSeasonNumber = (seasonId, season = {}) => {
    if (season.seasonNumber === null || season.seasonNumber === '') return null;
    if (season.seasonNumber !== undefined) {
        const number = Number(season.seasonNumber);
        return Number.isFinite(number) ? number : null;
    }
    return getLegacySeasonNumber(seasonId);
};

export const getSeasonLabel = (seasonId, season = {}) => {
    const title = getSeasonTitle(seasonId, season);
    const number = getSeasonNumber(seasonId, season);
    return number === null ? title : `${title} ${number}`;
};

const getSortOrder = (seasonId, season = {}) => {
    const explicitOrder = Number(season.sortOrder);
    if (season.sortOrder !== undefined && season.sortOrder !== null && season.sortOrder !== '' && Number.isFinite(explicitOrder)) {
        return explicitOrder;
    }

    const seasonNumber = getSeasonNumber(seasonId, season);
    if (seasonNumber !== null) return seasonNumber;

    const createdAt = Number(season.createdAt);
    return Number.isFinite(createdAt) ? createdAt : Number.MAX_SAFE_INTEGER;
};

export const getSortedSeasons = (seasons = {}) =>
    Object.entries(seasons).sort(([idA, seasonA], [idB, seasonB]) => {
        const orderDifference = getSortOrder(idA, seasonA) - getSortOrder(idB, seasonB);
        if (orderDifference !== 0) return orderDifference;
        return getSeasonLabel(idA, seasonA).localeCompare(getSeasonLabel(idB, seasonB), 'uk');
    });

export const createSeasonId = () => `season-${crypto.randomUUID()}`;

export const createSeason = ({ title, seasonNumber, sortOrder }) => ({
    title: String(title || DEFAULT_PROGRAM_TITLE).trim(),
    seasonNumber: seasonNumber === '' || seasonNumber === null ? null : Number(seasonNumber),
    sortOrder: sortOrder === '' || sortOrder === null ? null : Number(sortOrder),
    createdAt: Date.now(),
    sessions: createEmptySessions()
});
