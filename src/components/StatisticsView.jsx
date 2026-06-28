import { useEffect, useState } from 'react';
import { BarChart2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { getTestResults } from '../firebase';

const CSV_SEPARATOR = ';';

const escapeCsvCell = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value).replace(/\r?\n|\r/g, ' ');
    if (text.includes(CSV_SEPARATOR) || text.includes('"')) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return date.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const safeFilePart = (value) => String(value || 'statistics')
    .trim()
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'statistics';

export default function StatisticsView({ sessionLabel, activeSeason, seasonName, tests }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTests, setExpandedTests] = useState({}); // { testName: boolean }

    useEffect(() => {
        let cancelled = false;

        getTestResults().then(data => {
            const currentTests = Array.isArray(tests) ? tests : [];
            const currentTestIds = new Set(currentTests.map(test => test.id).filter(Boolean));
            const currentTestNames = new Set(currentTests.map(test => test.name).filter(Boolean));
            const filtered = data.filter(result => {
                if (result.sessionName !== sessionLabel) return false;
                if (result.seasonId) return result.seasonId === activeSeason;

                // Старі результати не мають seasonId. Прив'язуємо їх до циклу
                // через тести поточної сесії, щоб не змішувати всі сезони разом.
                return currentTestIds.has(result.testId) || currentTestNames.has(result.testName);
            });

            // Deduplicate: same user, same test, same score, same minute.
            const unique = [];
            const seen = new Set();
            filtered.forEach(result => {
                const minuteStamp = result.timestamp ? result.timestamp.substring(0, 16) : '';
                const key = `${result.userName}-${result.testId || result.testName}-${result.score}-${minuteStamp}`;
                if (!seen.has(key)) {
                    unique.push(result);
                    seen.add(key);
                }
            });

            if (cancelled) return;
            setResults(unique);
            setLoading(false);
        }).catch(error => {
            if (cancelled) return;
            console.error('Failed to load statistics:', error);
            setResults([]);
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [activeSeason, sessionLabel, tests]);

    const toggleExpand = (testName) => {
        setExpandedTests(prev => ({
            ...prev,
            [testName]: !prev[testName]
        }));
    };

    const handleExportCsv = () => {
        const headers = [
            'Навчальний цикл',
            'Сесія',
            'Тест',
            'Користувач',
            'Результат (%)',
            'Правильних відповідей',
            'Усього питань',
            'Дата і час'
        ];
        const sortedResults = [...results].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const rows = sortedResults.map(result => [
            seasonName || activeSeason,
            sessionLabel,
            result.testName || '',
            result.userName || '',
            result.score ?? '',
            result.correctAnswers ?? '',
            result.totalQuestions ?? '',
            formatDateTime(result.timestamp)
        ]);
        const csv = [
            'sep=;',
            headers.map(escapeCsvCell).join(CSV_SEPARATOR),
            ...rows.map(row => row.map(escapeCsvCell).join(CSV_SEPARATOR))
        ].join('\r\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const datePart = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `statistics-${safeFilePart(seasonName || activeSeason)}-${safeFilePart(sessionLabel)}-${datePart}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
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

    const totalRespondents = new Set(results.map(result => result.userName)).size;
    const scores = results.map(result => result.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    const groupedResults = results.reduce((acc, current) => {
        if (!acc[current.testName]) acc[current.testName] = [];
        acc[current.testName].push(current);
        return acc;
    }, {});

    const testSummaries = Object.keys(groupedResults).map(testName => {
        const testGroup = groupedResults[testName];
        const testAvg = Math.round(testGroup.reduce((acc, current) => acc + current.score, 0) / testGroup.length);
        return { name: testName, avg: testAvg, attempts: testGroup };
    });

    return (
        <div className="fade-in" style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                    type="button"
                    onClick={handleExportCsv}
                    style={{
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
                    Експорт CSV
                </button>
            </div>

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

            <div style={{ display: 'grid', gap: '1rem' }}>
                {testSummaries.map(test => (
                    <div key={test.name} style={{ transition: 'all 0.3s ease' }}>
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

                        {expandedTests[test.name] && (
                            <div className="fade-in" style={{
                                marginTop: '0.5rem',
                                marginLeft: '0.5rem',
                                background: 'rgba(0,0,0,0.1)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                borderLeft: '3px solid var(--accent-color)'
                            }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', minWidth: '400px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                                <th style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>Користувач</th>
                                                <th style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>Результат</th>
                                                <th style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>Дата</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {test.attempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((result, index) => (
                                                <tr key={`${result.userName}-${result.timestamp}-${index}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>{result.userName}</td>
                                                    <td style={{ padding: '10px 16px' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            background: result.score >= 60 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                            color: result.score >= 60 ? '#10b981' : '#ef4444',
                                                            fontWeight: 600
                                                        }}>
                                                            {result.score}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                        {formatDateTime(result.timestamp)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
