import { useEffect, useState } from 'react';

export default function PhotoGallery({ folderId, apiKey }) {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lightbox, setLightbox] = useState(null); // { id, name }

    useEffect(() => {
        let cancelled = false;

        const fetchPhotos = async (pageToken, accumulated) => {
            let url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType)&key=${apiKey}&pageSize=200&orderBy=name`;
            if (pageToken) url += `&pageToken=${pageToken}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
            const data = await res.json();

            const images = (data.files || []).filter(file => file.mimeType?.startsWith('image/'));
            const all = [...accumulated, ...images];

            if (data.nextPageToken) {
                return fetchPhotos(data.nextPageToken, all);
            }
            return all;
        };

        fetchPhotos(null, [])
            .then(all => {
                if (cancelled) return;
                setPhotos(all);
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
    }, [folderId, apiKey]);

    const thumbUrl = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w260`;
    const largeUrl = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=s3000`;
    const fullUrl = (id) => `https://drive.google.com/file/d/${id}/view`;

    if (loading) {
        return (
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} style={{
                        aspectRatio: '1',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.06)',
                        animation: 'pulse 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.05}s`
                    }} />
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ marginBottom: '0.5rem', color: '#ef4444' }}>Помилка завантаження галереї</p>
                <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>
                <p style={{ fontSize: '0.8rem' }}>Перевірте Google Drive API Key в Адмін-панелі.</p>
            </div>
        );
    }

    if (photos.length === 0) {
        return <div style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Фото не знайдено в цій папці.</div>;
    }

    return (
        <>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', alignContent: 'start' }}>
                {photos.map(photo => (
                    <div
                        key={photo.id}
                        onClick={() => setLightbox(photo)}
                        style={{
                            aspectRatio: '1',
                            borderRadius: '8px',
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
                        <img
                            src={thumbUrl(photo.id)}
                            alt={photo.name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={event => {
                                event.currentTarget.style.display = 'none';
                                event.currentTarget.parentElement.style.background = 'rgba(255,255,255,0.08)';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                ))}
            </div>

            {lightbox && (
                <div
                    onClick={() => setLightbox(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(0,0,0,0.88)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <img
                        src={largeUrl(lightbox.id)}
                        alt={lightbox.name}
                        referrerPolicy="no-referrer"
                        onClick={event => event.stopPropagation()}
                        style={{
                            maxWidth: '90vw', maxHeight: '80vh',
                            borderRadius: '12px',
                            objectFit: 'contain',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.6)'
                        }}
                    />
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>{lightbox.name}</span>
                        <a
                            href={fullUrl(lightbox.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={event => event.stopPropagation()}
                            style={{
                                padding: '6px 16px', borderRadius: '8px',
                                background: 'var(--accent-color)', color: 'white',
                                textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600
                            }}
                        >
                            Відкрити повний розмір ↗
                        </a>
                        <button
                            onClick={() => setLightbox(null)}
                            style={{
                                padding: '6px 16px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.1)', color: 'white',
                                border: 'none', fontSize: '0.8rem', cursor: 'pointer'
                            }}
                        >
                            Закрити
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
