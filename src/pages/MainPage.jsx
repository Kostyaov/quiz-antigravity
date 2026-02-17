import { useState, useEffect } from 'react';

import { Layout, Image, FileText, Presentation, ClipboardCheck, Settings, LogOut, Sun, Moon, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { getAppConfig, getYoutubeVideoId, getGoogleDriveFolderId, getTestResults } from '../firebase';
import QuizRunner from '../components/QuizRunner';

const SESSIONS = ["session1", "session2", "session3"];
const SESSION_LABELS = { "session1": "Сесія 1", "session2": "Сесія 2", "session3": "Сесія 3" };
const ACTIONS = [
    { id: 'program', label: 'Програма', icon: FileText, folder: 'програма' },
    { id: 'photos', label: 'Фото', icon: Image, folder: 'фото' },
    { id: 'lectures', label: 'Лекції', icon: FileText, folder: 'лекції' },
    { id: 'presentations', label: 'Презентації', icon: Presentation, folder: 'презентації' },
    { id: 'tests', label: 'Тести', icon: ClipboardCheck, folder: 'тести' },
    { id: 'statistics', label: 'Статистика', icon: BarChart2, folder: 'статистика' },
];


export default function MainPage() {
    const [activeSession, setActiveSession] = useState(SESSIONS[0]);
    const [activeAction, setActiveAction] = useState(ACTIONS[0]);
    const [activeSeason, setActiveSeason] = useState("12");
    const [activeQuiz, setActiveQuiz] = useState(null);

    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState('dark');

    // Reset active quiz when switching session or tab
    useEffect(() => {
        setActiveQuiz(null);
    }, [activeSession, activeAction]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        getAppConfig().then(data => {
            if (data) {
                setConfig(data);
                if (data.currentSeason) setActiveSeason(data.currentSeason);
            }
            setLoading(false);
        });
    }, []);

    // Helper to generate Google Drive Embed URL
    // This is a common pattern for Google Drive folder embedding
    // Mode: list (grid view usually requires different API or specific param)
    const renderContent = () => {
        if (!config) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Конфігурація не знайдена. Перейдіть в Адмін-панель.</div>;


        const currentSessionData = config.seasons[activeSeason]?.sessions[activeSession];
        if (!currentSessionData) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Дані для цієї сесії відсутні.</div>;

        if (activeAction.id === 'photos' || activeAction.id === 'presentations') {
            const rawFolderId = activeAction.id === 'photos' ? currentSessionData.photos : currentSessionData.presentations;
            const folderId = getGoogleDriveFolderId(rawFolderId);

            if (!folderId) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Папка не налаштована в Адмін-панелі.</div>;
            return (
                <iframe
                    src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 'none' }}
                ></iframe>
            );
        }

        if (activeAction.id === 'lectures') {
            const playlistUrl = currentSessionData.lectures;
            const videoId = getYoutubeVideoId(playlistUrl); // Works for single videos too but tailored for playlists usually
            // For playlists standard embed is https://www.youtube.com/embed/videoseries?list=PLAYLIST_ID
            // But we need to parse what user entered.
            // If it is a playlist ID or URL:
            let embedSrc = "";
            if (playlistUrl?.includes('list=')) {
                const listId = new URLSearchParams(playlistUrl.split('?')[1]).get('list');
                embedSrc = `https://www.youtube.com/embed/videoseries?list=${listId}`;
            } else if (videoId) {
                embedSrc = `https://www.youtube.com/embed/${videoId}`;
            }

            if (!embedSrc) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Посилання на YouTube не налаштовано або некоректне.</div>;

            return (
                <iframe
                    width="100%"
                    height="100%"
                    src={embedSrc}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: 'none' }}
                ></iframe>
            );
        }

        if (activeAction.id === 'program') {
            const programUrl = currentSessionData.program;
            if (!programUrl) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Посилання на програму не налаштовано.</div>;

            // Helper to transform GD view link to preview for embedding
            // e.g., .../view?usp=sharing -> .../preview
            let embedUrl = programUrl;
            if (programUrl.includes('drive.google.com') && programUrl.includes('/view')) {
                embedUrl = programUrl.replace('/view', '/preview');
            }

            return (
                <iframe
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 'none' }}
                ></iframe>
            );
        }

        if (activeAction.id === 'tests') {
            if (activeQuiz) {
                return (
                    <QuizRunner
                        testId={activeQuiz.id}
                        testUrl={activeQuiz.url}
                        testName={activeQuiz.name}
                        sessionName={SESSION_LABELS[activeSession]}
                        googleScriptUrl={config.googleScriptUrl}
                        onBack={() => setActiveQuiz(null)}
                    />
                );
            }

            const tests = currentSessionData.tests;

            if (!tests || (Array.isArray(tests) && tests.length === 0)) {
                return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Тести ще не додані.</div>;
            }

            if (typeof tests === 'string') {
                return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>{tests}</div>;
            }

            return (
                <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {tests.map(test => (
                        <div key={test.id} className="glass" style={{
                            padding: '1.5rem',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            transition: 'transform 0.2s',
                            cursor: 'pointer'
                        }}
                            onClick={() => setActiveQuiz(test)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{
                                width: '48px', height: '48px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--accent-color)'
                            }}>
                                <ClipboardCheck size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{test.name}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Натисніть, щоб розпочати тест</p>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (activeAction.id === 'statistics') {
            return <StatisticsView activeSession={activeSession} activeSeason={activeSeason} />;
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
            {/* Sidebar */}
            <aside className="glass" style={{
                width: 'var(--sidebar-width)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1rem',
                zIndex: 10
            }}>

                <div style={{ marginBottom: '3rem', padding: '0 1rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>УМШ</h1>
                    {config && config.seasons ? (
                        <select
                            value={activeSeason}
                            onChange={(e) => setActiveSeason(e.target.value)}
                            style={{
                                marginTop: '0.5rem',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.875rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {Object.keys(config.seasons).sort((a, b) => Number(a) - Number(b)).map(season => (
                                <option key={season} value={season}>Сезон {season}</option>
                            ))}
                        </select>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Сезон 12</p>
                    )}
                </div>

                <nav style={{ flex: 1 }}>
                    {ACTIONS.map(action => (
                        <button
                            key={action.id}
                            onClick={() => setActiveAction(action)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                marginBottom: '8px',
                                borderRadius: '12px',
                                border: 'none',
                                background: activeAction.id === action.id ? 'var(--accent-color)' : 'transparent',
                                color: activeAction.id === action.id ? 'white' : 'var(--text-secondary)',
                                textAlign: 'left'
                            }}
                        >
                            <action.icon size={20} />
                            <span style={{ fontWeight: 500 }}>{action.label}</span>
                        </button>
                    ))}
                </nav>

                <button
                    onClick={toggleTheme}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '0.875rem',
                        marginBottom: '8px',
                        width: '100%',
                        textAlign: 'left'
                    }}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    {theme === 'dark' ? 'Світла тема' : 'Темна тема'}
                </button>

                <a href="/admin" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '0.875rem'
                }}>
                    <Settings size={18} />
                    Адмін панель
                </a>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Header */}
                <header className="glass" style={{
                    height: 'var(--header-height)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    padding: '0 2rem'
                }}>
                    {SESSIONS.map(session => (
                        <button
                            key={session}
                            onClick={() => setActiveSession(session)}
                            style={{
                                padding: '8px 24px',
                                borderRadius: '99px',
                                border: activeSession === session ? '1px solid var(--accent-color)' : '1px solid transparent',
                                background: activeSession === session ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface-color)',
                                color: activeSession === session ? 'var(--accent-color)' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.875rem'
                            }}
                        >
                            {SESSION_LABELS[session]}
                        </button>
                    ))}
                </header>

                {/* Content Area */}
                <div style={{ flex: 1, padding: '2rem', overflow: 'hidden' }}>
                    <div className="glass fade-in" style={{
                        height: '100%',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                            <h2 style={{ fontSize: '1.25rem' }}>{SESSION_LABELS[activeSession]} — {activeAction.label}</h2>
                        </div>

                        <div style={{ flex: 1, background: 'var(--bg-color)' }}>
                            {loading ? (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justify: 'center' }}>
                                    Завантаження...
                                </div>
                            ) : (
                                renderContent()
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
        button:hover {
          background: var(--surface-hover);
          transform: translateY(-1px);
        }
      `}</style>
        </div >
    );
}

function StatisticsView({ activeSession, activeSeason }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTests, setExpandedTests] = useState({}); // { testName: boolean }

    useEffect(() => {
        getTestResults().then(data => {
            const sessionLabel = SESSION_LABELS[activeSession];
            const filtered = data.filter(r => r.sessionName === sessionLabel);

            // Deduplicate: same user, same test, same score, same minute
            const unique = [];
            const seen = new Set();
            filtered.forEach(r => {
                // Key includes timestamp truncated to the minute to catch double submissions
                const minuteStamp = r.timestamp ? r.timestamp.substring(0, 16) : '';
                const key = `${r.userName}-${r.testId || r.testName}-${r.score}-${minuteStamp}`;
                if (!seen.has(key)) {
                    unique.push(r);
                    seen.add(key);
                }
            });

            setResults(unique);
            setLoading(false);
        });
    }, [activeSession]);

    const toggleExpand = (testName) => {
        setExpandedTests(prev => ({
            ...prev,
            [testName]: !prev[testName]
        }));
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Завантаження статистики...</div>;

    if (results.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <BarChart2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>Статистика для цієї сесії поки порожня.</p>
            </div>
        );
    }

    // --- Aggregate Stats ---
    const totalRespondents = new Set(results.map(r => r.userName)).size;
    const scores = results.map(r => r.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // --- Grouping by Test Name ---
    const groupedResults = results.reduce((acc, curr) => {
        if (!acc[curr.testName]) acc[curr.testName] = [];
        acc[curr.testName].push(curr);
        return acc;
    }, {});

    const testSummaries = Object.keys(groupedResults).map(testName => {
        const testGroup = groupedResults[testName];
        const testAvg = Math.round(testGroup.reduce((acc, curr) => acc + curr.score, 0) / testGroup.length);
        return { name: testName, avg: testAvg, attempts: testGroup };
    });

    return (
        <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
            {/* Aggregate Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass" style={{ padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Усього респондентів</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{totalRespondents}</div>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Середній бал</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{avgScore}%</div>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Найвищий бал</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{maxScore}%</div>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Найнижчий бал</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>{minScore}%</div>
                </div>
            </div>

            {/* Test List */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {testSummaries.map((test, idx) => (
                    <div key={idx} style={{ transition: 'all 0.3s ease' }}>
                        {/* Summary Row */}
                        <div
                            className="glass"
                            onClick={() => toggleExpand(test.name)}
                            style={{
                                padding: '1.25rem 1.5rem',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                border: expandedTests[test.name] ? '1px solid var(--accent-color)' : '1px solid var(--glass-border)',
                                background: expandedTests[test.name] ? 'rgba(99, 102, 241, 0.05)' : 'var(--glass-bg)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {expandedTests[test.name] ? <ChevronDown size={20} /> : <ChevronUp style={{ transform: 'rotate(90deg)' }} size={20} />}
                                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{test.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Середній результат</div>
                                    <div style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{test.avg}%</div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table (Expanded) */}
                        {expandedTests[test.name] && (
                            <div className="fade-in" style={{
                                marginTop: '0.5rem',
                                marginLeft: '1rem',
                                background: 'rgba(0,0,0,0.1)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                borderLeft: '3px solid var(--accent-color)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                            <th style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>Користувач</th>
                                            <th style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>Результат</th>
                                            <th style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>Дата</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {test.attempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((res, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                <td style={{ padding: '10px 16px', fontWeight: 500 }}>{res.userName}</td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        background: res.score >= 60 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: res.score >= 60 ? '#10b981' : '#ef4444',
                                                        fontWeight: 600
                                                    }}>
                                                        {res.score}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                    {new Date(res.timestamp).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
