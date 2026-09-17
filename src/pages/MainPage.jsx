import { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Image, FileText, Presentation, ClipboardCheck, Settings, Sun, Moon, BarChart2, Menu } from 'lucide-react';
import { getAppConfig, getYoutubeVideoId, getGoogleDriveFolderId, IS_LOCAL_DATA_MODE } from '../firebase';
import { getSeasonLabel, getSortedSeasons } from '../seasonUtils';

const LazyQuizRunner = lazy(() => import('../components/QuizRunner'));
const LazyPhotoGallery = lazy(() => import('../components/PhotoGallery'));
const LazyYoutubeGallery = lazy(() => import('../components/YoutubeGallery'));
const LazyStatisticsView = lazy(() => import('../components/StatisticsView'));

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

function ContentFallback({ label = 'Завантаження...' }) {
    return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            {label}
        </div>
    );
}

export default function MainPage() {
    const [activeSession, setActiveSession] = useState(SESSIONS[0]);
    const [activeAction, setActiveAction] = useState(ACTIONS[0]);
    const [activeSeason, setActiveSeason] = useState("12");
    const [activeQuiz, setActiveQuiz] = useState(null);

    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState('dark');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let unsubscribe = () => {};
        let cancelled = false;

        import('../adminAuth').then(({ subscribeToAdminAuth }) => {
            if (cancelled) return;
            unsubscribe = subscribeToAdminAuth(user => setIsAdmin(Boolean(user)));
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

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
                const initialSeason = data.seasons?.[data.currentSeason]
                    ? data.currentSeason
                    : getSortedSeasons(data.seasons)[0]?.[0];
                if (initialSeason) setActiveSeason(initialSeason);
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
        const activeSeasonLabel = getSeasonLabel(activeSeason, config.seasons[activeSeason]);

        if (activeAction.id === 'photos' || activeAction.id === 'presentations') {
            const rawFolderId = activeAction.id === 'photos' ? currentSessionData.photos : currentSessionData.presentations;
            const folderId = getGoogleDriveFolderId(rawFolderId);

            if (!folderId) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Папка не налаштована в Адмін-панелі.</div>;

            // Use custom gallery only for photos when API key is available
            if (activeAction.id === 'photos' && config.googleDriveApiKey) {
                return <LazyPhotoGallery key={`${activeSeason}-${activeSession}-${folderId}-${config.googleDriveApiKey}`} folderId={folderId} apiKey={config.googleDriveApiKey} />;
            }

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
            let listId = null;
            if (playlistUrl?.includes('list=')) {
                listId = new URLSearchParams(playlistUrl.split('?')[1]).get('list');
            }
            const videoId = getYoutubeVideoId(playlistUrl);

            if (!playlistUrl) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Посилання на YouTube не налаштовано або некоректне.</div>;

            // Grid mode: playlist + API key
            if (listId && config.googleDriveApiKey) {
                return <LazyYoutubeGallery key={`${activeSeason}-${activeSession}-${listId}-${config.googleDriveApiKey}`} listId={listId} apiKey={config.googleDriveApiKey} />;
            }

            // Fallback: single video or no API key
            let embedSrc = listId
                ? `https://www.youtube.com/embed/videoseries?list=${listId}`
                : videoId ? `https://www.youtube.com/embed/${videoId}` : '';

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
                    <LazyQuizRunner
                        testId={activeQuiz.id}
                        testUrl={activeQuiz.url}
                        testName={activeQuiz.name}
                        sessionName={SESSION_LABELS[activeSession]}
                        seasonId={activeSeason}
                        seasonName={activeSeasonLabel}
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
            if (!isAdmin) {
                return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Статистика доступна лише адміністратору.</div>;
            }
            return (
                <LazyStatisticsView
                    key={`${activeSeason}-${activeSession}`}
                    sessionLabel={SESSION_LABELS[activeSession]}
                    activeSeason={activeSeason}
                    seasonName={activeSeasonLabel}
                    tests={currentSessionData.tests}
                />
            );
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 90,
                        backdropFilter: 'blur(4px)'
                    }}
                />
            )}

            {/* Sidebar */}
            <aside className={`main-sidebar glass ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{
                width: 'var(--sidebar-width)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1rem',
                zIndex: 100,
                transition: 'transform 0.3s ease',
                position: 'relative'
            }}>

                <div style={{ marginBottom: '3rem', padding: '0 0.5rem', minWidth: 0 }}>
                    <h1 style={{ fontSize: '1.25rem', lineHeight: 1.25, fontWeight: 'bold', color: 'var(--accent-color)', overflowWrap: 'anywhere' }}>
                        {config?.seasons?.[activeSeason]
                            ? getSeasonLabel(activeSeason, config.seasons[activeSeason])
                            : 'УМШ'}
                    </h1>
                    {config && config.seasons ? (
                        <select
                            value={activeSeason}
                            onChange={(e) => {
                                setActiveSeason(e.target.value);
                                setActiveQuiz(null);
                            }}
                            style={{
                                display: 'block',
                                width: '100%',
                                maxWidth: '100%',
                                minWidth: 0,
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
                            {getSortedSeasons(config.seasons).map(([seasonId, season]) => (
                                <option key={seasonId} value={seasonId}>{getSeasonLabel(seasonId, season)}</option>
                            ))}
                        </select>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>УМШ 12</p>
                    )}
                    {IS_LOCAL_DATA_MODE && (
                        <p style={{ marginTop: '0.5rem', color: '#f59e0b', fontSize: '0.7rem' }}>Локальні тестові дані</p>
                    )}
                </div>

                <nav style={{ flex: 1 }}>
                    {ACTIONS.filter(action => action.id !== 'statistics' || isAdmin).map(action => (
                        <button
                            key={action.id}
                            onClick={() => {
                                setActiveAction(action);
                                setActiveQuiz(null);
                                setIsMobileMenuOpen(false);
                            }}
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

                <Link to="/admin" style={{
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
                </Link>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', overflow: 'hidden' }}>
                {/* Header */}
                <header className="glass header-responsive" style={{
                    height: 'var(--header-height)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '0 1rem'
                }}>
                    {/* Mobile Menu Toggle */}
                    <button
                        className="mobile-only"
                        aria-label="Відкрити меню"
                        aria-expanded={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen(true)}
                        style={{
                            position: 'absolute',
                            left: '1rem',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-primary)',
                            padding: '8px'
                        }}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="no-scrollbar" style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        padding: '4px',
                        maxWidth: '100%',
                        justifyContent: 'center'
                    }}>
                        {SESSIONS.map(session => (
                            <button
                                key={session}
                                onClick={() => {
                                    setActiveSession(session);
                                    setActiveQuiz(null);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '99px',
                                    border: activeSession === session ? '1px solid var(--accent-color)' : '1px solid transparent',
                                    background: activeSession === session ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface-color)',
                                    color: activeSession === session ? 'var(--accent-color)' : 'var(--text-secondary)',
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {SESSION_LABELS[session].replace('Сесія', 'С')}
                            </button>
                        ))}
                    </div>

                    <div className="mobile-only" style={{ width: '40px' }} /> {/* Spacer to balance header */}
                </header>

                {/* Content Area */}
                <div className="content-padding" style={{ flex: 1, padding: '2rem', overflow: 'hidden' }}>
                    <div className="glass fade-in" style={{
                        height: '100%',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div className={`section-header ${activeAction.id === 'tests' ? 'tests-header' : ''}`} style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--glass-border)',
                            display: (activeAction.id === 'tests' && !activeQuiz) || activeAction.id === 'photos' ? 'none' : 'block'
                        }}>
                            <h2 style={{ fontSize: '1.25rem' }}>
                                {activeAction.id === 'tests' && activeQuiz
                                    ? activeQuiz.name
                                    : `${SESSION_LABELS[activeSession]} — ${activeAction.label}`}
                            </h2>
                        </div>

                        <div style={{ flex: 1, background: 'var(--bg-color)', overflowY: 'auto', position: 'relative' }}>
                            {loading ? (
                                <ContentFallback />
                            ) : (
                                <Suspense fallback={<ContentFallback label="Завантаження розділу..." />}>
                                    {renderContent()}
                                </Suspense>
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

        @media (max-width: 1024px) {
          .main-sidebar {
            position: fixed !important;
            height: 100vh;
            width: min(320px, 88vw) !important;
            max-width: 88vw;
            transform: translateX(-100%);
          }
          .main-sidebar.mobile-open {
            transform: translateX(0);
          }
          .header-responsive {
            justify-content: center;
          }
          .mobile-only {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
        }

        @media (min-width: 1025px) {
          .mobile-only {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .content-padding {
            padding: 1rem !important;
          }
          .glass.fade-in {
            border-radius: 16px !important;
          }
          .tests-header {
            display: none !important;
          }
        }
      `}</style>
        </div >
    );
}
