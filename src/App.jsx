import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home, Search, Library, Plus, ArrowRight, Play, Pause,
  SkipBack, SkipForward, Repeat, Shuffle, Mic2, ListMusic,
  MonitorSpeaker, Volume2, VolumeX, Maximize2, ChevronLeft, Clock, Music, Disc3, Heart
} from 'lucide-react';
import { playlists, recentMusic, artists, browseCategories } from './data';
import './index.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const parseSong = (track, fallbackImage) => {
  const highestImage = track.image?.length > 0
    ? track.image[track.image.length - 1].link
    : (fallbackImage || 'https://picsum.photos/300/300');
  const highestAudio = track.downloadUrl?.length > 0
    ? track.downloadUrl[track.downloadUrl.length - 1].link
    : null;
  return {
    id: track.id,
    title: track.name,
    artist: track.primaryArtists || track.artists?.primary?.map(a => a.name).join(', ') || 'Unknown',
    album: track.album?.name || '',
    image: highestImage,
    audio: highestAudio,
    duration: parseInt(track.duration || 0),
    type: 'Song'
  };
};

// Fetch top songs by free-text search query
async function fetchSongsByQuery(query, limit = 20) {
  const res = await fetch(
    `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  const data = await res.json();
  return (data?.data?.results || []).map(t => parseSong(t));
}

// ─── Playing-bars animation ───────────────────────────────────────────────────
const PlayingAnim = () => (
  <span className="track-playing-anim">
    <span /><span /><span />
  </span>
);

// ─── Generic Track List ───────────────────────────────────────────────────────
const TrackList = ({ songs, currentTrack, isPlaying, handlePlay, loading, likedSongs, onToggleLike, onAddToQueue }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', padding: '24px 0' }}>
        <Music size={20} />
        <span>Loading songs...</span>
      </div>
    );
  }
  if (!songs.length) {
    return <p style={{ color: 'var(--text-secondary)' }}>No songs found.</p>;
  }
  return (
    <>
      <div className="track-row track-header">
        <span className="track-num">#</span>
        <span style={{ flex: 1 }}>Title</span>
        <span><Clock size={16} /></span>
      </div>
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0 16px' }} />
      {songs.map((song, idx) => {
        const isActive = currentTrack?.id === song.id;
        const isLiked = likedSongs?.some(s => s.id === song.id);
        return (
          <div
            key={song.id}
            className={`track-row track-item ${isActive ? 'track-active' : ''}`}
            onClick={() => song.audio && handlePlay(song)}
            style={{ opacity: song.audio ? 1 : 0.45, cursor: song.audio ? 'pointer' : 'not-allowed' }}
          >
            <span className="track-num">
              {isActive && isPlaying ? <PlayingAnim /> : idx + 1}
            </span>
            <div className="track-info">
              <img src={song.image} alt={song.title} className="track-img" />
              <div style={{ minWidth: 0 }}>
                <div className="track-title" style={{ color: isActive ? 'var(--spotify-green)' : 'white' }}>
                  {song.title}
                </div>
                <div className="track-artist">{song.artist}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="search-song-actions">
                {onToggleLike && (
                  <button
                    className="like-btn"
                    onClick={e => { e.stopPropagation(); onToggleLike(song); }}
                    title={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
                    style={{ color: isLiked ? '#1db954' : undefined }}
                  >
                    <Heart size={16} fill={isLiked ? '#1db954' : 'none'} />
                  </button>
                )}
                {onAddToQueue && song.audio && (
                  <button
                    className="queue-btn"
                    onClick={e => { e.stopPropagation(); onAddToQueue(song); }}
                    title="Add to queue"
                  >
                    <ListMusic size={16} />
                  </button>
                )}
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                {song.audio ? formatTime(song.duration) : <span style={{ fontSize: '11px', color: '#555' }}>—</span>}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};

// ─── Album View ───────────────────────────────────────────────────────────────
const AlbumView = ({ album, onBack, currentTrack, handlePlay, isPlaying, isShuffle, onToggleShuffle, setQueue, likedSongs, onToggleLike, onAddToQueue }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSongs([]);
    fetch(`https://jiosaavn-api-privatecvc2.vercel.app/albums?id=${album.id}`)
      .then(res => res.json())
      .then(data => {
        const parsed = (data?.data?.songs || []).map(t => parseSong(t, album.image));
        setSongs(parsed);
        setQueue(parsed);
      })
      .catch(err => console.error('Album fetch error:', err))
      .finally(() => setLoading(false));
  }, [album.id]);

  return (
    <div className="album-view">
      <div className="album-hero">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <div className="album-hero-content">
          <img src={album.image} alt={album.title} className="album-hero-img" />
          <div className="album-hero-info">
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'white' }}>Album</span>
            <h1 className="album-hero-title">{album.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
              <span style={{ color: 'white', fontWeight: 700 }}>{album.artist}</span>
            </div>
          </div>
        </div>
        <div className="album-actions">
          <button className="album-play-btn" onClick={() => songs.length > 0 && handlePlay(songs[0])}>
            <Play fill="black" size={24} color="black" style={{ marginLeft: '3px' }} />
          </button>
          <button
            className={`shuffle-btn ${isShuffle ? 'shuffle-active' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={28} />
          </button>
        </div>
      </div>
      <div className="album-tracklist">
        <TrackList songs={songs} currentTrack={currentTrack} isPlaying={isPlaying} handlePlay={handlePlay} loading={loading} likedSongs={likedSongs} onToggleLike={onToggleLike} />
      </div>
    </div>
  );
};

// ─── Artist View ──────────────────────────────────────────────────────────────
const ArtistView = ({ artist, onBack, currentTrack, handlePlay, isPlaying, isShuffle, onToggleShuffle, setQueue, likedSongs, onToggleLike, onAddToQueue }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSongs([]);
    fetchSongsByQuery(artist.searchQuery || artist.name, 20)
      .then(parsed => {
        setSongs(parsed);
        setQueue(parsed);
      })
      .catch(err => console.error('Artist fetch error:', err))
      .finally(() => setLoading(false));
  }, [artist.id]);

  return (
    <div className="album-view">
      {/* Artist Hero */}
      <div className="artist-hero">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <div className="artist-hero-content">
          <img src={artist.image} alt={artist.name} className="artist-hero-img" />
          <div className="artist-hero-info">
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'white', opacity: 0.7 }}>Artist</span>
            <h1 className="album-hero-title" style={{ fontSize: '52px' }}>{artist.name}</h1>
          </div>
        </div>
        <div className="album-actions">
          <button className="album-play-btn" onClick={() => songs.length > 0 && handlePlay(songs[0])}>
            <Play fill="black" size={24} color="black" style={{ marginLeft: '3px' }} />
          </button>
          <button
            className={`shuffle-btn ${isShuffle ? 'shuffle-active' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={28} />
          </button>
        </div>
      </div>

      {/* Popular Songs */}
      <div className="album-tracklist">
        <h2 style={{ marginBottom: '16px' }}>Popular</h2>
        <TrackList songs={songs} currentTrack={currentTrack} isPlaying={isPlaying} handlePlay={handlePlay} loading={loading} likedSongs={likedSongs} onToggleLike={onToggleLike} onAddToQueue={onAddToQueue} />
      </div>
    </div>
  );
};

// ─── Playlist View ────────────────────────────────────────────────────────────
const PlaylistView = ({ playlist, onBack, currentTrack, handlePlay, isPlaying, isShuffle, onToggleShuffle, setQueue, likedSongs, onToggleLike }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSongs([]);

    if (playlist.isLiked) {
      setSongs(likedSongs);
      setQueue(likedSongs);
      setLoading(false);
      return;
    }

    if (playlist.isCustom) {
      const songs = playlist.customSongs || [];
      setSongs(songs);
      setQueue(songs);
      setLoading(false);
      return;
    }

    const loadSongs = async () => {
      try {
        if (playlist.language === 'tamil' && playlist.artistName) {
          const tamilQuery = `${playlist.artistName} Tamil`;
          const otherQuery = `${playlist.artistName} hits`;
          const [tamilSongs, otherSongs] = await Promise.all([
            fetchSongsByQuery(tamilQuery, 23),
            fetchSongsByQuery(otherQuery, 7),
          ]);
          const tamilIds = new Set(tamilSongs.map(s => s.id));
          const extras = otherSongs.filter(s => !tamilIds.has(s.id)).slice(0, 2);
          const merged = [...tamilSongs.slice(0, 23), ...extras];
          setSongs(merged);
          setQueue(merged);
        } else {
          const parsed = await fetchSongsByQuery(playlist.searchQuery || playlist.title, 25);
          setSongs(parsed);
          setQueue(parsed);
        }
      } catch (err) {
        console.error('Playlist fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSongs();
  }, [playlist.id, playlist.isLiked ? likedSongs.length : null]);

  const gradientColor = playlist.color || '#1e3264';

  return (
    <div className="album-view">
      <div className="playlist-hero" style={{ background: `linear-gradient(180deg, ${gradientColor}cc 0%, #121212 100%)` }}>
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <div className="album-hero-content">
          {playlist.artistImage ? (
            <img
              src={playlist.artistImage}
              alt={playlist.title}
              className="playlist-cover"
              style={{ objectFit: 'cover', borderRadius: '4px' }}
            />
          ) : (
            <div className="playlist-cover" style={{ background: `linear-gradient(135deg, ${gradientColor} 0%, #000 100%)` }}>
              <Disc3 size={64} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
          )}
          <div className="album-hero-info">
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'white', opacity: 0.7 }}>Playlist</span>
            <h1 className="album-hero-title">{playlist.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '8px' }}>{playlist.description}</p>
          </div>
        </div>
        <div className="album-actions">
          <button className="album-play-btn" onClick={() => songs.length > 0 && handlePlay(songs[0])}>
            <Play fill="black" size={24} color="black" style={{ marginLeft: '3px' }} />
          </button>
          <button
            className={`shuffle-btn ${isShuffle ? 'shuffle-active' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={28} />
          </button>
        </div>
      </div>
      <div className="album-tracklist">
        <TrackList songs={songs} currentTrack={currentTrack} isPlaying={isPlaying} handlePlay={handlePlay} loading={loading} likedSongs={likedSongs} onToggleLike={onToggleLike} />
      </div>
    </div>
  );
};

// ─── Create Playlist Modal ────────────────────────────────────────────────────
const TOP_TAMIL_DIRECTORS = [
  { id: 204, name: 'Anirudh Ravichander', image: 'https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/1/18/Anirudh_Ravichander_in_2023.jpg/440px-Anirudh_Ravichander_in_2023.jpg&w=300&h=300&fit=cover', searchQuery: 'Anirudh Ravichander Tamil' },
  { id: 205, name: 'AR Rahman', image: 'https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/e/e4/A._R._Rahman_%282023%2C_London%29.jpg/440px-A._R._Rahman_%282023%2C_London%29.jpg&w=300&h=300&fit=cover', searchQuery: 'AR Rahman Tamil' },
  { id: 206, name: 'Yuvan Shankar Raja', image: 'https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Yuvan_Shankar_Raja.jpg/440px-Yuvan_Shankar_Raja.jpg&w=300&h=300&fit=cover', searchQuery: 'Yuvan Shankar Raja Tamil' },
  { id: 209, name: 'D. Imman', image: 'https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/4/44/D._Imman_%28Cropped%29.jpg/440px-D._Imman_%28Cropped%29.jpg&w=80&h=80&fit=cover', searchQuery: 'D Imman Tamil' },
  { id: 210, name: 'Harris Jayaraj', image: 'https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Harris_Jayaraj.jpg/440px-Harris_Jayaraj.jpg&w=80&h=80&fit=cover', searchQuery: 'Harris Jayaraj Tamil' },
];

const CreatePlaylistModal = ({ onClose, onCreate, onArtistClick }) => {
  const [name, setName] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!searchQ.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await fetchSongsByQuery(searchQ, 8);
        setResults(data);
        // Suggestions: re-query based on first result's artist
        if (data[0]?.artist) {
          const sug = await fetchSongsByQuery(data[0].artist, 5);
          setSuggestions(sug.filter(s => !data.some(r => r.id === s.id)));
        }
      } catch (e) { } finally { setSearching(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [searchQ]);

  const toggleSong = (song) => {
    setSelected(prev => prev.some(s => s.id === song.id) ? prev.filter(s => s.id !== song.id) : [...prev, song]);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), selected);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Create Playlist</h2>
          <button onClick={onClose} className="control-btn" style={{ fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>

        <input
          className="modal-input"
          placeholder="Playlist name…"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <div className="modal-search-wrap">
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            className="modal-input"
            placeholder="Search songs to add…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {searching && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '4px 0' }}>Searching…</p>}

        {results.length > 0 && (
          <div className="modal-song-list">
            <p className="modal-section-label">Results</p>
            {results.map(song => {
              const picked = selected.some(s => s.id === song.id);
              return (
                <div key={song.id} className={`modal-song-row ${picked ? 'modal-song-picked' : ''}`} onClick={() => toggleSong(song)}>
                  <img src={song.image} alt={song.title} className="modal-song-img" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="modal-song-title">{song.title}</div>
                    <div className="modal-song-artist">{song.artist}</div>
                  </div>
                  <div style={{ color: picked ? '#1db954' : 'var(--text-secondary)', fontSize: '18px', fontWeight: 700 }}>{picked ? '✓' : '+'}</div>
                </div>
              );
            })}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="modal-song-list">
            <p className="modal-section-label">Similar Songs</p>
            {suggestions.map(song => {
              const picked = selected.some(s => s.id === song.id);
              return (
                <div key={`sug-${song.id}`} className={`modal-song-row ${picked ? 'modal-song-picked' : ''}`} onClick={() => toggleSong(song)}>
                  <img src={song.image} alt={song.title} className="modal-song-img" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="modal-song-title">{song.title}</div>
                    <div className="modal-song-artist">{song.artist}</div>
                  </div>
                  <div style={{ color: picked ? '#1db954' : 'var(--text-secondary)', fontSize: '18px', fontWeight: 700 }}>{picked ? '✓' : '+'}</div>
                </div>
              );
            })}
          </div>
        )}

        {selected.length > 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>{selected.length} song{selected.length !== 1 ? 's' : ''} selected</p>
        )}

        <button
          className="modal-create-btn"
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          Create Playlist
        </button>
      </div>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ activeTab, setActiveTab, onPlaylistClick, onArtistClick, likedSongs, customPlaylists, onShowCreatePlaylist }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-box sidebar-nav">
        <ul>
          <li className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
            <Home size={24} /><span>Home</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-box sidebar-library">
        <div className="library-header">
          <div className="library-header-left">
            <Library size={24} /><span>Your Library</span>
          </div>
          <div className="library-header-right" style={{ display: 'flex', gap: '8px' }}>
            <Plus size={20} className="control-btn" onClick={onShowCreatePlaylist} title="Create Playlist" />
            <ArrowRight size={20} className="control-btn" />
          </div>
        </div>
        <div className="library-content">
          {/* ── Liked Songs ── */}
          <div className="playlist-item" onClick={() => onPlaylistClick({ id: 'liked', title: 'Liked Songs', type: 'Playlist', isLiked: true })}>
            <div className="playlist-img" style={{ background: 'linear-gradient(135deg, #450af5, #c4efd9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Heart size={20} fill="white" color="white" />
            </div>
            <div className="playlist-info">
              <span className="playlist-title">Liked Songs</span>
              <span className="playlist-desc">Playlist • {likedSongs.length} song{likedSongs.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* ── Create Playlist ── */}
          <div className="playlist-item" onClick={onShowCreatePlaylist}>
            <div className="playlist-img" style={{ background: 'linear-gradient(135deg, #333, #555)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Plus size={20} style={{ color: 'white' }} />
            </div>
            <div className="playlist-info">
              <span className="playlist-title">Create Playlist</span>
              <span className="playlist-desc">Add your songs</span>
            </div>
          </div>

          {/* ── Custom user playlists ── */}
          {customPlaylists.map(pl => (
            <div key={pl.id} className="playlist-item" onClick={() => onPlaylistClick({ id: pl.id, title: pl.name, type: 'Playlist', isCustom: true, customSongs: pl.songs })}>
              <div className="playlist-img" style={{ background: 'linear-gradient(135deg, #1db954, #0a7a38)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Disc3 size={20} style={{ color: 'white' }} />
              </div>
              <div className="playlist-info">
                <span className="playlist-title">{pl.name}</span>
                <span className="playlist-desc">Playlist • {pl.songs.length} song{pl.songs.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}

          {/* ── Static playlists ── */}
          {playlists.map((playlist) => (
            <div key={playlist.id} className="playlist-item" onClick={() => onPlaylistClick(playlist)}>
              {playlist.artistImage ? (
                <img src={playlist.artistImage} alt={playlist.title} className="playlist-img" style={{ objectFit: 'cover' }} />
              ) : playlist.color ? (
                <div className="playlist-img" style={{ background: `linear-gradient(135deg, ${playlist.color} 0%, #000 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Disc3 size={20} style={{ color: 'rgba(255,255,255,0.6)' }} />
                </div>
              ) : (
                <img src={playlist.image} alt={playlist.title} className="playlist-img" />
              )}
              <div className="playlist-info">
                <span className="playlist-title">{playlist.title}</span>
                <span className="playlist-desc">{playlist.type} • You</span>
              </div>
            </div>
          ))}

          {/* ── Top 5 Tamil Directors ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0', paddingTop: '8px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px 8px' }}>Tamil Directors</p>
            {TOP_TAMIL_DIRECTORS.map(dir => (
              <div key={dir.id} className="playlist-item" onClick={() => onArtistClick(dir)}>
                <img src={dir.image} alt={dir.name} className="playlist-img" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                <div className="playlist-info">
                  <span className="playlist-title">{dir.name}</span>
                  <span className="playlist-desc">Artist</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── Main Content ─────────────────────────────────────────────────────────────
const MainContent = ({
  isScrolled, currentTrack, handlePlay, activeTab,
  isPlaying, onArtistClick, onAlbumClick, onPlaylistClick,
  likedSongs, onToggleLike, recentlyPlayed, onAddToQueue
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ songs: [], albums: [], artists: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [queueToast, setQueueToast] = useState(null);

  const handleAddToQueueWithToast = (song) => {
    onAddToQueue(song);
    setQueueToast(song.title);
    setTimeout(() => setQueueToast(null), 2000);
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ songs: [], albums: [], artists: [] });
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      const q = encodeURIComponent(searchQuery);
      Promise.all([
        fetch(`https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${q}`).then(r => r.json()),
        fetch(`https://jiosaavn-api-privatecvc2.vercel.app/search/albums?query=${q}`).then(r => r.json()),
        fetch(`https://jiosaavn-api-privatecvc2.vercel.app/search/artists?query=${q}`).then(r => r.json()),
      ])
        .then(([songsData, albumsData, artistsData]) => {
          const songs = (songsData?.data?.results || []).map(t => parseSong(t));
          const albums = (albumsData?.data?.results || []).map(album => ({
            id: album.id,
            title: album.name,
            artist: Array.isArray(album.primaryArtists)
              ? album.primaryArtists.map(a => a.name).join(', ')
              : album.primaryArtists || 'Various Artists',
            image: album.image?.[album.image.length - 1]?.link || 'https://picsum.photos/300/300',
            audio: null,
            type: 'Album'
          }));
          const artistResults = (artistsData?.data?.results || []).map(a => ({
            id: a.id,
            name: a.name,
            type: 'Artist',
            image: a.image?.[a.image.length - 1]?.link || 'https://picsum.photos/seed/art/300/300',
            searchQuery: a.name
          }));
          setSearchResults({ songs: songs.slice(0, 10), albums: albums.slice(0, 4), artists: artistResults.slice(0, 4) });
          setIsSearching(false);
        })
        .catch(err => { console.error('Search error:', err); setIsSearching(false); });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="main-content-wrapper">
      {/* Topbar */}
      <div className={`topbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-buttons" style={{ display: 'flex', alignItems: 'center' }}>
          <button className="nav-btn"><SkipBack size={16} /></button>
          <button className="nav-btn" style={{ marginLeft: '12px' }}><SkipForward size={16} /></button>
          {/* Search bar in topbar — always visible */}
          <div style={{ marginLeft: '16px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Artists, songs, albums…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '10px 12px 10px 38px', fontSize: '14px', borderRadius: '24px', border: '1px solid transparent', width: '280px', backgroundColor: '#242424', color: 'white', outline: 'none', transition: 'border 0.2s, background-color 0.2s' }}
              onFocus={(e) => { e.target.style.border = '1px solid white'; e.target.style.backgroundColor = '#2a2a2a'; }}
              onBlur={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.backgroundColor = '#242424'; }}
            />
          </div>
        </div>
        <div className="user-controls">
          <button className="btn-primary">Explore Premium</button>
          <button className="btn-dark"><ArrowRight size={16} /> Install App</button>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#282828', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>U</div>
        </div>
      </div>

      <div className="section">
        {/* ── Search results (when query exists) ── */}
        {searchQuery ? (
          <>
            {isSearching ? (
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Searching for "{searchQuery}"...</p>
            ) : (
              <>
                {/* Artists */}
                {searchResults.artists.length > 0 && (
                  <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Artists</h2>
                    <div className="cards-grid">
                      {searchResults.artists.map(a => (
                        <div key={`sa-${a.id}`} className="card artist" onClick={() => onArtistClick(a)}>
                          <div className="card-img-container">
                            <img src={a.image} alt={a.name} className="card-img" />
                            <button className="play-btn"><Play fill="black" size={24} color="black" style={{ marginLeft: '4px' }} /></button>
                          </div>
                          <div className="card-title">{a.name}</div>
                          <div className="card-subtitle">Artist</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {/* Songs */}
                {searchResults.songs.length > 0 && (
                  <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ marginBottom: '12px' }}>Songs</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {searchResults.songs.map((item, idx) => {
                        const isActive = currentTrack?.id === item.id;
                        const isLiked = likedSongs?.some(s => s.id === item.id);
                        return (
                          <div
                            key={`ss-${item.id}`}
                            className="search-song-row"
                            onClick={() => item.audio && handlePlay(item)}
                            style={{ opacity: item.audio ? 1 : 0.5, cursor: item.audio ? 'pointer' : 'not-allowed' }}
                          >
                            <span className="search-song-num" style={{ color: isActive ? 'var(--spotify-green)' : 'var(--text-secondary)' }}>
                              {isActive && isPlaying ? <PlayingAnim /> : idx + 1}
                            </span>
                            <img src={item.image} alt={item.title} className="search-song-img" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="search-song-title" style={{ color: isActive ? 'var(--spotify-green)' : 'white' }}>{item.title}</div>
                              <div className="search-song-artist">{item.artist}</div>
                            </div>
                            <div className="search-song-actions">
                              {onToggleLike && (
                                <button
                                  className="like-btn"
                                  onClick={e => { e.stopPropagation(); onToggleLike(item); }}
                                  title={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
                                  style={{ color: isLiked ? '#1db954' : undefined }}
                                >
                                  <Heart size={16} fill={isLiked ? '#1db954' : 'none'} />
                                </button>
                              )}
                              {onAddToQueue && item.audio && (
                                <button
                                  className="queue-btn"
                                  onClick={e => { e.stopPropagation(); handleAddToQueueWithToast(item); }}
                                  title="Add to queue"
                                >
                                  <ListMusic size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                {/* Albums */}
                {searchResults.albums.length > 0 && (
                  <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Albums</h2>
                    <div className="cards-grid">
                      {searchResults.albums.map(item => (
                        <div key={`alb-${item.id}`} className="card" onClick={() => onAlbumClick(item)}>
                          <div className="card-img-container">
                            <img src={item.image} alt={item.title} className="card-img" />
                            <button className="play-btn"><Play fill="black" size={24} color="black" style={{ marginLeft: '4px' }} /></button>
                          </div>
                          <div className="card-title">{item.title}</div>
                          <div className="card-subtitle">Album • {item.artist}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {!searchResults.songs.length && !searchResults.albums.length && !searchResults.artists.length && (
                  <p style={{ color: 'var(--text-secondary)' }}>No results found for "{searchQuery}"</p>
                )}
              </>
            )}
          </>
        ) : (
          /* ── HOME content ── */
          <>
            <h2>Good evening</h2>
            {/* Recently Played Row */}
            {recentlyPlayed.length > 0 && (
              <>
                <h2 style={{ marginBottom: '12px' }}>Recently Played</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '32px' }}>
                  {recentlyPlayed.slice(0, 6).map((item) => (
                    <div key={`recent-${item.id}`} onClick={() => handlePlay(item)}
                      style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', transition: 'background-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    >
                      <img src={item.image} alt={item.title} style={{ width: '56px', height: '56px', objectFit: 'cover', flexShrink: 0 }} />
                      <span style={{ fontWeight: '700', padding: '0 14px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, fontSize: '13px' }}>{item.title}</span>
                      {currentTrack?.id === item.id && (
                        <div style={{ marginRight: '12px', backgroundColor: '#1db954', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Play fill="black" size={14} color="black" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Made For You */}
            <h2>Made For You</h2>
            <div className="cards-grid" style={{ marginBottom: '32px' }}>
              {playlists.map((playlist) => (
                <div key={`mix-${playlist.id}`} className="card" onClick={() => onPlaylistClick(playlist)}>
                  <div className="card-img-container">
                    {playlist.artistImage ? (
                      <img src={playlist.artistImage} alt={playlist.title} className="card-img" style={{ objectFit: 'cover' }} />
                    ) : playlist.color ? (
                      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${playlist.color} 0%, #000 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Disc3 size={48} style={{ color: 'rgba(255,255,255,0.35)' }} />
                      </div>
                    ) : (
                      <img src={playlist.image} alt={playlist.title} className="card-img" />
                    )}
                    <button className="play-btn" onClick={e => { e.stopPropagation(); onPlaylistClick(playlist); }}>
                      <Play fill="black" size={24} color="black" style={{ marginLeft: '4px' }} />
                    </button>
                  </div>
                  <div className="card-title">{playlist.title}</div>
                  <div className="card-subtitle">{playlist.description}</div>
                </div>
              ))}
            </div>

            {/* Favorite Artists */}
            <h2>Your Favorite Artists</h2>
            <div className="cards-grid">
              {artists.map((artist) => (
                <div key={`artist-${artist.id}`} className="card artist" onClick={() => onArtistClick(artist)}>
                  <div className="card-img-container">
                    <img src={artist.image} alt={artist.name} className="card-img" />
                    <button className="play-btn" onClick={e => { e.stopPropagation(); onArtistClick(artist); }}>
                      <Play fill="black" size={24} color="black" style={{ marginLeft: '4px' }} />
                    </button>
                  </div>
                  <div className="card-title">{artist.name}</div>
                  <div className="card-subtitle">{artist.type}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {queueToast && (
        <div className="queue-toast">
          Added to queue
        </div>
      )}
    </div>
  );
};

// ─── Player ───────────────────────────────────────────────────────────────────
const Player = ({ isPlaying, setIsPlaying, currentTrack, currentTime, onSeek, volume, onVolumeChange, onSkipNext, onSkipPrev, isShuffle, onToggleShuffle }) => {
  const isMuted = volume === 0;
  return (
    <div className="player">
      <div className="player-left">
        <img src={currentTrack.image} alt="Now Playing" className="now-playing-img" />
        <div className="now-playing-info">
          <span className="now-playing-title">{currentTrack.title}</span>
          <span className="now-playing-artist">{currentTrack.artist}</span>
        </div>
        <Plus size={16} className="control-btn" style={{ marginLeft: '24px' }} />
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            className={`control-btn ${isShuffle ? 'active-control' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
            style={{ color: isShuffle ? 'var(--spotify-green)' : undefined }}
          >
            <Shuffle size={16} />
          </button>
          <button className="control-btn" onClick={onSkipPrev}><SkipBack size={20} fill="currentColor" /></button>
          <button className="play-pause-btn" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause fill="black" size={16} /> : <Play fill="black" size={16} style={{ marginLeft: '2px' }} />}
          </button>
          <button className="control-btn" onClick={onSkipNext}><SkipForward size={20} fill="currentColor" /></button>
          <button className="control-btn"><Repeat size={16} /></button>
        </div>
        <div className="playback-bar">
          <span>{formatTime(currentTime)}</span>
          <div className="progress-bar-container" onClick={(e) => {
            const bounds = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - bounds.left) / bounds.width;
            onSeek(percent * (currentTrack.duration || 0));
          }}>
            <div className="progress-bar-fill" style={{ width: `${(currentTime / (currentTrack.duration || 1)) * 100 || 0}%` }}></div>
            <div className="progress-bar-thumb" style={{ left: `${(currentTime / (currentTrack.duration || 1)) * 100 || 0}%` }}></div>
          </div>
          <span>{formatTime(currentTrack.duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <Mic2 size={16} className="control-btn" />
        <ListMusic size={16} className="control-btn" />
        <MonitorSpeaker size={16} className="control-btn" />
        <div className="volume-bar" style={{ gap: '8px', display: 'flex', alignItems: 'center' }}>
          <button className="control-btn" onClick={() => onVolumeChange(isMuted ? 0.7 : 0)}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="volume-slider-wrapper">
            <input
              type="range" min="0" max="1" step="0.01"
              value={volume}
              onChange={e => onVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
              style={{ '--vol-pct': `${volume * 100}%` }}
            />
          </div>
        </div>
        <Maximize2 size={16} className="control-btn" />
      </div>
    </div>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────
const App = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(recentMusic[0]);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [volume, setVolume] = useState(0.7);
  const [isShuffle, setIsShuffle] = useState(false);
  const [queue, setQueue] = useState(recentMusic);
  const [view, setView] = useState(null);
  const [likedSongs, setLikedSongs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('likedSongs') || '[]'); } catch { return []; }
  });
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentlyPlayed') || '[]'); } catch { return recentMusic.slice(0, 6); }
  });
  const [customPlaylists, setCustomPlaylists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customPlaylists') || '[]'); } catch { return []; }
  });
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const audioRef = useRef(null);

  // Persist liked songs
  useEffect(() => { localStorage.setItem('likedSongs', JSON.stringify(likedSongs)); }, [likedSongs]);
  // Persist recently played
  useEffect(() => { localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed)); }, [recentlyPlayed]);
  // Persist custom playlists
  useEffect(() => { localStorage.setItem('customPlaylists', JSON.stringify(customPlaylists)); }, [customPlaylists]);

  const handleToggleLike = useCallback((song) => {
    setLikedSongs(prev => {
      const exists = prev.some(s => s.id === song.id);
      return exists ? prev.filter(s => s.id !== song.id) : [...prev, song];
    });
  }, []);

  const handleCreatePlaylist = useCallback((name, songs) => {
    const newPl = { id: `cp-${Date.now()}`, name, songs, createdAt: Date.now() };
    setCustomPlaylists(prev => [...prev, newPl]);
  }, []);

  const handleAddToCustomPlaylist = useCallback((playlistId, song) => {
    setCustomPlaylists(prev => prev.map(pl =>
      pl.id === playlistId
        ? { ...pl, songs: pl.songs.some(s => s.id === song.id) ? pl.songs : [...pl.songs, song] }
        : pl
    ));
  }, []);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current.play().catch(e => console.log('Audio play error', e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const handlePlay = useCallback((track) => {
    if (currentTrack.id === track.id) {
      setIsPlaying(prev => !prev);
    } else {
      setCurrentTrack(track);
      setCurrentTime(0);
      setIsPlaying(true);
      // Track recently played (max 6, no duplicates)
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(s => s.id !== track.id);
        return [track, ...filtered].slice(0, 6);
      });
    }
  }, [currentTrack]);

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSkipNext = () => {
    if (!queue.length) return;
    const playableSongs = queue.filter(s => s.audio);
    if (!playableSongs.length) return;
    if (isShuffle) {
      // Exclude current track to avoid immediate repeat
      const others = playableSongs.filter(s => s.id !== currentTrack.id);
      const pool = others.length > 0 ? others : playableSongs;
      const randomIdx = Math.floor(Math.random() * pool.length);
      handlePlay(pool[randomIdx]);
    } else {
      const idx = playableSongs.findIndex(s => s.id === currentTrack.id);
      const next = playableSongs[(idx + 1) % playableSongs.length];
      handlePlay(next);
    }
  };

  const handleSkipPrev = () => {
    if (!queue.length) return;
    const playableSongs = queue.filter(s => s.audio);
    if (!playableSongs.length) return;
    const idx = playableSongs.findIndex(s => s.id === currentTrack.id);
    const prev = playableSongs[(idx - 1 + playableSongs.length) % playableSongs.length];
    handlePlay(prev);
  };

  const handleSongEnd = () => {
    setCurrentTime(0);
    handleSkipNext();
  };

  const openArtist = (artist) => setView({ type: 'artist', data: artist });
  const openAlbum = (album) => setView({ type: 'album', data: album });
  const openPlaylist = (playlist) => setView({ type: 'playlist', data: playlist });
  const closeView = () => setView(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setView(null);
  };

  const commonViewProps = {
    currentTrack, handlePlay, isPlaying,
    isShuffle, onToggleShuffle: () => setIsShuffle(s => !s),
    setQueue, likedSongs, onToggleLike: handleToggleLike
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.audio}
        onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
        onEnded={handleSongEnd}
      />
      <div className="app-container" onScroll={(e) => setIsScrolled(e.target.scrollTop > 0)}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onPlaylistClick={(pl) => { setView({ type: 'playlist', data: pl }); }}
          onArtistClick={openArtist}
          likedSongs={likedSongs}
          customPlaylists={customPlaylists}
          onShowCreatePlaylist={() => setShowCreatePlaylist(true)}
        />

        {view?.type === 'artist' ? (
          <div className="main-content-wrapper">
            <ArtistView album={view.data} artist={view.data} onBack={closeView} {...commonViewProps} />
          </div>
        ) : view?.type === 'album' ? (
          <div className="main-content-wrapper">
            <AlbumView album={view.data} onBack={closeView} {...commonViewProps} />
          </div>
        ) : view?.type === 'playlist' ? (
          <div className="main-content-wrapper">
            <PlaylistView playlist={view.data} onBack={closeView} {...commonViewProps} />
          </div>
        ) : (
          <MainContent
            isScrolled={isScrolled}
            currentTrack={currentTrack}
            handlePlay={handlePlay}
            activeTab={activeTab}
            isPlaying={isPlaying}
            onArtistClick={openArtist}
            onAlbumClick={openAlbum}
            onPlaylistClick={openPlaylist}
            likedSongs={likedSongs}
            onToggleLike={handleToggleLike}
            recentlyPlayed={recentlyPlayed}
            onAddToQueue={(song) => setQueue(prev => {
              if (prev.some(s => s.id === song.id)) return prev;
              return [...prev, song];
            })}
          />
        )}
      </div>

      <Player
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        currentTrack={currentTrack}
        currentTime={currentTime}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={setVolume}
        onSkipNext={handleSkipNext}
        onSkipPrev={handleSkipPrev}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(s => !s)}
      />
      {showCreatePlaylist && (
        <CreatePlaylistModal
          onClose={() => setShowCreatePlaylist(false)}
          onCreate={handleCreatePlaylist}
        />
      )}
    </>
  );
};

export default App;
