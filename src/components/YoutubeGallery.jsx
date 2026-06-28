import { useEffect, useState } from 'react';

export default function YoutubeGallery({ listId, apiKey }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeVideo, setActiveVideo] = useState(null); // { videoId, title }

    useEffect(() => {
        let cancelled = false;

        const fetchAll = async (pageToken, accumulated) => {
            let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${listId}&maxResults=50&key=${apiKey}&fields=nextPageToken,items(snippet(title,resourceId/videoId,thumbnails/medium/url))`;
            if (pageToken) url += `&pageToken=${pageToken}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            const items = (data.items || []).map(item => ({
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                thumb: item.snippet.thumbnails?.medium?.url
                    || `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`
            }));
            const all = [...accumulated, ...items];
            if (data.nextPageToken) return fetchAll(data.nextPageToken, all);
            return all;
        };

        fetchAll(null, [])
            .then(all => {
                if (cancelled) return;
                setVideos(all);
                setLoading(false);
            })
            .catch(fetchError => {
                if (cancelled) return;
                setError(fetchError.message);
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [listId, apiKey]);

    if (loading) {
        return (
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} style={{ borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
                        <div style={{ height: '14px', margin: '8px 8px 4px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ marginBottom: '0.5rem', color: '#ef4444' }}>Помилка завантаження плейлисту</p>
                <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>
                <p style={{ fontSize: '0.8rem' }}>Перевірте Google API Key та що YouTube Data API v3 увімкнений.</p>
            </div>
        );
    }

    if (videos.length === 0) {
        return <div style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Відео не знайдено в плейлисті.</div>;
    }

    return (
        <>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', alignContent: 'start' }}>
                {videos.map(video => (
                    <div
                        key={video.videoId}
                        onClick={() => setActiveVideo(video)}
                        style={{
                            borderRadius: '10px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.04)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={event => {
                            event.currentTarget.style.transform = 'scale(1.03)';
                            event.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
                        }}
                        onMouseLeave={event => {
                            event.currentTarget.style.transform = 'scale(1)';
                            event.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                            <img
                                src={video.thumb}
                                alt={video.title}
                                loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(0,0,0,0.2)',
                                transition: 'background 0.15s'
                            }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    background: 'rgba(255,0,0,0.85)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '12px solid white', marginLeft: '3px' }} />
                                </div>
                            </div>
                        </div>
                        <div style={{
                            padding: '8px 10px', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.3,
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                        }}>
                            {video.title}
                        </div>
                    </div>
                ))}
            </div>

            {activeVideo && (
                <div
                    onClick={() => setActiveVideo(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(0,0,0,0.92)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <div onClick={event => event.stopPropagation()} style={{ width: '100%', maxWidth: '900px' }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1`}
                            width="100%"
                            style={{ aspectRatio: '16/9', border: 'none', borderRadius: '12px', display: 'block' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', flex: 1, marginRight: '1rem' }}>{activeVideo.title}</span>
                            <button
                                onClick={() => setActiveVideo(null)}
                                style={{ padding: '6px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                                Закрити
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
