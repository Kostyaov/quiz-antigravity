import { useState, useEffect } from 'react';
import { Lock, Save, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { getAppConfig, saveAppConfig, ADMIN_PASSWORD } from '../firebase';

export default function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [config, setConfig] = useState({
        currentSeason: "12",
        seasons: {
            "12": {
                sessions: {
                    "session1": { photos: "", lectures: "", presentations: "", tests: [], program: "" },
                    "session2": { photos: "", lectures: "", presentations: "", tests: [], program: "" },
                    "session3": { photos: "", lectures: "", presentations: "", tests: [], program: "" }
                }
            }
        }
    });
    const [activeTab, setActiveTab] = useState("session1");
    const [activeSeason, setActiveSeason] = useState("12");
    const [status, setStatus] = useState(''); // '', 'saving', 'saved', 'error'
    const [error, setError] = useState('');

    useEffect(() => {
        if (isLoggedIn) {
            getAppConfig().then(data => {
                if (data) setConfig(data);
            });
        }
    }, [isLoggedIn]);

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

    const handleAddSeason = () => {
        const newSeason = prompt("Введіть номер нового сезону (наприклад, 13):");
        if (newSeason && !config.seasons[newSeason]) {
            setConfig(prev => ({
                ...prev,
                seasons: {
                    ...prev.seasons,
                    [newSeason]: {
                        sessions: {
                            "session1": { photos: "", lectures: "", presentations: "", tests: [], program: "" },
                            "session2": { photos: "", lectures: "", presentations: "", tests: [], program: "" },
                            "session3": { photos: "", lectures: "", presentations: "", tests: [], program: "" }
                        }
                    }
                }
            }));
            setActiveSeason(newSeason);
        } else if (config.seasons[newSeason]) {
            alert("Цей сезон вже існує!");
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsLoggedIn(true);
            setError('');
        } else {
            setError('Невірний пароль');
        }
    };

    const handleSave = async () => {
        setStatus('saving');
        try {
            await saveAppConfig(config);
            setStatus('saved');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus('error');
        }
    };

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
                        Будь ласка, введіть пароль для доступу
                    </p>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="password"
                            placeholder="Пароль"
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
                        <button type="submit" style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--accent-color)',
                            color: 'white',
                            fontWeight: 600
                        }}>
                            Увійти
                        </button>
                    </form>

                    <a href="/" style={{ display: 'inline-block', marginTop: '2rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>
                        Повернутися на головну
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="/" style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={24} /></a>
                    <h1 style={{ fontSize: '1.5rem' }}>Налаштування</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={status === 'saving'}
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
                        opacity: status === 'saving' ? 0.7 : 1
                    }}
                >
                    {status === 'saving' ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {status === 'saved' ? 'Збережено' : 'Зберегти зміни'}
                </button>
            </header>

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <select
                    value={activeSeason}
                    onChange={(e) => setActiveSeason(e.target.value)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--surface-color)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        outline: 'none'
                    }}
                >
                    {Object.keys(config.seasons).sort((a, b) => Number(a) - Number(b)).map(season => (
                        <option key={season} value={season}>Сезон {season}</option>
                    ))}
                </select>
                <button
                    onClick={handleAddSeason}
                    style={{
                        padding: '10px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Додати сезон"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="glass fade-in" style={{ padding: '2rem', borderRadius: '24px', marginBottom: '2rem' }}>
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Цей URL буде використано для всіх сесій для відправки результатів у Google Sheets.
                </p>
            </div>

            <div className="glass fade-in" style={{ padding: '2rem', borderRadius: '24px' }}>
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '1rem' }}>
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

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Фото (Google Drive Folder ID)</label>
                        <input
                            type="text"
                            value={config.seasons[activeSeason]?.sessions[activeTab]?.photos || ""}
                            onChange={(e) => updateSessionField(activeTab, 'photos', e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Лекції (YouTube Playlist URL)</label>
                        <input
                            type="text"
                            value={config.seasons[activeSeason]?.sessions[activeTab]?.lectures || ""}
                            onChange={(e) => updateSessionField(activeTab, 'lectures', e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Презентації (Google Drive Folder ID)</label>
                        <input
                            type="text"
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

                        {/* List of existing tests */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                            {Array.isArray(config.seasons[activeSeason]?.sessions[activeTab]?.tests) &&
                                config.seasons[activeSeason]?.sessions[activeTab]?.tests.map((test, index) => (
                                    <div key={test.id || index} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)'
                                    }}>
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 500 }}>{test.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{test.url}</div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const currentTests = config.seasons[activeSeason].sessions[activeTab].tests;
                                                const newTests = currentTests.filter((_, i) => i !== index);
                                                updateSessionField(activeTab, 'tests', newTests);
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
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <input
                                type="text"
                                placeholder="Назва тесту"
                                id="new-test-name"
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '8px',
                                    border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.875rem'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="URL JSON файлу"
                                id="new-test-url"
                                style={{
                                    flex: 2, padding: '10px', borderRadius: '8px',
                                    border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.875rem'
                                }}
                            />
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', width: '100%', marginTop: '4px' }}>
                                💡 Файли тестів мають зберігатися в папці <code>/public/tests/</code>. Вводьте тільки назву файлу.
                            </div>
                            <button
                                onClick={() => {
                                    const nameInput = document.getElementById('new-test-name');
                                    const urlInput = document.getElementById('new-test-url');
                                    const name = nameInput.value.trim();
                                    const url = urlInput.value.trim();

                                    if (name && url) {
                                        const currentTests = config.seasons[activeSeason]?.sessions[activeTab]?.tests;
                                        // Ensure it's an array (handle migration from string if needed, though we default to [])
                                        const testsArray = Array.isArray(currentTests) ? currentTests : [];

                                        const newTest = {
                                            id: crypto.randomUUID(), // Standard UUID
                                            name,
                                            url,
                                            createdAt: Date.now()
                                        };

                                        updateSessionField(activeTab, 'tests', [...testsArray, newTest]);

                                        // Clear inputs
                                        nameInput.value = '';
                                        urlInput.value = '';
                                    } else {
                                        alert("Будь ласка, заповніть назву та URL");
                                    }
                                }}
                                style={{
                                    padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                                    background: 'var(--accent-color)', color: 'white', cursor: 'pointer'
                                }}
                            >
                                <Plus size={18} />
                            </button>
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
      `}</style>
        </div >
    );
}
