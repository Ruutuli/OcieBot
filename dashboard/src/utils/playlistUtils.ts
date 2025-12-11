export interface PlaylistItemInfo {
  type: 'youtube' | 'spotify' | 'other';
  id?: string;
  url: string;
  embedUrl?: string;
  displayName: string;
  compact?: boolean;
}

/**
 * Parses a playlist URL and extracts information for embedding
 */
export function parsePlaylistUrl(url: string): PlaylistItemInfo {
  try {
    const urlObj = new URL(url);
    
    // YouTube parsing
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId: string | undefined;
      
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.pathname === '/watch') {
        videoId = urlObj.searchParams.get('v') || undefined;
      } else if (urlObj.pathname.startsWith('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1];
      }
      
      if (videoId) {
        // Clean video ID (remove any extra parameters)
        videoId = videoId.split('&')[0].split('?')[0];
        return {
          type: 'youtube',
          id: videoId,
          url,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          displayName: `YouTube Video`
        };
      }
    }
    
    // Spotify parsing
    if (urlObj.hostname.includes('spotify.com') || urlObj.hostname.includes('open.spotify.com')) {
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      if (pathParts.length >= 2) {
        const type = pathParts[0]; // track, album, playlist, etc.
        const id = pathParts[1];
        
        if (type && id) {
          // Use compact player for tracks (80px height), regular for albums/playlists
          const isCompact = type === 'track';
          return {
            type: 'spotify',
            id: `${type}/${id}`,
            url,
            embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
            displayName: `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            compact: isCompact
          };
        }
      }
    }
    
    // Default: other link
    return {
      type: 'other',
      url,
      displayName: url.length > 60 ? url.substring(0, 60) + '...' : url
    };
  } catch {
    // If URL parsing fails, treat as other
    return {
      type: 'other',
      url,
      displayName: url.length > 60 ? url.substring(0, 60) + '...' : url
    };
  }
}

