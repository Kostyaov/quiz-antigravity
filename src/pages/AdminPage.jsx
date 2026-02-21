import { useState, useEffect } from 'react';
import { Lock, Save, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { getAppConfig, saveAppConfig, ADMIN_PASSWORD, deleteTestResults, saveQuizContent, deleteQuizContent } from '../firebase';

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
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [newTest, setNewTest] = useState({ name: '', url: '' });

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
                        } catch (err) {
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
        <div className="admin-container" style={{ minHeight: '100vh', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <header className="admin-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="/" style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={24} /></a>
                    <h1 style={{ fontSize: '1.5rem' }}>Налаштування</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={status === 'saving'}
                    className="save-button"
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
                        opacity: status === 'saving' ? 0.7 : 1,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {status === 'saving' ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span className="save-button-text">{status === 'saved' ? 'Збережено' : 'Зберегти зміни'}</span>
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
                                            onClick={async () => {
                                                if (window.confirm(`Ви впевнені, що хочете видалити тест "${test.name}"? Всі результати цього тесту в базі даних та сам файл тесту також будуть видалені. Цю дію неможливо скасувати.`)) {
                                                    try {
                                                        // 1. Delete Results from Firebase
                                                        await deleteTestResults(test.id);

                                                        // 2. Delete Quiz Content from Firebase if applicable
                                                        if (test.url && test.url.startsWith('fb:')) {
                                                            const quizId = test.url.substring(3);
                                                            await deleteQuizContent(quizId);
                                                        }

                                                        // 3. Update configuration
                                                        const currentTests = config.seasons[activeSeason].sessions[activeTab].tests;
                                                        const newTests = currentTests.filter((_, i) => i !== index);
                                                        updateSessionField(activeTab, 'tests', newTests);
                                                    } catch (err) {
                                                        alert("Помилка при видаленні: " + err.message);
                                                    }
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Назва тесту (напр. Гідравліка)"
                                    value={newTest.name}
                                    onChange={(e) => setNewTest(prev => ({ ...prev, name: e.target.value }))}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '10px',
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

                            <div className="test-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            content: "${status === 'saved' ? 'Збережено' : 'Зберегти'}";
            margin-left: 4px;
            font-size: 0.9rem;
          }
          .glass.fade-in {
            padding: 1rem !important;
            border-radius: 16px !important;
          }
          .test-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div >
    );
}
