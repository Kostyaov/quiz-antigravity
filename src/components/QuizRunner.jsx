
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { getGoogleDriveDirectLink, saveTestResult, getQuizContent } from '../firebase';

const STORAGE_PREFIX = 'quiz_v1_';

const getGoogleSheetName = (seasonName, sessionName) => {
    const combinedName = [seasonName, sessionName].filter(Boolean).join(' — ') || 'Загальне';
    const forbiddenCharacters = new Set(['\\', '/', ':', '?', '*', '[', ']']);
    return Array.from(combinedName, character => forbiddenCharacters.has(character) ? '-' : character)
        .join('')
        .slice(0, 100);
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const calculateScore = (currentAnswers, quiz) => {
    let correct = 0;
    currentAnswers.forEach((ansIndex, qIndex) => {
        if (ansIndex !== null && quiz[qIndex].answerOptions[ansIndex].isCorrect) {
            correct++;
        }
    });
    return Math.round((correct / quiz.length) * 100);
};

export default function QuizRunner({ testId, testUrl, testName, sessionName, seasonId, seasonName, googleScriptUrl, onBack }) {
    const [quizData, setQuizData] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [hints, setHints] = useState([]); // Array of booleans
    const [isCompleted, setIsCompleted] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState('quiz'); // 'quiz' or 'results'
    const [startTime, setStartTime] = useState(null);
    const [userName, setUserName] = useState(localStorage.getItem('user_name') || '');
    const [showNamePrompt, setShowNamePrompt] = useState(() => !localStorage.getItem('user_name'));
    const [finishing, setFinishing] = useState(false);
    const finishGuardRef = useRef(false);

    // Initial Load
    useEffect(() => {
        const loadQuiz = async () => {
            setLoading(true);
            const initializeQuizState = (length) => {
                setAnswers(new Array(length).fill(null));
                setHints(new Array(length).fill(false));
                setCurrentQuestionIndex(0);
                setStartTime(Date.now());
                setIsCompleted(false);
                setView('quiz');
                setScore(0);
            };
            try {
                // 1. Fetch Quiz Data
                let data;

                if (testUrl.startsWith('fb:')) {
                    const quizId = testUrl.substring(3);
                    data = await getQuizContent(quizId);
                    if (!data) {
                        throw new Error(`Вміст тесту не знайдено в Firebase (ID: ${quizId}).`);
                    }
                } else {
                    let normalizedUrl = testUrl.trim();

                    // If the URL is just a filename (no slash and no http), prepend /tests/
                    if (!normalizedUrl.includes('/') && !normalizedUrl.includes('://')) {
                        normalizedUrl = `/tests/${normalizedUrl}`;
                    }

                    // Common mistake: including '/public/' in the path
                    if (normalizedUrl.startsWith('/public/')) {
                        normalizedUrl = normalizedUrl.replace('/public/', '/');
                    } else if (normalizedUrl.startsWith('public/')) {
                        normalizedUrl = normalizedUrl.replace('public/', '/');
                    }

                    const baseUrl = import.meta.env.BASE_URL || '/';
                    if (normalizedUrl.startsWith('/') && baseUrl !== '/' && !normalizedUrl.startsWith(baseUrl)) {
                        normalizedUrl = `${baseUrl.replace(/\/$/, '')}${normalizedUrl}`;
                    }

                    // Convert Google Drive view links to direct download links if necessary
                    let directUrl = getGoogleDriveDirectLink(normalizedUrl);

                    console.log("Fetching quiz from:", directUrl);

                    let response;
                    try {
                        response = await fetch(directUrl);

                        // Fallback for Google Drive CORS issues
                        if (!response.ok && directUrl.includes('drive.google.com')) {
                            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
                            response = await fetch(proxyUrl);
                        }
                    } catch (fetchErr) {
                        if (directUrl.includes('drive.google.com')) {
                            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
                            response = await fetch(proxyUrl);
                        } else {
                            throw fetchErr;
                        }
                    }

                    if (!response.ok) {
                        if (response.status === 404) {
                            throw new Error(`Файл не знайдено за адресою: ${directUrl}. Перевірте шлях в адмінці.`);
                        }
                        throw new Error(`Помилка сервера (${response.status}): Не вдалося завантажити дані тесту.`);
                    }

                    // Check if the response is actually a JSON file
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("text/html")) {
                        throw new Error(`Замість JSON отримано HTML. Можливо, шлях "${directUrl}" вказано неправильно і сервер повернув головну сторінку.`);
                    }

                    data = await response.json();
                }

                if (!data.quiz || !Array.isArray(data.quiz)) {
                    throw new Error('Неправильний формат файлу тесту (відсутнє поле "quiz").');
                }

                // Shuffle answers for each question
                const shuffledQuiz = data.quiz.map(q => ({
                    ...q,
                    answerOptions: shuffleArray([...q.answerOptions])
                }));

                setQuizData({ ...data, quiz: shuffledQuiz });

                // 2. Load Progress from LocalStorage
                const storageKey = `${STORAGE_PREFIX}${testId}`;
                const savedState = localStorage.getItem(storageKey);

                if (savedState) {
                    const state = JSON.parse(savedState);
                    // Basic validation to ensure state matches current quiz
                    if (state.answers && state.answers.length === data.quiz.length) {
                        setAnswers(state.answers);
                        setHints(state.hints || new Array(data.quiz.length).fill(false));
                        setCurrentQuestionIndex(state.currentQuestionIndex || 0);
                        setStartTime(state.startTime || Date.now());

                        if (state.isCompleted) {
                            setIsCompleted(true);
                            setView(state.view || 'results'); // Fallback to results if completed
                            // Recalculate score just in case
                            const calculatedScore = calculateScore(state.answers, data.quiz);
                            setScore(calculatedScore);
                        }
                    } else {
                        // Reset if length mismatch
                        initializeQuizState(data.quiz.length);
                    }
                } else {
                    initializeQuizState(data.quiz.length);
                }

            } catch (err) {
                console.error("Error loading quiz:", err);
                setError(err.message || "Failed to load quiz");
            } finally {
                setLoading(false);
            }
        };

        loadQuiz();
    }, [testId, testUrl]);

    // Save State Effect
    useEffect(() => {
        if (!quizData) return;

        const state = {
            answers,
            hints,
            currentQuestionIndex,
            isCompleted,
            view,
            startTime
        };
        localStorage.setItem(`${STORAGE_PREFIX}${testId}`, JSON.stringify(state));
    }, [answers, hints, currentQuestionIndex, isCompleted, quizData, testId, startTime, view]);

    const handleAnswer = (optionIndex) => {
        if (isCompleted || answers[currentQuestionIndex] !== null) return;

        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setAnswers(newAnswers);
    };

    const toggleHint = () => {
        const newHints = [...hints];
        newHints[currentQuestionIndex] = !newHints[currentQuestionIndex];
        setHints(newHints);
    };

    const handleNext = () => {
        if (currentQuestionIndex < quizData.quiz.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleFinish = async () => {
        if (finishGuardRef.current || isCompleted) return;
        finishGuardRef.current = true;
        setFinishing(true);

        const calculatedScore = calculateScore(answers, quizData.quiz);
        setScore(calculatedScore);
        setIsCompleted(true);
        setView('results');

        // Send to Google Sheets if configured
        if (googleScriptUrl) {
            try {
                const payload = {
                    testName: testName || "Без назви",
                    sessionName: getGoogleSheetName(seasonName, sessionName),
                    sessionLabel: sessionName || "Загальна",
                    seasonId: seasonId || "legacy",
                    seasonName: seasonName || "Без навчального циклу",
                    userName: userName || "Анонім",
                    score: calculatedScore,
                    correctAnswers: answers.filter((ans, i) => ans !== null && quizData.quiz[i].answerOptions[ans].isCorrect).length,
                    totalQuestions: quizData.quiz.length,
                    timestamp: new Date().toISOString()
                };

                // Use no-cors mode for Google Script if necessary, but Apps Script usually works with fetch + POST
                // Wait, Apps Script redirects, so standard fetch usually handles it if deployed correctly.
                await fetch(googleScriptUrl, {
                    method: 'POST',
                    mode: 'no-cors', // Google Apps Script often requires no-cors if not returning proper headers
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                console.log("Result sent to GS");
            } catch (err) {
                console.error("Failed to send results to Google Sheets:", err);
            }
        }

        // 2. Send to Firebase results branch
        try {
            const firebasePayload = {
                testId: testId || "unknown",
                testName: testName || "Без назви",
                sessionName: sessionName || "Загальна",
                seasonId: seasonId || "legacy",
                seasonName: seasonName || "Без навчального циклу",
                userName: userName || "Анонім",
                score: calculatedScore,
                correctAnswers: answers.filter((ans, i) => ans !== null && quizData.quiz[i].answerOptions[ans].isCorrect).length,
                totalQuestions: quizData.quiz.length,
                timestamp: new Date().toISOString(),
                answers: answers // optional: store answers for detailed review
            };
            await saveTestResult(firebasePayload);
            console.log("Result saved to Firebase");
        } catch (fbErr) {
            console.error("Failed to save result to Firebase:", fbErr);
        } finally {
            setFinishing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (showNamePrompt) {
        return (
            <div className="glass fade-in name-prompt-container" style={{ padding: '2rem', maxWidth: '400px', margin: '4rem auto', borderRadius: '24px', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Перед початком</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    Будь ласка, введіть ваше ім'я або нікнейм для збереження результатів.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Ваше ім'я"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && userName.trim()) {
                                handleStart();
                            }
                        }}
                        style={{
                            padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.03)', color: 'white', textAlign: 'center', outline: 'none'
                        }}
                    />
                    <button
                        disabled={!userName.trim()}
                        onClick={handleStart}
                        style={{
                            padding: '12px', borderRadius: '12px', border: 'none',
                            background: 'var(--accent-color)', color: 'white', fontWeight: 600,
                            opacity: userName.trim() ? 1 : 0.5, cursor: userName.trim() ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        Почати тест
                    </button>
                    <button
                        onClick={onBack}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}
                    >
                        Скасувати
                    </button>
                </div>
            </div>
        );
    }

    function handleStart() {
        if (!userName.trim()) return;
        localStorage.setItem('user_name', userName.trim());
        setShowNamePrompt(false);
    }

    if (error) {
        const isCorsError = error.toLowerCase().includes('failed to fetch');
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444', maxWidth: '500px', margin: '0 auto' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ marginBottom: '1rem' }}>Помилка завантаження</h3>
                <p style={{ marginBottom: '1rem', lineHeight: '1.5' }}>{error}</p>
                {isCorsError && (
                    <div className="glass" style={{ padding: '1rem', borderRadius: '12px', textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#ef4444' }}>💡 Порада щодо CORS:</p>
                        <p>Браузер заблокував запит до Google Drive. Щоб це виправити:</p>
                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                            <li>Додайте файл <code>quiz.json</code> у папку <code>public/</code> проекту.</li>
                            <li>В адмін-панелі вкажіть шлях як <code>/quiz.json</code>.</li>
                            <li>Або переконайтеся, що сервіс хостингу дозволяє прямі запити (CORS).</li>
                        </ul>
                    </div>
                )}
                <button
                    onClick={onBack}
                    style={{
                        marginTop: '1rem',
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                    }}
                >
                    Повернутися назад
                </button>
            </div>
        );
    }

    // Results View
    if (view === 'results') {
        const totalQuestions = quizData.quiz.length;
        const correctCount = Math.round((score / 100) * totalQuestions);

        // Circular Progress calculation
        const radius = 60;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;

        return (
            <div className="fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Результати тесту</h2>

                <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 2rem' }}>
                    <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                            cx="70" cy="70" r={radius}
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="10"
                            fill="transparent"
                        />
                        <circle
                            cx="70" cy="70" r={radius}
                            stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="10"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                    </svg>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 'bold'
                    }}>
                        {score}%
                    </div>
                </div>

                <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="glass" style={{ padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Правильних відповідей</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{correctCount} / {totalQuestions}</div>
                    </div>
                    <div className="glass" style={{ padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Статус</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                            Пройдено
                        </div>
                    </div>
                </div>

                <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {score >= 80 ? 'Чудовий результат! Ви впевнено володієте матеріалом.' :
                        score >= 60 ? 'Непогано! Варто повторити деякі теми для ще кращого результату.' :
                            'Рекомендуємо ще раз переглянути матеріал.'}
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        onClick={onBack}
                        style={{
                            padding: '12px 24px',
                            background: 'var(--surface-color)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <ArrowLeft size={18} />
                        До списку
                    </button>
                    <button
                        onClick={() => {
                            // Review mode: switch back to quiz view
                            // isCompleted remains true, which locks answers and changes the finish button
                            setView('quiz');
                        }}
                        style={{
                            padding: '12px 24px',
                            background: 'var(--accent-color)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Переглянути відповіді
                    </button>
                </div>
            </div>
        );
    }

    // Active Quiz View
    const question = quizData.quiz[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];
    const isAnswered = currentAnswer !== null;
    const isLastQuestion = currentQuestionIndex === quizData.quiz.length - 1;
    const allAnswered = answers.every(a => a !== null);

    // In review mode (reviewing after completion), we treat it as "answered"
    // We determine if we are in "Review Mode" by checking if all answers are present and valid, 
    // but we need to know if the QUIZ is actually finished.
    // We use a derived state or check storage? 
    // Actually, we use `loading` state logic. If we are here and answers are filled, it's review mode if `isCompleted` was true but we toggled it off.

    // Let's rely on `answers` content. If an answer is selected, it's locked.

    return (
        <div className="fade-in quiz-container" style={{ maxWidth: '800px', margin: '0 auto', height: '100%', minHeight: 'min-content', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Header */}
            <div className="quiz-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '8px', flexShrink: 0 }}>
                <div className="progress-text" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    {currentQuestionIndex + 1} / {quizData.quiz.length}
                </div>
                <div style={{
                    flex: 1, margin: '0 1.5rem', height: '8px', background: 'var(--surface-color)', borderRadius: '4px', overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${((currentQuestionIndex + 1) / quizData.quiz.length) * 100}%`,
                        height: '100%', background: 'var(--accent-color)', transition: 'width 0.3s ease'
                    }} />
                </div>
                {/* Timer could go here if needed */}
            </div>

            {/* Question */}
            <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                {question.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                {question.answerOptions.map((option, index) => {
                    const isSelected = currentAnswer === index;
                    const showCorrect = isAnswered && option.isCorrect;
                    const showIncorrect = isAnswered && isSelected && !option.isCorrect;

                    let borderColor = 'var(--glass-border)';
                    let bg = 'rgba(255,255,255,0.03)';
                    let icon = <span style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{String.fromCharCode(65 + index)}</span>;

                    if (showCorrect) {
                        borderColor = '#10b981';
                        bg = 'rgba(16, 185, 129, 0.1)';
                        icon = <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Check size={14} /></div>;
                    } else if (showIncorrect) {
                        borderColor = '#ef4444';
                        bg = 'rgba(239, 68, 68, 0.1)';
                        icon = <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><X size={14} /></div>;
                    } else if (isSelected) {
                        borderColor = 'var(--accent-color)';
                        bg = 'rgba(99, 102, 241, 0.1)';
                        icon = <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{String.fromCharCode(65 + index)}</div>;
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleAnswer(index)}
                            disabled={isAnswered}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '16px', borderRadius: '12px',
                                border: `1px solid ${borderColor}`,
                                background: bg,
                                color: 'var(--text-primary)',
                                textAlign: 'left',
                                cursor: isAnswered ? 'default' : 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ flexShrink: 0 }}>{icon}</div>
                            <span>{option.text}</span>
                        </button>
                    );
                })}
            </div>

            {/* Explanation / Hint */}
            {isAnswered && (
                <div className="fade-in" style={{
                    padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem',
                    background: currentAnswer !== null && question.answerOptions[currentAnswer].isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${currentAnswer !== null && question.answerOptions[currentAnswer].isCorrect ? '#10b981' : '#ef4444'}`
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {currentAnswer !== null && question.answerOptions[currentAnswer].isCorrect ?
                            <><Check size={18} /> Правильно!</> :
                            <><X size={18} /> Неправильно</>
                        }
                    </div>
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {question.answerOptions[currentAnswer]?.rationale || "Без пояснення."}
                    </div>
                </div>
            )}

            {/* Hint Toggle */}
            {!isAnswered && question.hint && (
                <div style={{ marginBottom: '2rem' }}>
                    <button
                        onClick={toggleHint}
                        style={{ color: 'var(--accent-color)', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {hints[currentQuestionIndex] ? 'Приховати підказку' : 'Показати підказку'}
                    </button>
                    {hints[currentQuestionIndex] && (
                        <div className="fade-in" style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            💡 {question.hint}
                        </div>
                    )}
                </div>
            )}

            {/* Navigation */}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem' }}>
                <button
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    style={{
                        padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                        background: 'var(--surface-color)', color: 'var(--text-primary)',
                        opacity: currentQuestionIndex === 0 ? 0.5 : 1, cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer'
                    }}
                >
                    Назад
                </button>

                {isLastQuestion ? (
                    allAnswered ? (
                        <button
                            onClick={isCompleted ? () => setView('results') : handleFinish}
                            disabled={finishing}
                            style={{
                                padding: '10px 24px', borderRadius: '12px', border: 'none',
                                background: finishing ? 'var(--text-secondary)' : (isCompleted ? 'var(--accent-color)' : '#10b981'),
                                color: 'white', fontWeight: 600,
                                cursor: finishing ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            {finishing && <Loader2 size={16} className="animate-spin" />}
                            {isCompleted ? 'Повернутися до результатів' : 'Завершити тест'}
                        </button>
                    ) : (
                        <button
                            disabled={!isAnswered}
                            style={{
                                padding: '10px 24px', borderRadius: '12px', border: 'none',
                                background: 'var(--surface-color)', color: 'var(--text-secondary)',
                                cursor: 'not-allowed', opacity: 0.5
                            }}
                        >
                            Завершити
                        </button>
                    )
                ) : (
                    <button
                        onClick={handleNext}
                        disabled={!isAnswered}
                        style={{
                            padding: '10px 24px', borderRadius: '12px', border: 'none',
                            background: isAnswered ? 'var(--accent-color)' : 'var(--surface-color)',
                            color: isAnswered ? 'white' : 'var(--text-secondary)',
                            cursor: isAnswered ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Далі
                    </button>
                )}
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
          .quiz-container {
            padding: 0.5rem !important;
          }
          .quiz-header {
             margin-bottom: 1rem !important;
          }
          .progress-text {
            font-size: 0.75rem !important;
          }
          h2 {
            font-size: 1.1rem !important;
            margin-bottom: 1.5rem !important;
          }
          .results-grid {
            grid-template-columns: 1fr !important;
          }
          .name-prompt-container {
            margin: 1rem !important;
            padding: 1.5rem !important;
          }
        }
      `}</style>
        </div>
    );
}
