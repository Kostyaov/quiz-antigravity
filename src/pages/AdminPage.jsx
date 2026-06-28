import { useState, useEffect, useMemo, useRef } from 'react';
import { Lock, Save, ArrowLeft, Loader2, Plus, LogOut, Download, Upload, RotateCcw } from 'lucide-react';
import { getAppConfig, saveAppConfig, deleteTestResults, saveQuizContent, deleteQuizContent, IS_LOCAL_DATA_MODE } from '../firebase';
import { signInAdmin, signOutAdmin, subscribeToAdminAuth } from '../adminAuth';
import { createDefaultConfig } from '../defaultConfig';
import { createEmptySessions, createSeason, createSeasonId, getSeasonLabel, getSeasonNumber, getSeasonTitle, getSortedSeasons } from '../seasonUtils';

const CONFIG_BACKUPS_KEY = 'quiz_admin_config_backups';
const MAX_LOCAL_BACKUPS = 10;

const createConfigSnapshot = (config) => JSON.stringify(config);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const readConfigBackups = () => {
    try {
        const backups = JSON.parse(localStorage.getItem(CONFIG_BACKUPS_KEY) || '[]');
        return Array.isArray(backups)
            ? backups.filter(backup => backup?.createdAt && isPlainObject(backup.config))
            : [];
    } catch (error) {
        console.warn('Не вдалося прочитати локальні бекапи конфігурації:', error);
        return [];
    }
};

const savePreviousConfigBackup = (snapshot) => {
    if (!snapshot) return null;

    try {
        const backup = {
            createdAt: new Date().toISOString(),
            config: JSON.parse(snapshot)
        };
        const existing = JSON.parse(localStorage.getItem(CONFIG_BACKUPS_KEY) || '[]');
        localStorage.setItem(CONFIG_BACKUPS_KEY, JSON.stringify([backup, ...existing].slice(0, MAX_LOCAL_BACKUPS)));
        return backup.createdAt;
    } catch (error) {
        console.warn('Не вдалося створити локальний бекап конфігурації:', error);
        return null;
    }
};

const formatBackupDate = (isoDate) => {
    try {
        return new Intl.DateTimeFormat('uk-UA', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(new Date(isoDate));
    } catch {
        return isoDate;
    }
};

const getBackupSummary = () => {
    const backups = readConfigBackups();
    return {
        count: backups.length,
        latestLabel: backups[0]?.createdAt ? formatBackupDate(backups[0].createdAt) : ''
    };
};

const getInitialSeasonId = (appConfig) => (
    appConfig.seasons?.[appConfig.currentSeason]
        ? appConfig.currentSeason
        : getSortedSeasons(appConfig.seasons)[0]?.[0]
);

const normalizeImportedConfig = (rawConfig) => {
    if (!isPlainObject(rawConfig)) {
        throw new Error('Файл не схожий на конфігурацію сайту.');
    }

    if (!isPlainObject(rawConfig.seasons) || Object.keys(rawConfig.seasons).length === 0) {
        throw new Error('У конфігурації немає навчальних циклів (seasons).');
    }

    const normalizedSeasons = {};
    Object.entries(rawConfig.seasons).forEach(([seasonId, season]) => {
        if (!isPlainObject(season)) {
            throw new Error(`Навчальний цикл "${seasonId}" має неправильний формат.`);
        }

        if (!isPlainObject(season.sessions)) {
            throw new Error(`У навчальному циклі "${seasonId}" немає блоку sessions.`);
        }

        const emptySessions = createEmptySessions();
        const normalizedSessions = {};
        Object.entries(emptySessions).forEach(([sessionKey, emptySession]) => {
            const sourceSession = season.sessions[sessionKey] || {};
            if (!isPlainObject(sourceSession)) {
                throw new Error(`Сесія "${sessionKey}" у циклі "${seasonId}" має неправильний формат.`);
            }

            if (
                sourceSession.tests !== undefined &&
                !Array.isArray(sourceSession.tests) &&
                typeof sourceSession.tests !== 'string'
            ) {
                throw new Error(`Поле tests у сесії "${sessionKey}" має бути списком або текстом.`);
            }

            normalizedSessions[sessionKey] = {
                ...emptySession,
                ...sourceSession,
                tests: sourceSession.tests ?? []
            };
        });

        normalizedSeasons[String(seasonId)] = {
            ...season,
            sessions: normalizedSessions
        };
    });

    const requestedCurrentSeason = String(rawConfig.currentSeason || '');
    const currentSeason = normalizedSeasons[requestedCurrentSeason]
        ? requestedCurrentSeason
        : Object.keys(normalizedSeasons)[0];

    return {
        ...rawConfig,
        currentSeason,
        seasons: normalizedSeasons
    };
};

export default function AdminPage() {
    const importConfigInputRef = useRef(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [email, setEmail] = useState(IS_LOCAL_DATA_MODE ? 'admin@local.test' : '');
    const [password, setPassword] = useState('');
    const [config, setConfig] = useState(createDefaultConfig);
    const [savedConfigSnapshot, setSavedConfigSnapshot] = useState(null);
    const [pendingTestDeletions, setPendingTestDeletions] = useState([]);
    const [activeTab, setActiveTab] = useState("session1");
    const [activeSeason, setActiveSeason] = useState("12");
    const [status, setStatus] = useState(''); // '', 'saving', 'saved', 'error'
    const [error, setError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [configNotice, setConfigNotice] = useState('');
    const [backupSummary, setBackupSummary] = useState({ count: 0, latestLabel: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [newTest, setNewTest] = useState({ name: '', url: '' });
    const [showAddSeason, setShowAddSeason] = useState(false);
    const [seasonFormError, setSeasonFormError] = useState('');
    const [newSeason, setNewSeason] = useState({ title: 'УМШ', seasonNumber: '', sortOrder: '', makeCurrent: true });
    const configSnapshot = useMemo(() => createConfigSnapshot(config), [config]);
    const hasUnsavedChanges = savedConfigSnapshot !== null && configSnapshot !== savedConfigSnapshot;

    useEffect(() => subscribeToAdminAuth(user => {
        setIsLoggedIn(Boolean(user));
        setAuthChecked(true);
    }), []);

    useEffect(() => {
        if (isLoggedIn) {
            getAppConfig().then(data => {
                const nextConfig = data || createDefaultConfig();
                setConfig(nextConfig);
                setSavedConfigSnapshot(data ? createConfigSnapshot(nextConfig) : '');
                setPendingTestDeletions([]);
                setSaveError('');
                setConfigNotice('');
                setBackupSummary(getBackupSummary());
                setStatus('');
                const nextActiveSeason = getInitialSeasonId(nextConfig);
                if (nextActiveSeason) setActiveSeason(nextActiveSeason);
            });
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (!hasUnsavedChanges) return undefined;

        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const updateSessionField = (sessionKey, field, value) => {
        setConfig(prev => ({
            ...prev,
            seasons: {
                ...prev.seasons,
                [activeSeason]: {
                    ...prev.seasons[activeSeason],
                    sessions: {
                        ...prev.seasons[activeSeason].sessions,
                        [sessionKey]: {
                            ...prev.seasons[activeSeason].sessions[sessionKey],
                            [field]: value
                        }
                    }
                }
            }
        }));
    };

    const updateSeasonField = (field, value) => {
        setConfig(prev => ({
            ...prev,
            seasons: {
                ...prev.seasons,
                [activeSeason]: {
                    ...prev.seasons[activeSeason],
                    [field]: value
                }
            }
        }));
    };

    const handleAddSeason = () => {
        const title = newSeason.title.trim();
        if (!title) {
            setSeasonFormError('Вкажіть назву програми або школи.');
            return;
        }

        const season = createSeason(newSeason);
        const duplicate = Object.entries(config.seasons || {}).some(([seasonId, existingSeason]) =>
            getSeasonLabel(seasonId, existingSeason).toLocaleLowerCase('uk-UA') ===
            getSeasonLabel('', season).toLocaleLowerCase('uk-UA')
        );

        if (duplicate) {
            setSeasonFormError('Навчальний цикл із такою назвою вже існує.');
            return;
        }

        const canUseNumericId = title.toLocaleLowerCase('uk-UA') === 'умш' &&
            season.seasonNumber !== null &&
            !config.seasons[String(season.seasonNumber)];
        const seasonId = canUseNumericId ? String(season.seasonNumber) : createSeasonId();

        setConfig(prev => ({
            ...prev,
            currentSeason: newSeason.makeCurrent ? seasonId : prev.currentSeason,
            seasons: {
                ...prev.seasons,
                [seasonId]: season
            }
        }));
        setActiveSeason(seasonId);
        setNewSeason({ title: 'УМШ', seasonNumber: '', sortOrder: '', makeCurrent: true });
        setSeasonFormError('');
        setShowAddSeason(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password || isSigningIn) return;

        setIsSigningIn(true);
        setError('');
        try {
            await signInAdmin(email, password);
            setIsLoggedIn(true);
            setPassword('');
        } catch (loginError) {
            setError(loginError.message || 'Не вдалося увійти');
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleLogout = async () => {
        if (!confirmDiscardChanges()) return;
        await signOutAdmin();
        setIsLoggedIn(false);
        setPassword('');
        setError('');
        setSaveError('');
        setConfigNotice('');
    };

    const handleSave = async () => {
        if (!hasUnsavedChanges || status === 'saving') return;

        setStatus('saving');
        setSaveError('');
        setConfigNotice('');
        try {
            const backupCreatedAt = savePreviousConfigBackup(savedConfigSnapshot);
            await saveAppConfig(config);

            await cleanupDeletedTests(pendingTestDeletions);
            setPendingTestDeletions([]);
            setSavedConfigSnapshot(createConfigSnapshot(config));
            setBackupSummary(getBackupSummary());
            if (backupCreatedAt) {
                setConfigNotice(`Зміни збережено. Попередню конфігурацію збережено як локальний бекап від ${formatBackupDate(backupCreatedAt)}.`);
            }

            setStatus('saved');
            setTimeout(() => setStatus(''), 3000);
        } catch (saveError) {
            console.error('Admin save failed:', saveError);
            setSaveError(saveError.message || 'Не вдалося зберегти зміни. Спробуйте ще раз.');
            setStatus('error');
        }
    };

    const applyConfigDraft = (nextConfig, message) => {
        const nextActiveSeason = getInitialSeasonId(nextConfig);
        setConfig(nextConfig);
        if (nextActiveSeason) setActiveSeason(nextActiveSeason);
        setActiveTab('session1');
        setPendingTestDeletions([]);
        setSaveError('');
        setStatus('');
        setConfigNotice(message);
    };

    const confirmDiscardChanges = () => (
        !hasUnsavedChanges ||
        window.confirm('Є незбережені зміни. Якщо піти зараз, вони можуть загубитися. Продовжити без збереження?')
    );

    const handleNavigateHome = (event) => {
        if (!confirmDiscardChanges()) event.preventDefault();
    };

    const cleanupDeletedTests = async (testsToDelete) => {
        const seen = new Set();

        for (const test of testsToDelete) {
            const key = `${test.id || ''}:${test.url || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);

            if (test.id) {
                await deleteTestResults(test.id);
            }

            if (test.url?.startsWith('fb:')) {
                await deleteQuizContent(test.url.substring(3));
            }
        }
    };

    const markTestForDeletion = (test) => {
        setPendingTestDeletions(prev => {
            const alreadyAdded = prev.some(item => item.id === test.id && item.url === test.url);
            if (alreadyAdded) return prev;
            return [...prev, { id: test.id, name: test.name, url: test.url }];
        });
    };

    const handleExportConfig = () => {
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        link.href = url;
        link.download = `quiz-config-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleImportConfigClick = () => {
        importConfigInputRef.current?.click();
    };

    const handleImportConfigFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const text = await file.text();
            const nextConfig = normalizeImportedConfig(JSON.parse(text));
            const confirmMessage = hasUnsavedChanges
                ? 'У вас є незбережені зміни. Імпорт замінить поточну форму даними з JSON-файлу, але ще не збереже їх на сайт. Продовжити?'
                : 'Імпортувати конфігурацію з JSON-файлу? Вона замінить поточну форму, але ще не буде збережена на сайт.';

            if (!window.confirm(confirmMessage)) return;

            applyConfigDraft(
                nextConfig,
                `Конфігурацію імпортовано з файлу “${file.name}”. Перевірте дані й натисніть “Зберегти зміни”, якщо все правильно.`
            );
        } catch (importError) {
            console.error('Config import failed:', importError);
            setSaveError(importError.message || 'Не вдалося імпортувати JSON-файл.');
            setConfigNotice('');
            setStatus('error');
        }
    };

    const handleRestoreLatestBackup = () => {
        const latestBackup = readConfigBackups()[0];
        if (!latestBackup) {
            setConfigNotice('Локальних бекапів у цьому браузері ще немає.');
            setSaveError('');
            setStatus('');
            return;
        }

        try {
            const nextConfig = normalizeImportedConfig(latestBackup.config);
            const backupLabel = formatBackupDate(latestBackup.createdAt);
            const confirmMessage = hasUnsavedChanges
                ? `У вас є незбережені зміни. Відновити локальний бекап від ${backupLabel} замість поточної форми? Це ще не збереже зміни на сайт.`
                : `Відновити локальний бекап від ${backupLabel}? Це замінить поточну форму, але ще не збереже зміни на сайт.`;

            if (!window.confirm(confirmMessage)) return;

            applyConfigDraft(
                nextConfig,
                `Відновлено локальний бекап від ${backupLabel}. Перевірте дані й натисніть “Зберегти зміни”, якщо все правильно.`
            );
            setBackupSummary(getBackupSummary());
        } catch (restoreError) {
            console.error('Config restore failed:', restoreError);
            setSaveError(restoreError.message || 'Не вдалося відновити локальний бекап.');
            setConfigNotice('');
            setStatus('error');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Auto-fill name if empty
            if (!newTest.name) {
                const fileName = file.name.replace(/\.[^/.]+$/, "");
                setNewTest(prev => ({ ...prev, name: fileName }));
            }
        }
    };

    const handleAddTest = async () => {
        if (!newTest.name || (!newTest.url && !selectedFile)) {
            alert("Будь ласка, заповніть назву та виберіть файл або вкажіть URL");
            return;
        }

        setIsUploading(true);
        try {
            let finalUrl = newTest.url;

            if (selectedFile) {
                const content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            resolve(JSON.parse(e.target.result));
                        } catch {
                            reject(new Error("Неправильний формат JSON файлу"));
                        }
                    };
                    reader.onerror = () => reject(new Error("Помилка при читанні файлу"));
                    reader.readAsText(selectedFile);
                });

                const quizId = await saveQuizContent(content);
                finalUrl = `fb:${quizId}`;
            }

            const currentTests = config.seasons[activeSeason]?.sessions[activeTab]?.tests;
            const testsArray = Array.isArray(currentTests) ? currentTests : [];

            const testToAdd = {
                id: crypto.randomUUID(),
                name: newTest.name,
                url: finalUrl,
                createdAt: Date.now()
            };

            updateSessionField(activeTab, 'tests', [...testsArray, testToAdd]);

            // Reset form
            setNewTest({ name: '', url: '' });
            setSelectedFile(null);
            // Reset file input if possible (via ref usually, but we can just rely on state for now)
        } catch (err) {
            alert('Помилка при додаванні тесту: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (!authChecked) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}>
                <div className="glass fade-in" style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '3rem 2rem',
                    borderRadius: '24px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem',
                        color: 'var(--accent-color)'
                    }}>
                        <Lock size={32} />
                    </div>

                    <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Адмін-панель</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>
                        Будь ласка, введіть пошту й пароль для доступу
                    </p>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="email"
                            autoComplete="username"
                            placeholder="Електронна пошта"
                            aria-label="Електронна пошта"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        <input
                            type="password"
                            autoComplete="current-password"
                            placeholder="Пароль"
                            aria-label="Пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        {error && <p style={{ color: '#ef4444', fontSize: '0.75rem' }}>{error}</p>}
                        <button type="submit" disabled={isSigningIn || !email.trim() || !password} style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--accent-color)',
                            color: 'white',
                            fontWeight: 600,
                            opacity: isSigningIn || !email.trim() || !password ? 0.6 : 1
                        }}>
                            {isSigningIn ? 'Вхід...' : 'Увійти'}
                        </button>
                    </form>

                    <a href="/" onClick={handleNavigateHome} style={{ display: 'inline-block', marginTop: '2rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>
                        Повернутися на головну
                    </a>
                </div>
            </div>
        );
    }

    const activeSeasonData = config.seasons?.[activeSeason] || {};
    const sortedSeasons = getSortedSeasons(config.seasons);

    return (
        <div className="admin-container" style={{ minHeight: '100vh', width: '100%', padding: '2rem', maxWidth: '800px', margin: '0 auto', overflowX: 'clip' }}>
            {IS_LOCAL_DATA_MODE && (
                <div style={{
                    marginBottom: '1rem', padding: '10px 14px', borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#f59e0b', fontSize: '0.875rem'
                }}>
                    Локальний режим: зміни зберігаються лише в цьому браузері й не потрапляють на сайт.
                </div>
            )}
            {hasUnsavedChanges && (
                <div style={{
                    marginBottom: '1rem', padding: '10px 14px', borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#f59e0b', fontSize: '0.875rem'
                }}>
                    Є незбережені зміни. Натисніть “Зберегти зміни”, перш ніж виходити з адмінки.
                </div>
            )}
            {status === 'error' && saveError && (
                <div style={{
                    marginBottom: '1rem', padding: '10px 14px', borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#ef4444', fontSize: '0.875rem'
                }}>
                    {saveError}
                </div>
            )}
            {configNotice && (
                <div style={{
                    marginBottom: '1rem', padding: '10px 14px', borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.35)',
                    color: 'var(--text-primary)', fontSize: '0.875rem'
                }}>
                    {configNotice}
                </div>
            )}
            <header className="admin-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="/" onClick={handleNavigateHome} style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={24} /></a>
                    <h1 style={{ fontSize: '1.5rem' }}>Налаштування</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                        onClick={handleSave}
                        disabled={status === 'saving' || !hasUnsavedChanges}
                        className="save-button"
                        aria-label={status === 'saved' ? 'Збережено' : 'Зберегти зміни'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: status === 'saved' ? '#10b981' : 'var(--accent-color)',
                            color: 'white',
                            fontWeight: 600,
                            opacity: status === 'saving' || !hasUnsavedChanges ? 0.55 : 1,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {status === 'saving' ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        <span className="save-button-text">{status === 'saved' ? 'Збережено' : hasUnsavedChanges ? 'Зберегти зміни' : 'Без змін'}</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        aria-label="Вийти з адмін-панелі"
                        title="Вийти"
                        style={{
                            width: '44px', height: '44px', flex: '0 0 44px', borderRadius: '12px',
                            border: '1px solid var(--glass-border)', background: 'var(--surface-color)',
                            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div className="glass admin-card" style={{ marginBottom: '2rem', padding: '1.25rem', borderRadius: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <select
                        value={activeSeason}
                        onChange={(e) => setActiveSeason(e.target.value)}
                        style={{
                            flex: '1 1 280px', minWidth: 0, maxWidth: '100%', padding: '10px 16px', borderRadius: '12px',
                            border: '1px solid var(--glass-border)', background: 'var(--surface-color)',
                            color: 'var(--text-primary)', fontSize: '1rem', outline: 'none'
                        }}
                    >
                        {sortedSeasons.map(([seasonId, season]) => (
                            <option key={seasonId} value={seasonId}>
                                {getSeasonLabel(seasonId, season)}{config.currentSeason === seasonId ? ' (поточний)' : ''}
                            </option>
                        ))}
                    </select>
                    {config.currentSeason !== activeSeason && (
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, currentSeason: activeSeason }))}
                            style={{
                                padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                                background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            Зробити поточним
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setShowAddSeason(prev => !prev);
                            setSeasonFormError('');
                        }}
                        style={{
                            padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Додати навчальний цикл"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="admin-cycle-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Назва програми або школи
                        <input
                            type="text"
                            value={getSeasonTitle(activeSeason, activeSeasonData)}
                            onChange={(e) => updateSeasonField('title', e.target.value)}
                            style={{
                                width: '100%', marginTop: '0.35rem', padding: '10px', borderRadius: '10px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)'
                            }}
                        />
                    </label>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Номер або рік
                        <input
                            type="number"
                            min="1"
                            placeholder="необов'язково"
                            value={getSeasonNumber(activeSeason, activeSeasonData) ?? ''}
                            onChange={(e) => updateSeasonField('seasonNumber', e.target.value === '' ? null : Number(e.target.value))}
                            style={{
                                width: '100%', marginTop: '0.35rem', padding: '10px', borderRadius: '10px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)'
                            }}
                        />
                    </label>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Порядок
                        <input
                            type="number"
                            placeholder="автоматично"
                            value={activeSeasonData.sortOrder ?? ''}
                            onChange={(e) => updateSeasonField('sortOrder', e.target.value === '' ? null : Number(e.target.value))}
                            style={{
                                width: '100%', marginTop: '0.35rem', padding: '10px', borderRadius: '10px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)'
                            }}
                        />
                    </label>
                </div>

                {showAddSeason && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Новий навчальний цикл</h3>
                        <div className="admin-cycle-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                            <input
                                type="text"
                                aria-label="Назва нового навчального циклу"
                                placeholder="Наприклад, УМШ Літня школа"
                                value={newSeason.title}
                                onChange={(e) => setNewSeason(prev => ({ ...prev, title: e.target.value }))}
                                style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}
                            />
                            <input
                                type="number"
                                min="1"
                                aria-label="Номер або рік нового навчального циклу"
                                placeholder="Номер або рік"
                                value={newSeason.seasonNumber}
                                onChange={(e) => setNewSeason(prev => ({ ...prev, seasonNumber: e.target.value }))}
                                style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}
                            />
                            <input
                                type="number"
                                aria-label="Порядок нового навчального циклу"
                                placeholder="Порядок (необов.)"
                                value={newSeason.sortOrder}
                                onChange={(e) => setNewSeason(prev => ({ ...prev, sortOrder: e.target.value }))}
                                style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.75rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            <input
                                type="checkbox"
                                checked={newSeason.makeCurrent}
                                onChange={(e) => setNewSeason(prev => ({ ...prev, makeCurrent: e.target.checked }))}
                            />
                            Відкривати цей цикл за замовчуванням
                        </label>
                        {seasonFormError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{seasonFormError}</p>}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={handleAddSeason}
                                style={{ padding: '9px 14px', borderRadius: '10px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600 }}
                            >
                                Додати
                            </button>
                            <button
                                onClick={() => setShowAddSeason(false)}
                                style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)' }}
                            >
                                Скасувати
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="glass fade-in admin-card" style={{ padding: '2rem', borderRadius: '24px', marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 600 }}>Google Script URL (для статистики)</label>
                    <input
                        type="text"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={config.googleScriptUrl || ""}
                        onChange={(e) => setConfig(prev => ({ ...prev, googleScriptUrl: e.target.value }))}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '12px',
                            border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 600 }}>Google Drive API Key</label>
                    <input
                        type="text"
                        placeholder="AIzaSy..."
                        value={config.googleDriveApiKey || ""}
                        onChange={(e) => setConfig(prev => ({ ...prev, googleDriveApiKey: e.target.value }))}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '12px',
                            border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white'
                        }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Цей ключ необхідний для надійної роботи галереї фото. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Як отримати?</a>
                    </p>
                </div>

                <div className="admin-backup-panel" style={{
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Резервна копія конфігурації</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Перед кожним збереженням у цьому браузері створюється локальний бекап попередньої конфігурації.
                            {' '}Локальних бекапів: {backupSummary.count}.
                            {backupSummary.latestLabel ? ` Останній: ${backupSummary.latestLabel}.` : ''}
                        </p>
                    </div>
                    <div className="admin-backup-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={handleExportConfig}
                            style={{
                                flexShrink: 0,
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 600
                            }}
                        >
                            <Download size={16} />
                            Експорт JSON
                        </button>
                        <button
                            type="button"
                            onClick={handleImportConfigClick}
                            style={{
                                flexShrink: 0,
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 600
                            }}
                        >
                            <Upload size={16} />
                            Імпорт JSON
                        </button>
                        <button
                            type="button"
                            onClick={handleRestoreLatestBackup}
                            disabled={backupSummary.count === 0}
                            style={{
                                flexShrink: 0,
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 600,
                                opacity: backupSummary.count === 0 ? 0.5 : 1,
                                cursor: backupSummary.count === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <RotateCcw size={16} />
                            Відновити
                        </button>
                        <input
                            ref={importConfigInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleImportConfigFile}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>
            </div>

            <div className="glass fade-in admin-card admin-session-card" style={{ padding: '2rem', borderRadius: '24px' }}>
                <div className="admin-session-tabs" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '1rem' }}>
                    {["session1", "session2", "session3"].map(session => (
                        <button
                            key={session}
                            onClick={() => setActiveTab(session)}
                            style={{
                                padding: '10px 20px',
                                background: activeTab === session ? 'var(--accent-color)' : 'transparent',
                                color: activeTab === session ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '12px 12px 0 0',
                                fontWeight: 500
                            }}
                        >
                            {session === 'session1' ? 'Сесія 1' : session === 'session2' ? 'Сесія 2' : 'Сесія 3'}
                        </button>
                    ))}
                </div>

                <div className="admin-session-fields" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem', minWidth: 0 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Фото (Google Drive Folder ID)</label>
                        <input
                            type="text"
                            aria-label="Фото сесії"
                            value={config.seasons[activeSeason]?.sessions[activeTab]?.photos || ""}
                            onChange={(e) => updateSessionField(activeTab, 'photos', e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Лекції (YouTube Playlist URL)</label>
                        <input
                            type="text"
                            aria-label="Лекції сесії"
                            placeholder="https://www.youtube.com/playlist?list=..."
                            value={config.seasons[activeSeason]?.sessions[activeTab]?.lectures || ""}
                            onChange={(e) => updateSessionField(activeTab, 'lectures', e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)'
                            }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
                            Вставте посилання на плейлист, щоб автоматично створити галерею відео.
                        </p>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Презентації (Google Drive Folder ID)</label>
                        <input
                            type="text"
                            aria-label="Презентації сесії"
                            value={config.seasons[activeSeason]?.sessions[activeTab]?.presentations || ""}
                            onChange={(e) => updateSessionField(activeTab, 'presentations', e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Програма (URL or PDF Link)</label>
                        <input
                            type="text"
                            aria-label="Програма сесії"
                            value={config.seasons[activeSeason]?.sessions[activeTab]?.program || ""}
                            onChange={(e) => updateSessionField(activeTab, 'program', e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Тести</label>
                        {pendingTestDeletions.length > 0 && (
                            <div style={{
                                marginBottom: '0.75rem',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#f59e0b',
                                fontSize: '0.8rem'
                            }}>
                                {pendingTestDeletions.length === 1
                                    ? '1 тест очікує остаточного видалення після збереження.'
                                    : `${pendingTestDeletions.length} тести очікують остаточного видалення після збереження.`}
                                {' '}Якщо передумали — вийдіть без збереження.
                            </div>
                        )}

                        {/* List of existing tests */}
                        <div className="admin-test-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', minWidth: 0 }}>
                            {Array.isArray(config.seasons[activeSeason]?.sessions[activeTab]?.tests) &&
                                config.seasons[activeSeason]?.sessions[activeTab]?.tests.map((test, index) => (
                                    <div className="admin-test-row" key={test.id || index} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)'
                                    }}>
                                        <div className="admin-test-info" style={{ overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 500 }}>{test.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{test.url}</div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Прибрати тест "${test.name}" із цієї сесії? Файл тесту та його результати будуть остаточно видалені тільки після натискання “Зберегти зміни”.`)) {
                                                    const currentTests = config.seasons[activeSeason].sessions[activeTab].tests;
                                                    const newTests = currentTests.filter((_, i) => i !== index);
                                                    markTestForDeletion(test);
                                                    updateSessionField(activeTab, 'tests', newTests);
                                                    setStatus('');
                                                }
                                            }}
                                            style={{ color: '#ef4444', background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
                                            title="Видалити"
                                        >
                                            <div style={{ width: 18, height: 18, border: '1.5px solid currentColor', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ height: '1.5px', width: '10px', background: 'currentColor', transform: 'rotate(0deg)' }}></span>
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            {(!Array.isArray(config.seasons[activeSeason]?.sessions[activeTab]?.tests) || config.seasons[activeSeason]?.sessions[activeTab]?.tests.length === 0) && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Тестів ще немає</div>
                            )}
                        </div>

                        {/* Add new test form */}
                        <div className="admin-test-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0, padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
                            <div className="test-add-row" style={{ display: 'flex', gap: '12px', minWidth: 0 }}>
                                <input
                                    type="text"
                                    placeholder="Назва тесту (напр. Гідравліка)"
                                    value={newTest.name}
                                    onChange={(e) => setNewTest(prev => ({ ...prev, name: e.target.value }))}
                                    style={{
                                        flex: 1, minWidth: 0, padding: '12px', borderRadius: '10px',
                                        border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white'
                                    }}
                                />
                                <button
                                    onClick={handleAddTest}
                                    disabled={isUploading || (!newTest.name || (!newTest.url && !selectedFile))}
                                    style={{
                                        padding: '0 24px', borderRadius: '10px', border: 'none',
                                        background: 'var(--accent-color)', color: 'white', fontWeight: 600,
                                        opacity: (isUploading || (!newTest.name || (!newTest.url && !selectedFile))) ? 0.5 : 1,
                                        cursor: (isUploading || (!newTest.name || (!newTest.url && !selectedFile))) ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                    {isUploading ? 'Завантаження...' : 'Додати'}
                                </button>
                            </div>

                            <div className="test-form-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem', minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Варіант 1: Завантажити JSON файл (рекомендовано)</label>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        style={{
                                            fontSize: '0.875rem', color: 'var(--text-secondary)',
                                            padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Варіант 2: Вказати URL або шлях</label>
                                    <input
                                        type="text"
                                        placeholder="test.json або https://..."
                                        value={newTest.url}
                                        onChange={(e) => setNewTest(prev => ({ ...prev, url: e.target.value }))}
                                        style={{
                                            padding: '10px', borderRadius: '8px',
                                            border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.875rem'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .admin-card,
        .admin-cycle-grid > *,
        .admin-session-fields > *,
        .admin-test-list,
        .admin-test-row,
        .admin-test-form,
        .test-form-grid > * {
          min-width: 0;
        }

        .admin-container input:not([type="checkbox"]),
        .admin-container select {
          min-width: 0;
          max-width: 100%;
        }

        .admin-test-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .admin-test-row > button,
        .test-add-row > button {
          flex-shrink: 0;
        }

        .admin-session-tabs {
          overflow-x: auto;
          scrollbar-width: none;
        }

        .admin-session-tabs::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 768px) {
          .admin-container {
            padding: 1rem !important;
          }
          .admin-header h1 {
            font-size: 1.25rem;
          }
          .save-button {
             padding: 10px !important;
          }
          .save-button-text {
            display: none;
          }
          .save-button::after {
            content: "${status === 'saved' ? 'Збережено' : hasUnsavedChanges ? 'Зберегти' : 'Без змін'}";
            margin-left: 4px;
            font-size: 0.9rem;
          }
          .glass.fade-in {
            padding: 1rem !important;
            border-radius: 16px !important;
          }
          .test-form-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .test-add-row {
            flex-direction: column;
          }
          .test-add-row > button {
            width: 100%;
            min-height: 44px;
            padding: 10px 16px !important;
            justify-content: center;
          }
          .admin-backup-panel {
            flex-direction: column;
            align-items: stretch !important;
          }
          .admin-backup-actions {
            justify-content: stretch !important;
          }
          .admin-backup-actions > button {
            flex: 1 1 100%;
            justify-content: center;
          }
        }

        @media (max-width: 420px) {
          .admin-header {
            gap: 0.5rem !important;
          }
          .admin-header h1 {
            font-size: 1.1rem;
          }
          .save-button {
            width: 44px;
            height: 44px;
            flex: 0 0 44px;
            justify-content: center;
          }
          .save-button::after {
            display: none;
          }
        }

        @media (max-width: 360px) {
          .admin-header h1 {
            display: none;
          }
        }
      `}</style>
        </div >
    );
}
