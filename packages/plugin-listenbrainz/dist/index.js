"use strict";
/**
 * ListenBrainz Scrobbler Plugin
 *
 * Provides scrobbling to ListenBrainz and importing listening history.
 * ListenBrainz is an open-source music tracking service.
 *
 * API Documentation: https://listenbrainz.readthedocs.io/en/latest/users/api/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListenBrainzProvider = void 0;
const LISTENBRAINZ_API = 'https://api.listenbrainz.org/1';
const USER_AGENT = 'Audiio/1.0.0 (https://github.com/audiio)';
// ============================================================================
// ListenBrainz Provider
// ============================================================================
class ListenBrainzProvider {
    constructor() {
        this.id = 'listenbrainz';
        this.name = 'ListenBrainz';
        this.requiresAuth = true;
        this.manifest = {
            id: 'listenbrainz',
            name: 'ListenBrainz',
            version: '1.0.0',
            description: 'Scrobble your listens to ListenBrainz',
            author: 'Audiio',
            roles: ['scrobbler'],
            settingsSchema: [
                {
                    key: 'token',
                    label: 'User Token',
                    description: 'Your ListenBrainz user token. Get it from listenbrainz.org/settings/',
                    type: 'string',
                    required: true,
                    secret: true
                },
                {
                    key: 'scrobblingEnabled',
                    label: 'Enable Scrobbling',
                    description: 'Automatically scrobble tracks as you listen',
                    type: 'boolean',
                    default: true
                },
                {
                    key: 'nowPlayingEnabled',
                    label: 'Now Playing Updates',
                    description: 'Send "now playing" status when you start a track',
                    type: 'boolean',
                    default: true
                },
                {
                    key: 'scrobbleThreshold',
                    label: 'Scrobble Threshold (%)',
                    description: 'Minimum percentage of track to play before scrobbling',
                    type: 'number',
                    default: 50,
                    min: 10,
                    max: 100
                }
            ],
            privacy: {
                collects: true,
                sharesWithThirdParties: true,
                tracksAcrossApps: false,
                dataAccess: [
                    {
                        category: 'listening-history',
                        usage: ['service-functionality', 'third-party-sharing'],
                        required: true,
                        userFriendlyLabel: 'Listening History',
                        userFriendlyDesc: 'Tracks you play and when you play them',
                        technicalDesc: 'artist_name, track_name, release_name, listened_at (Unix timestamp), duration_ms'
                    },
                    {
                        category: 'user-credentials',
                        usage: ['service-functionality'],
                        required: true,
                        userFriendlyLabel: 'Account Token',
                        userFriendlyDesc: 'Your ListenBrainz authentication token',
                        technicalDesc: 'User token stored locally, sent via Authorization header'
                    }
                ],
                networkAccess: [
                    {
                        host: 'api.listenbrainz.org',
                        purpose: 'Submit listens and fetch statistics',
                        dataTypes: ['listening-history', 'user-credentials']
                    }
                ],
                localStorageUsed: true,
                localStorageDesc: 'Stores authentication token',
                dataRetention: 'third-party-controlled',
                lastUpdated: '2025-01-06'
            }
        };
        this.token = null;
        this.username = null;
    }
    // ============================================================================
    // Lifecycle
    // ============================================================================
    async initialize() {
        // Load token from settings if available
        console.log('[ListenBrainz] Plugin initialized');
    }
    async dispose() {
        console.log('[ListenBrainz] Plugin disposed');
    }
    // ============================================================================
    // Configuration
    // ============================================================================
    /**
     * Set the user token for authentication
     * Get your token from: https://listenbrainz.org/settings/
     */
    setToken(token) {
        this.token = token;
        this.username = null;
    }
    getToken() {
        return this.token;
    }
    clearToken() {
        this.token = null;
        this.username = null;
    }
    updateSettings(settings) {
        if (typeof settings.token === 'string') {
            this.setToken(settings.token);
            console.log('[ListenBrainz] Token configured');
        }
    }
    getSettings() {
        return {
            token: this.token,
            username: this.username
        };
    }
    // ============================================================================
    // Authentication
    // ============================================================================
    isAuthenticated() {
        return this.token !== null;
    }
    async validateToken() {
        if (!this.token) {
            return { valid: false, error: 'No token set' };
        }
        try {
            const response = await fetch(`${LISTENBRAINZ_API}/validate-token`, {
                headers: {
                    'Authorization': `Token ${this.token}`,
                    'User-Agent': USER_AGENT
                }
            });
            if (!response.ok) {
                return { valid: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            if (data.valid && data.user_name) {
                this.username = data.user_name;
                return { valid: true, username: data.user_name };
            }
            return { valid: false, error: data.message || 'Invalid token' };
        }
        catch (error) {
            return { valid: false, error: String(error) };
        }
    }
    getUsername() {
        return this.username;
    }
    // ============================================================================
    // Scrobbling
    // ============================================================================
    async scrobble(payload) {
        if (!this.token) {
            console.error('[ListenBrainz] Cannot scrobble: not authenticated');
            return false;
        }
        // ListenBrainz requires at least 50% of the track or 4 minutes played
        const minDuration = Math.min(payload.track.duration * 0.5, 240);
        if (payload.playedDuration < minDuration) {
            console.log('[ListenBrainz] Skipping scrobble: insufficient play duration');
            return false;
        }
        // Extract album name - handle both string and object formats
        const album = payload.track.album;
        const albumName = typeof album === 'string'
            ? album
            : album?.title;
        const listen = {
            listened_at: Math.floor(payload.timestamp.getTime() / 1000),
            track_metadata: {
                artist_name: payload.track.artist,
                track_name: payload.track.title,
                release_name: albumName,
                additional_info: {
                    duration_ms: payload.track.duration * 1000
                }
            }
        };
        const submission = {
            listen_type: 'single',
            payload: [listen]
        };
        try {
            const response = await fetch(`${LISTENBRAINZ_API}/submit-listens`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT
                },
                body: JSON.stringify(submission)
            });
            if (!response.ok) {
                const error = await response.text();
                console.error('[ListenBrainz] Scrobble failed:', response.status, error);
                return false;
            }
            console.log('[ListenBrainz] Scrobbled:', payload.track.title, 'by', payload.track.artist);
            return true;
        }
        catch (error) {
            console.error('[ListenBrainz] Scrobble error:', error);
            return false;
        }
    }
    async updateNowPlaying(payload) {
        if (!this.token) {
            console.log('[ListenBrainz] No token set - skipping now playing');
            return false;
        }
        console.log('[ListenBrainz] Sending now playing:', payload.track.title, 'by', payload.track.artist);
        // Extract album name - handle both string and object formats
        const album = payload.track.album;
        const albumName = typeof album === 'string'
            ? album
            : album?.title;
        // Note: playing_now submissions must NOT include listened_at
        const listen = {
            track_metadata: {
                artist_name: payload.track.artist,
                track_name: payload.track.title,
                release_name: albumName,
                additional_info: {
                    duration_ms: payload.track.duration * 1000
                }
            }
        };
        const submission = {
            listen_type: 'playing_now',
            payload: [listen]
        };
        try {
            const response = await fetch(`${LISTENBRAINZ_API}/submit-listens`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT
                },
                body: JSON.stringify(submission)
            });
            if (response.ok) {
                console.log('[ListenBrainz] Now playing sent successfully');
            }
            else {
                const errorText = await response.text();
                console.error('[ListenBrainz] Now playing failed:', response.status, errorText);
            }
            return response.ok;
        }
        catch (error) {
            console.error('[ListenBrainz] Now playing error:', error);
            return false;
        }
    }
    // ============================================================================
    // Feedback (Love/Hate)
    // ============================================================================
    async submitFeedback(recordingMbid, score) {
        if (!this.token) {
            return false;
        }
        try {
            const response = await fetch(`${LISTENBRAINZ_API}/feedback/recording-feedback`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT
                },
                body: JSON.stringify({
                    recording_mbid: recordingMbid,
                    score
                })
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    // ============================================================================
    // Import (Additional Methods)
    // ============================================================================
    /**
     * Import listening history from ListenBrainz
     */
    async importListens(maxCount = 1000) {
        if (!this.token || !this.username) {
            const validation = await this.validateToken();
            if (!validation.valid) {
                return { tracks: [], error: 'Not authenticated' };
            }
        }
        const tracks = [];
        let count = 0;
        let maxTs;
        try {
            while (count < maxCount) {
                const url = new URL(`${LISTENBRAINZ_API}/user/${this.username}/listens`);
                url.searchParams.set('count', String(Math.min(100, maxCount - count)));
                if (maxTs) {
                    url.searchParams.set('max_ts', String(maxTs));
                }
                const response = await fetch(url.toString(), {
                    headers: {
                        'Authorization': `Token ${this.token}`,
                        'User-Agent': USER_AGENT
                    }
                });
                if (!response.ok) {
                    break;
                }
                const data = await response.json();
                const listens = data.payload?.listens || [];
                if (listens.length === 0) {
                    break;
                }
                for (const listen of listens) {
                    tracks.push({
                        title: listen.track_metadata.track_name,
                        artist: listen.track_metadata.artist_name,
                        album: listen.track_metadata.release_name,
                        playedAt: new Date((listen.listened_at ?? 0) * 1000),
                        mbid: listen.track_metadata.additional_info?.recording_mbid
                    });
                    count++;
                }
                maxTs = listens[listens.length - 1].listened_at ?? 0;
            }
            return { tracks };
        }
        catch (error) {
            return { tracks, error: String(error) };
        }
    }
    /**
     * Import loved tracks from ListenBrainz
     */
    async importLovedTracks(maxCount = 500) {
        if (!this.token || !this.username) {
            const validation = await this.validateToken();
            if (!validation.valid) {
                return { tracks: [], error: 'Not authenticated' };
            }
        }
        try {
            const url = new URL(`${LISTENBRAINZ_API}/feedback/user/${this.username}/get-feedback`);
            url.searchParams.set('count', String(maxCount));
            url.searchParams.set('score', '1');
            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Token ${this.token}`,
                    'User-Agent': USER_AGENT
                }
            });
            if (!response.ok) {
                return { tracks: [], error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            const tracks = (data.feedback || [])
                .filter(f => f.track_metadata)
                .map(feedback => ({
                title: feedback.track_metadata.track_name,
                artist: feedback.track_metadata.artist_name,
                album: feedback.track_metadata.release_name,
                mbid: feedback.recording_mbid
            }));
            return { tracks };
        }
        catch (error) {
            return { tracks: [], error: String(error) };
        }
    }
    // ============================================================================
    // Statistics
    // ============================================================================
    async getUserStats(range = 'all_time') {
        if (!this.username) {
            return null;
        }
        try {
            const headers = { 'User-Agent': USER_AGENT };
            const countResponse = await fetch(`${LISTENBRAINZ_API}/user/${this.username}/listen-count`, { headers });
            const countData = await countResponse.json();
            const artistsResponse = await fetch(`${LISTENBRAINZ_API}/stats/user/${this.username}/artists?range=${range}&count=10`, { headers });
            const artistsData = await artistsResponse.json();
            const recordingsResponse = await fetch(`${LISTENBRAINZ_API}/stats/user/${this.username}/recordings?range=${range}&count=10`, { headers });
            const recordingsData = await recordingsResponse.json();
            return {
                totalListens: countData.payload?.count,
                topArtists: artistsData.payload?.artists?.map(a => ({
                    name: a.artist_name,
                    count: a.listen_count
                })),
                topTracks: recordingsData.payload?.recordings?.map(r => ({
                    title: r.track_name,
                    artist: r.artist_name,
                    count: r.listen_count
                }))
            };
        }
        catch {
            return null;
        }
    }
}
exports.ListenBrainzProvider = ListenBrainzProvider;
exports.default = ListenBrainzProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQVVILE1BQU0sZ0JBQWdCLEdBQUcsZ0NBQWdDLENBQUM7QUFDMUQsTUFBTSxVQUFVLEdBQUcsMENBQTBDLENBQUM7QUF5QzlELCtFQUErRTtBQUMvRSx3QkFBd0I7QUFDeEIsK0VBQStFO0FBRS9FLE1BQWEsb0JBQW9CO0lBQWpDO1FBQ1csT0FBRSxHQUFHLGNBQWMsQ0FBQztRQUNwQixTQUFJLEdBQUcsY0FBYyxDQUFDO1FBQ3RCLGlCQUFZLEdBQUcsSUFBSSxDQUFDO1FBRXBCLGFBQVEsR0FBa0I7WUFDakMsRUFBRSxFQUFFLGNBQWM7WUFDbEIsSUFBSSxFQUFFLGNBQWM7WUFDcEIsT0FBTyxFQUFFLE9BQU87WUFDaEIsV0FBVyxFQUFFLHVDQUF1QztZQUNwRCxNQUFNLEVBQUUsUUFBUTtZQUNoQixLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUM7WUFDcEIsY0FBYyxFQUFFO2dCQUNkO29CQUNFLEdBQUcsRUFBRSxPQUFPO29CQUNaLEtBQUssRUFBRSxZQUFZO29CQUNuQixXQUFXLEVBQUUsc0VBQXNFO29CQUNuRixJQUFJLEVBQUUsUUFBUTtvQkFDZCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxNQUFNLEVBQUUsSUFBSTtpQkFDYjtnQkFDRDtvQkFDRSxHQUFHLEVBQUUsbUJBQW1CO29CQUN4QixLQUFLLEVBQUUsbUJBQW1CO29CQUMxQixXQUFXLEVBQUUsNkNBQTZDO29CQUMxRCxJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRDtvQkFDRSxHQUFHLEVBQUUsbUJBQW1CO29CQUN4QixLQUFLLEVBQUUscUJBQXFCO29CQUM1QixXQUFXLEVBQUUsa0RBQWtEO29CQUMvRCxJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRDtv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QkFBZSxvQkFBb0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBMaXN0ZW5CcmFpbnogU2Nyb2JibGVyIFBsdWdpblxyXG4gKlxyXG4gKiBQcm92aWRlcyBzY3JvYmJsaW5nIHRvIExpc3RlbkJyYWlueiBhbmQgaW1wb3J0aW5nIGxpc3RlbmluZyBoaXN0b3J5LlxyXG4gKiBMaXN0ZW5CcmFpbnogaXMgYW4gb3Blbi1zb3VyY2UgbXVzaWMgdHJhY2tpbmcgc2VydmljZS5cclxuICpcclxuICogQVBJIERvY3VtZW50YXRpb246IGh0dHBzOi8vbGlzdGVuYnJhaW56LnJlYWR0aGVkb2NzLmlvL2VuL2xhdGVzdC91c2Vycy9hcGkvXHJcbiAqL1xyXG5cclxuaW1wb3J0IHR5cGUge1xyXG4gIFNjcm9iYmxlcixcclxuICBTY3JvYmJsZVBheWxvYWQsXHJcbiAgTm93UGxheWluZ1BheWxvYWQsXHJcbiAgQWRkb25NYW5pZmVzdCxcclxuICBQcml2YWN5TWFuaWZlc3RcclxufSBmcm9tICdAYXVkaWlvL3Nkayc7XHJcblxyXG5jb25zdCBMSVNURU5CUkFJTlpfQVBJID0gJ2h0dHBzOi8vYXBpLmxpc3RlbmJyYWluei5vcmcvMSc7XHJcbmNvbnN0IFVTRVJfQUdFTlQgPSAnQXVkaWlvLzEuMC4wIChodHRwczovL2dpdGh1Yi5jb20vYXVkaWlvKSc7XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIFR5cGVzXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbmludGVyZmFjZSBMaXN0ZW5CcmFpbnpMaXN0ZW4ge1xyXG4gIGxpc3RlbmVkX2F0PzogbnVtYmVyOyAvLyBSZXF1aXJlZCBmb3IgJ3NpbmdsZScvJ2ltcG9ydCcsIG11c3QgYmUgb21pdHRlZCBmb3IgJ3BsYXlpbmdfbm93J1xyXG4gIHRyYWNrX21ldGFkYXRhOiB7XHJcbiAgICBhcnRpc3RfbmFtZTogc3RyaW5nO1xyXG4gICAgdHJhY2tfbmFtZTogc3RyaW5nO1xyXG4gICAgcmVsZWFzZV9uYW1lPzogc3RyaW5nO1xyXG4gICAgYWRkaXRpb25hbF9pbmZvPzoge1xyXG4gICAgICBkdXJhdGlvbl9tcz86IG51bWJlcjtcclxuICAgICAgcmVjb3JkaW5nX21iaWQ/OiBzdHJpbmc7XHJcbiAgICAgIHJlbGVhc2VfbWJpZD86IHN0cmluZztcclxuICAgICAgYXJ0aXN0X21iaWRzPzogc3RyaW5nW107XHJcbiAgICAgIGlzcmM/OiBzdHJpbmc7XHJcbiAgICAgIHNwb3RpZnlfaWQ/OiBzdHJpbmc7XHJcbiAgICB9O1xyXG4gIH07XHJcbn1cclxuXHJcbmludGVyZmFjZSBMaXN0ZW5CcmFpbnpTdWJtaXNzaW9uIHtcclxuICBsaXN0ZW5fdHlwZTogJ3NpbmdsZScgfCAncGxheWluZ19ub3cnIHwgJ2ltcG9ydCc7XHJcbiAgcGF5bG9hZDogTGlzdGVuQnJhaW56TGlzdGVuW107XHJcbn1cclxuXHJcbmludGVyZmFjZSBMaXN0ZW5CcmFpbnpGZWVkYmFjayB7XHJcbiAgcmVjb3JkaW5nX21zaWQ/OiBzdHJpbmc7XHJcbiAgcmVjb3JkaW5nX21iaWQ/OiBzdHJpbmc7XHJcbiAgc2NvcmU6IDEgfCAtMSB8IDA7XHJcbiAgdXNlcl9pZDogc3RyaW5nO1xyXG4gIGNyZWF0ZWQ6IG51bWJlcjtcclxuICB0cmFja19tZXRhZGF0YT86IHtcclxuICAgIGFydGlzdF9uYW1lOiBzdHJpbmc7XHJcbiAgICB0cmFja19uYW1lOiBzdHJpbmc7XHJcbiAgICByZWxlYXNlX25hbWU/OiBzdHJpbmc7XHJcbiAgfTtcclxufVxyXG5cclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4vLyBMaXN0ZW5CcmFpbnogUHJvdmlkZXJcclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuZXhwb3J0IGNsYXNzIExpc3RlbkJyYWluelByb3ZpZGVyIGltcGxlbWVudHMgU2Nyb2JibGVyIHtcclxuICByZWFkb25seSBpZCA9ICdsaXN0ZW5icmFpbnonO1xyXG4gIHJlYWRvbmx5IG5hbWUgPSAnTGlzdGVuQnJhaW56JztcclxuICByZWFkb25seSByZXF1aXJlc0F1dGggPSB0cnVlO1xyXG5cclxuICByZWFkb25seSBtYW5pZmVzdDogQWRkb25NYW5pZmVzdCA9IHtcclxuICAgIGlkOiAnbGlzdGVuYnJhaW56JyxcclxuICAgIG5hbWU6ICdMaXN0ZW5CcmFpbnonLFxyXG4gICAgdmVyc2lvbjogJzEuMC4wJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnU2Nyb2JibGUgeW91ciBsaXN0ZW5zIHRvIExpc3RlbkJyYWlueicsXHJcbiAgICBhdXRob3I6ICdBdWRpaW8nLFxyXG4gICAgcm9sZXM6IFsnc2Nyb2JibGVyJ10sXHJcbiAgICBzZXR0aW5nc1NjaGVtYTogW1xyXG4gICAgICB7XHJcbiAgICAgICAga2V5OiAndG9rZW4nLFxyXG4gICAgICAgIGxhYmVsOiAnVXNlciBUb2tlbicsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdZb3VyIExpc3RlbkJyYWlueiB1c2VyIHRva2VuLiBHZXQgaXQgZnJvbSBsaXN0ZW5icmFpbnoub3JnL3NldHRpbmdzLycsXHJcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgc2VjcmV0OiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBrZXk6ICdzY3JvYmJsaW5nRW5hYmxlZCcsXHJcbiAgICAgICAgbGFiZWw6ICdFbmFibGUgU2Nyb2JibGluZycsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdBdXRvbWF0aWNhbGx5IHNjcm9iYmxlIHRyYWNrcyBhcyB5b3UgbGlzdGVuJyxcclxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAga2V5OiAnbm93UGxheWluZ0VuYWJsZWQnLFxyXG4gICAgICAgIGxhYmVsOiAnTm93IFBsYXlpbmcgVXBkYXRlcycsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdTZW5kIFwibm93IHBsYXlpbmdcIiBzdGF0dXMgd2hlbiB5b3Ugc3RhcnQgYSB0cmFjaycsXHJcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgIGRlZmF1bHQ6IHRydWVcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGtleTogJ3Njcm9iYmxlVGhyZXNob2xkJyxcclxuICAgICAgICBsYWJlbDogJ1Njcm9iYmxlIFRocmVzaG9sZCAoJSknLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTWluaW11bSBwZXJjZW50YWdlIG9mIHRyYWNrIHRvIHBsYXkgYmVmb3JlIHNjcm9iYmxpbmcnLFxyXG4gICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgIGRlZmF1bHQ6IDUwLFxyXG4gICAgICAgIG1pbjogMTAsXHJcbiAgICAgICAgbWF4OiAxMDBcclxuICAgICAgfVxyXG4gICAgXSxcclxuICAgIHByaXZhY3k6IHtcclxuICAgICAgY29sbGVjdHM6IHRydWUsXHJcbiAgICAgIHNoYXJlc1dpdGhUaGlyZFBhcnRpZXM6IHRydWUsXHJcbiAgICAgIHRyYWNrc0Fjcm9zc0FwcHM6IGZhbHNlLFxyXG5cclxuICAgICAgZGF0YUFjY2VzczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNhdGVnb3J5OiAnbGlzdGVuaW5nLWhpc3RvcnknLFxyXG4gICAgICAgICAgdXNhZ2U6IFsnc2VydmljZS1mdW5jdGlvbmFsaXR5JywgJ3RoaXJkLXBhcnR5LXNoYXJpbmcnXSxcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgdXNlckZyaWVuZGx5TGFiZWw6ICdMaXN0ZW5pbmcgSGlzdG9yeScsXHJcbiAgICAgICAgICB1c2VyRnJpZW5kbHlEZXNjOiAnVHJhY2tzIHlvdSBwbGF5IGFuZCB3aGVuIHlvdSBwbGF5IHRoZW0nLFxyXG4gICAgICAgICAgdGVjaG5pY2FsRGVzYzogJ2FydGlzdF9uYW1lLCB0cmFja19uYW1lLCByZWxlYXNlX25hbWUsIGxpc3RlbmVkX2F0IChVbml4IHRpbWVzdGFtcCksIGR1cmF0aW9uX21zJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY2F0ZWdvcnk6ICd1c2VyLWNyZWRlbnRpYWxzJyxcclxuICAgICAgICAgIHVzYWdlOiBbJ3NlcnZpY2UtZnVuY3Rpb25hbGl0eSddLFxyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICB1c2VyRnJpZW5kbHlMYWJlbDogJ0FjY291bnQgVG9rZW4nLFxyXG4gICAgICAgICAgdXNlckZyaWVuZGx5RGVzYzogJ1lvdXIgTGlzdGVuQnJhaW56IGF1dGhlbnRpY2F0aW9uIHRva2VuJyxcclxuICAgICAgICAgIHRlY2huaWNhbERlc2M6ICdVc2VyIHRva2VuIHN0b3JlZCBsb2NhbGx5LCBzZW50IHZpYSBBdXRob3JpemF0aW9uIGhlYWRlcidcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcblxyXG4gICAgICBuZXR3b3JrQWNjZXNzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaG9zdDogJ2FwaS5saXN0ZW5icmFpbnoub3JnJyxcclxuICAgICAgICAgIHB1cnBvc2U6ICdTdWJtaXQgbGlzdGVucyBhbmQgZmV0Y2ggc3RhdGlzdGljcycsXHJcbiAgICAgICAgICBkYXRhVHlwZXM6IFsnbGlzdGVuaW5nLWhpc3RvcnknLCAndXNlci1jcmVkZW50aWFscyddXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG5cclxuICAgICAgbG9jYWxTdG9yYWdlVXNlZDogdHJ1ZSxcclxuICAgICAgbG9jYWxTdG9yYWdlRGVzYzogJ1N0b3JlcyBhdXRoZW50aWNhdGlvbiB0b2tlbicsXHJcbiAgICAgIGRhdGFSZXRlbnRpb246ICd0aGlyZC1wYXJ0eS1jb250cm9sbGVkJyxcclxuICAgICAgbGFzdFVwZGF0ZWQ6ICcyMDI1LTAxLTA2J1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHByaXZhdGUgdG9rZW46IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgdXNlcm5hbWU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gTGlmZWN5Y2xlXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICBhc3luYyBpbml0aWFsaXplKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gTG9hZCB0b2tlbiBmcm9tIHNldHRpbmdzIGlmIGF2YWlsYWJsZVxyXG4gICAgY29uc29sZS5sb2coJ1tMaXN0ZW5CcmFpbnpdIFBsdWdpbiBpbml0aWFsaXplZCcpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZGlzcG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnNvbGUubG9nKCdbTGlzdGVuQnJhaW56XSBQbHVnaW4gZGlzcG9zZWQnKTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBDb25maWd1cmF0aW9uXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAvKipcclxuICAgKiBTZXQgdGhlIHVzZXIgdG9rZW4gZm9yIGF1dGhlbnRpY2F0aW9uXHJcbiAgICogR2V0IHlvdXIgdG9rZW4gZnJvbTogaHR0cHM6Ly9saXN0ZW5icmFpbnoub3JnL3NldHRpbmdzL1xyXG4gICAqL1xyXG4gIHNldFRva2VuKHRva2VuOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIHRoaXMudG9rZW4gPSB0b2tlbjtcclxuICAgIHRoaXMudXNlcm5hbWUgPSBudWxsO1xyXG4gIH1cclxuXHJcbiAgZ2V0VG9rZW4oKTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgICByZXR1cm4gdGhpcy50b2tlbjtcclxuICB9XHJcblxyXG4gIGNsZWFyVG9rZW4oKTogdm9pZCB7XHJcbiAgICB0aGlzLnRva2VuID0gbnVsbDtcclxuICAgIHRoaXMudXNlcm5hbWUgPSBudWxsO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XHJcbiAgICBpZiAodHlwZW9mIHNldHRpbmdzLnRva2VuID09PSAnc3RyaW5nJykge1xyXG4gICAgICB0aGlzLnNldFRva2VuKHNldHRpbmdzLnRva2VuKTtcclxuICAgICAgY29uc29sZS5sb2coJ1tMaXN0ZW5CcmFpbnpdIFRva2VuIGNvbmZpZ3VyZWQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldFNldHRpbmdzKCk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRva2VuOiB0aGlzLnRva2VuLFxyXG4gICAgICB1c2VybmFtZTogdGhpcy51c2VybmFtZVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBBdXRoZW50aWNhdGlvblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgaXNBdXRoZW50aWNhdGVkKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMudG9rZW4gIT09IG51bGw7XHJcbiAgfVxyXG5cclxuICBhc3luYyB2YWxpZGF0ZVRva2VuKCk6IFByb21pc2U8eyB2YWxpZDogYm9vbGVhbjsgdXNlcm5hbWU/OiBzdHJpbmc7IGVycm9yPzogc3RyaW5nIH0+IHtcclxuICAgIGlmICghdGhpcy50b2tlbikge1xyXG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIGVycm9yOiAnTm8gdG9rZW4gc2V0JyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7TElTVEVOQlJBSU5aX0FQSX0vdmFsaWRhdGUtdG9rZW5gLCB7XHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgVG9rZW4gJHt0aGlzLnRva2VufWAsXHJcbiAgICAgICAgICAnVXNlci1BZ2VudCc6IFVTRVJfQUdFTlRcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgZXJyb3I6IGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfWAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKSBhcyB7IHZhbGlkOiBib29sZWFuOyB1c2VyX25hbWU/OiBzdHJpbmc7IG1lc3NhZ2U/OiBzdHJpbmcgfTtcclxuXHJcbiAgICAgIGlmIChkYXRhLnZhbGlkICYmIGRhdGEudXNlcl9uYW1lKSB7XHJcbiAgICAgICAgdGhpcy51c2VybmFtZSA9IGRhdGEudXNlcl9uYW1lO1xyXG4gICAgICAgIHJldHVybiB7IHZhbGlkOiB0cnVlLCB1c2VybmFtZTogZGF0YS51c2VyX25hbWUgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogZGF0YS5tZXNzYWdlIHx8ICdJbnZhbGlkIHRva2VuJyB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0VXNlcm5hbWUoKTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgICByZXR1cm4gdGhpcy51c2VybmFtZTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBTY3JvYmJsaW5nXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICBhc3luYyBzY3JvYmJsZShwYXlsb2FkOiBTY3JvYmJsZVBheWxvYWQpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGlmICghdGhpcy50b2tlbikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbTGlzdGVuQnJhaW56XSBDYW5ub3Qgc2Nyb2JibGU6IG5vdCBhdXRoZW50aWNhdGVkJyk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBMaXN0ZW5CcmFpbnogcmVxdWlyZXMgYXQgbGVhc3QgNTAlIG9mIHRoZSB0cmFjayBvciA0IG1pbnV0ZXMgcGxheWVkXHJcbiAgICBjb25zdCBtaW5EdXJhdGlvbiA9IE1hdGgubWluKHBheWxvYWQudHJhY2suZHVyYXRpb24gKiAwLjUsIDI0MCk7XHJcbiAgICBpZiAocGF5bG9hZC5wbGF5ZWREdXJhdGlvbiA8IG1pbkR1cmF0aW9uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdbTGlzdGVuQnJhaW56XSBTa2lwcGluZyBzY3JvYmJsZTogaW5zdWZmaWNpZW50IHBsYXkgZHVyYXRpb24nKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgYWxidW0gbmFtZSAtIGhhbmRsZSBib3RoIHN0cmluZyBhbmQgb2JqZWN0IGZvcm1hdHNcclxuICAgIGNvbnN0IGFsYnVtID0gcGF5bG9hZC50cmFjay5hbGJ1bTtcclxuICAgIGNvbnN0IGFsYnVtTmFtZSA9IHR5cGVvZiBhbGJ1bSA9PT0gJ3N0cmluZydcclxuICAgICAgPyBhbGJ1bVxyXG4gICAgICA6IChhbGJ1bSBhcyB1bmtub3duIGFzIHsgdGl0bGU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZCk/LnRpdGxlO1xyXG5cclxuICAgIGNvbnN0IGxpc3RlbjogTGlzdGVuQnJhaW56TGlzdGVuID0ge1xyXG4gICAgICBsaXN0ZW5lZF9hdDogTWF0aC5mbG9vcihwYXlsb2FkLnRpbWVzdGFtcC5nZXRUaW1lKCkgLyAxMDAwKSxcclxuICAgICAgdHJhY2tfbWV0YWRhdGE6IHtcclxuICAgICAgICBhcnRpc3RfbmFtZTogcGF5bG9hZC50cmFjay5hcnRpc3QsXHJcbiAgICAgICAgdHJhY2tfbmFtZTogcGF5bG9hZC50cmFjay50aXRsZSxcclxuICAgICAgICByZWxlYXNlX25hbWU6IGFsYnVtTmFtZSxcclxuICAgICAgICBhZGRpdGlvbmFsX2luZm86IHtcclxuICAgICAgICAgIGR1cmF0aW9uX21zOiBwYXlsb2FkLnRyYWNrLmR1cmF0aW9uICogMTAwMFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBzdWJtaXNzaW9uOiBMaXN0ZW5CcmFpbnpTdWJtaXNzaW9uID0ge1xyXG4gICAgICBsaXN0ZW5fdHlwZTogJ3NpbmdsZScsXHJcbiAgICAgIHBheWxvYWQ6IFtsaXN0ZW5dXHJcbiAgICB9O1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7TElTVEVOQlJBSU5aX0FQSX0vc3VibWl0LWxpc3RlbnNgLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgVG9rZW4gJHt0aGlzLnRva2VufWAsXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ1VzZXItQWdlbnQnOiBVU0VSX0FHRU5UXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShzdWJtaXNzaW9uKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICBjb25zdCBlcnJvciA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdbTGlzdGVuQnJhaW56XSBTY3JvYmJsZSBmYWlsZWQ6JywgcmVzcG9uc2Uuc3RhdHVzLCBlcnJvcik7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnW0xpc3RlbkJyYWluel0gU2Nyb2JibGVkOicsIHBheWxvYWQudHJhY2sudGl0bGUsICdieScsIHBheWxvYWQudHJhY2suYXJ0aXN0KTtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbTGlzdGVuQnJhaW56XSBTY3JvYmJsZSBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHVwZGF0ZU5vd1BsYXlpbmcocGF5bG9hZDogTm93UGxheWluZ1BheWxvYWQpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGlmICghdGhpcy50b2tlbikge1xyXG4gICAgICBjb25zb2xlLmxvZygnW0xpc3RlbkJyYWluel0gTm8gdG9rZW4gc2V0IC0gc2tpcHBpbmcgbm93IHBsYXlpbmcnKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKCdbTGlzdGVuQnJhaW56XSBTZW5kaW5nIG5vdyBwbGF5aW5nOicsIHBheWxvYWQudHJhY2sudGl0bGUsICdieScsIHBheWxvYWQudHJhY2suYXJ0aXN0KTtcclxuXHJcbiAgICAvLyBFeHRyYWN0IGFsYnVtIG5hbWUgLSBoYW5kbGUgYm90aCBzdHJpbmcgYW5kIG9iamVjdCBmb3JtYXRzXHJcbiAgICBjb25zdCBhbGJ1bSA9IHBheWxvYWQudHJhY2suYWxidW07XHJcbiAgICBjb25zdCBhbGJ1bU5hbWUgPSB0eXBlb2YgYWxidW0gPT09ICdzdHJpbmcnXHJcbiAgICAgID8gYWxidW1cclxuICAgICAgOiAoYWxidW0gYXMgdW5rbm93biBhcyB7IHRpdGxlPzogc3RyaW5nIH0gfCB1bmRlZmluZWQpPy50aXRsZTtcclxuXHJcbiAgICAvLyBOb3RlOiBwbGF5aW5nX25vdyBzdWJtaXNzaW9ucyBtdXN0IE5PVCBpbmNsdWRlIGxpc3RlbmVkX2F0XHJcbiAgICBjb25zdCBsaXN0ZW4gPSB7XHJcbiAgICAgIHRyYWNrX21ldGFkYXRhOiB7XHJcbiAgICAgICAgYXJ0aXN0X25hbWU6IHBheWxvYWQudHJhY2suYXJ0aXN0LFxyXG4gICAgICAgIHRyYWNrX25hbWU6IHBheWxvYWQudHJhY2sudGl0bGUsXHJcbiAgICAgICAgcmVsZWFzZV9uYW1lOiBhbGJ1bU5hbWUsXHJcbiAgICAgICAgYWRkaXRpb25hbF9pbmZvOiB7XHJcbiAgICAgICAgICBkdXJhdGlvbl9tczogcGF5bG9hZC50cmFjay5kdXJhdGlvbiAqIDEwMDBcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgY29uc3Qgc3VibWlzc2lvbjogTGlzdGVuQnJhaW56U3VibWlzc2lvbiA9IHtcclxuICAgICAgbGlzdGVuX3R5cGU6ICdwbGF5aW5nX25vdycsXHJcbiAgICAgIHBheWxvYWQ6IFtsaXN0ZW5dXHJcbiAgICB9O1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7TElTVEVOQlJBSU5aX0FQSX0vc3VibWl0LWxpc3RlbnNgLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgVG9rZW4gJHt0aGlzLnRva2VufWAsXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ1VzZXItQWdlbnQnOiBVU0VSX0FHRU5UXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShzdWJtaXNzaW9uKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmIChyZXNwb25zZS5vaykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTGlzdGVuQnJhaW56XSBOb3cgcGxheWluZyBzZW50IHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdbTGlzdGVuQnJhaW56XSBOb3cgcGxheWluZyBmYWlsZWQ6JywgcmVzcG9uc2Uuc3RhdHVzLCBlcnJvclRleHQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzcG9uc2Uub2s7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbTGlzdGVuQnJhaW56XSBOb3cgcGxheWluZyBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBGZWVkYmFjayAoTG92ZS9IYXRlKVxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgYXN5bmMgc3VibWl0RmVlZGJhY2socmVjb3JkaW5nTWJpZDogc3RyaW5nLCBzY29yZTogMSB8IC0xIHwgMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgaWYgKCF0aGlzLnRva2VuKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke0xJU1RFTkJSQUlOWl9BUEl9L2ZlZWRiYWNrL3JlY29yZGluZy1mZWVkYmFja2AsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBUb2tlbiAke3RoaXMudG9rZW59YCxcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnVXNlci1BZ2VudCc6IFVTRVJfQUdFTlRcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIHJlY29yZGluZ19tYmlkOiByZWNvcmRpbmdNYmlkLFxyXG4gICAgICAgICAgc2NvcmVcclxuICAgICAgICB9KVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiByZXNwb25zZS5vaztcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gSW1wb3J0IChBZGRpdGlvbmFsIE1ldGhvZHMpXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAvKipcclxuICAgKiBJbXBvcnQgbGlzdGVuaW5nIGhpc3RvcnkgZnJvbSBMaXN0ZW5CcmFpbnpcclxuICAgKi9cclxuICBhc3luYyBpbXBvcnRMaXN0ZW5zKG1heENvdW50OiBudW1iZXIgPSAxMDAwKTogUHJvbWlzZTx7XHJcbiAgICB0cmFja3M6IEFycmF5PHtcclxuICAgICAgdGl0bGU6IHN0cmluZztcclxuICAgICAgYXJ0aXN0OiBzdHJpbmc7XHJcbiAgICAgIGFsYnVtPzogc3RyaW5nO1xyXG4gICAgICBwbGF5ZWRBdDogRGF0ZTtcclxuICAgICAgbWJpZD86IHN0cmluZztcclxuICAgIH0+O1xyXG4gICAgZXJyb3I/OiBzdHJpbmc7XHJcbiAgfT4ge1xyXG4gICAgaWYgKCF0aGlzLnRva2VuIHx8ICF0aGlzLnVzZXJuYW1lKSB7XHJcbiAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBhd2FpdCB0aGlzLnZhbGlkYXRlVG9rZW4oKTtcclxuICAgICAgaWYgKCF2YWxpZGF0aW9uLnZhbGlkKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgdHJhY2tzOiBbXSwgZXJyb3I6ICdOb3QgYXV0aGVudGljYXRlZCcgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRyYWNrczogQXJyYXk8e1xyXG4gICAgICB0aXRsZTogc3RyaW5nO1xyXG4gICAgICBhcnRpc3Q6IHN0cmluZztcclxuICAgICAgYWxidW0/OiBzdHJpbmc7XHJcbiAgICAgIHBsYXllZEF0OiBEYXRlO1xyXG4gICAgICBtYmlkPzogc3RyaW5nO1xyXG4gICAgfT4gPSBbXTtcclxuICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICBsZXQgbWF4VHM6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICB3aGlsZSAoY291bnQgPCBtYXhDb3VudCkge1xyXG4gICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoYCR7TElTVEVOQlJBSU5aX0FQSX0vdXNlci8ke3RoaXMudXNlcm5hbWV9L2xpc3RlbnNgKTtcclxuICAgICAgICB1cmwuc2VhcmNoUGFyYW1zLnNldCgnY291bnQnLCBTdHJpbmcoTWF0aC5taW4oMTAwLCBtYXhDb3VudCAtIGNvdW50KSkpO1xyXG4gICAgICAgIGlmIChtYXhUcykge1xyXG4gICAgICAgICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ21heF90cycsIFN0cmluZyhtYXhUcykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwudG9TdHJpbmcoKSwge1xyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBUb2tlbiAke3RoaXMudG9rZW59YCxcclxuICAgICAgICAgICAgJ1VzZXItQWdlbnQnOiBVU0VSX0FHRU5UXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKSBhcyB7XHJcbiAgICAgICAgICBwYXlsb2FkOiB7XHJcbiAgICAgICAgICAgIGxpc3RlbnM6IExpc3RlbkJyYWluekxpc3RlbltdO1xyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBsaXN0ZW5zID0gZGF0YS5wYXlsb2FkPy5saXN0ZW5zIHx8IFtdO1xyXG4gICAgICAgIGlmIChsaXN0ZW5zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGxpc3RlbiBvZiBsaXN0ZW5zKSB7XHJcbiAgICAgICAgICB0cmFja3MucHVzaCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiBsaXN0ZW4udHJhY2tfbWV0YWRhdGEudHJhY2tfbmFtZSxcclxuICAgICAgICAgICAgYXJ0aXN0OiBsaXN0ZW4udHJhY2tfbWV0YWRhdGEuYXJ0aXN0X25hbWUsXHJcbiAgICAgICAgICAgIGFsYnVtOiBsaXN0ZW4udHJhY2tfbWV0YWRhdGEucmVsZWFzZV9uYW1lLFxyXG4gICAgICAgICAgICBwbGF5ZWRBdDogbmV3IERhdGUoKGxpc3Rlbi5saXN0ZW5lZF9hdCA/PyAwKSAqIDEwMDApLFxyXG4gICAgICAgICAgICBtYmlkOiBsaXN0ZW4udHJhY2tfbWV0YWRhdGEuYWRkaXRpb25hbF9pbmZvPy5yZWNvcmRpbmdfbWJpZFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWF4VHMgPSBsaXN0ZW5zW2xpc3RlbnMubGVuZ3RoIC0gMV0hLmxpc3RlbmVkX2F0ID8/IDA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7IHRyYWNrcyB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIHsgdHJhY2tzLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW1wb3J0IGxvdmVkIHRyYWNrcyBmcm9tIExpc3RlbkJyYWluelxyXG4gICAqL1xyXG4gIGFzeW5jIGltcG9ydExvdmVkVHJhY2tzKG1heENvdW50OiBudW1iZXIgPSA1MDApOiBQcm9taXNlPHtcclxuICAgIHRyYWNrczogQXJyYXk8e1xyXG4gICAgICB0aXRsZTogc3RyaW5nO1xyXG4gICAgICBhcnRpc3Q6IHN0cmluZztcclxuICAgICAgYWxidW0/OiBzdHJpbmc7XHJcbiAgICAgIG1iaWQ/OiBzdHJpbmc7XHJcbiAgICB9PjtcclxuICAgIGVycm9yPzogc3RyaW5nO1xyXG4gIH0+IHtcclxuICAgIGlmICghdGhpcy50b2tlbiB8fCAhdGhpcy51c2VybmFtZSkge1xyXG4gICAgICBjb25zdCB2YWxpZGF0aW9uID0gYXdhaXQgdGhpcy52YWxpZGF0ZVRva2VuKCk7XHJcbiAgICAgIGlmICghdmFsaWRhdGlvbi52YWxpZCkge1xyXG4gICAgICAgIHJldHVybiB7IHRyYWNrczogW10sIGVycm9yOiAnTm90IGF1dGhlbnRpY2F0ZWQnIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKGAke0xJU1RFTkJSQUlOWl9BUEl9L2ZlZWRiYWNrL3VzZXIvJHt0aGlzLnVzZXJuYW1lfS9nZXQtZmVlZGJhY2tgKTtcclxuICAgICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2NvdW50JywgU3RyaW5nKG1heENvdW50KSk7XHJcbiAgICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KCdzY29yZScsICcxJyk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybC50b1N0cmluZygpLCB7XHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgVG9rZW4gJHt0aGlzLnRva2VufWAsXHJcbiAgICAgICAgICAnVXNlci1BZ2VudCc6IFVTRVJfQUdFTlRcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIHJldHVybiB7IHRyYWNrczogW10sIGVycm9yOiBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c31gIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCkgYXMge1xyXG4gICAgICAgIGZlZWRiYWNrOiBMaXN0ZW5CcmFpbnpGZWVkYmFja1tdO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgdHJhY2tzID0gKGRhdGEuZmVlZGJhY2sgfHwgW10pXHJcbiAgICAgICAgLmZpbHRlcihmID0+IGYudHJhY2tfbWV0YWRhdGEpXHJcbiAgICAgICAgLm1hcChmZWVkYmFjayA9PiAoe1xyXG4gICAgICAgICAgdGl0bGU6IGZlZWRiYWNrLnRyYWNrX21ldGFkYXRhIS50cmFja19uYW1lLFxyXG4gICAgICAgICAgYXJ0aXN0OiBmZWVkYmFjay50cmFja19tZXRhZGF0YSEuYXJ0aXN0X25hbWUsXHJcbiAgICAgICAgICBhbGJ1bTogZmVlZGJhY2sudHJhY2tfbWV0YWRhdGEhLnJlbGVhc2VfbmFtZSxcclxuICAgICAgICAgIG1iaWQ6IGZlZWRiYWNrLnJlY29yZGluZ19tYmlkXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgcmV0dXJuIHsgdHJhY2tzIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4geyB0cmFja3M6IFtdLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIFN0YXRpc3RpY3NcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG4gIGFzeW5jIGdldFVzZXJTdGF0cyhyYW5nZTogJ3dlZWsnIHwgJ21vbnRoJyB8ICd5ZWFyJyB8ICdhbGxfdGltZScgPSAnYWxsX3RpbWUnKTogUHJvbWlzZTx7XHJcbiAgICB0b3RhbExpc3RlbnM/OiBudW1iZXI7XHJcbiAgICB0b3BBcnRpc3RzPzogQXJyYXk8eyBuYW1lOiBzdHJpbmc7IGNvdW50OiBudW1iZXIgfT47XHJcbiAgICB0b3BUcmFja3M/OiBBcnJheTx7IHRpdGxlOiBzdHJpbmc7IGFydGlzdDogc3RyaW5nOyBjb3VudDogbnVtYmVyIH0+O1xyXG4gIH0gfCBudWxsPiB7XHJcbiAgICBpZiAoIXRoaXMudXNlcm5hbWUpIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgaGVhZGVycyA9IHsgJ1VzZXItQWdlbnQnOiBVU0VSX0FHRU5UIH07XHJcblxyXG4gICAgICBjb25zdCBjb3VudFJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7TElTVEVOQlJBSU5aX0FQSX0vdXNlci8ke3RoaXMudXNlcm5hbWV9L2xpc3Rlbi1jb3VudGAsIHsgaGVhZGVycyB9KTtcclxuICAgICAgY29uc3QgY291bnREYXRhID0gYXdhaXQgY291bnRSZXNwb25zZS5qc29uKCkgYXMgeyBwYXlsb2FkOiB7IGNvdW50OiBudW1iZXIgfSB9O1xyXG5cclxuICAgICAgY29uc3QgYXJ0aXN0c1Jlc3BvbnNlID0gYXdhaXQgZmV0Y2goXHJcbiAgICAgICAgYCR7TElTVEVOQlJBSU5aX0FQSX0vc3RhdHMvdXNlci8ke3RoaXMudXNlcm5hbWV9L2FydGlzdHM/cmFuZ2U9JHtyYW5nZX0mY291bnQ9MTBgLFxyXG4gICAgICAgIHsgaGVhZGVycyB9XHJcbiAgICAgICk7XHJcbiAgICAgIGNvbnN0IGFydGlzdHNEYXRhID0gYXdhaXQgYXJ0aXN0c1Jlc3BvbnNlLmpzb24oKSBhcyB7XHJcbiAgICAgICAgcGF5bG9hZDoge1xyXG4gICAgICAgICAgYXJ0aXN0czogQXJyYXk8eyBhcnRpc3RfbmFtZTogc3RyaW5nOyBsaXN0ZW5fY291bnQ6IG51bWJlciB9PjtcclxuICAgICAgICB9O1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVjb3JkaW5nc1Jlc3BvbnNlID0gYXdhaXQgZmV0Y2goXHJcbiAgICAgICAgYCR7TElTVEVOQlJBSU5aX0FQSX0vc3RhdHMvdXNlci8ke3RoaXMudXNlcm5hbWV9L3JlY29yZGluZ3M/cmFuZ2U9JHtyYW5nZX0mY291bnQ9MTBgLFxyXG4gICAgICAgIHsgaGVhZGVycyB9XHJcbiAgICAgICk7XHJcbiAgICAgIGNvbnN0IHJlY29yZGluZ3NEYXRhID0gYXdhaXQgcmVjb3JkaW5nc1Jlc3BvbnNlLmpzb24oKSBhcyB7XHJcbiAgICAgICAgcGF5bG9hZDoge1xyXG4gICAgICAgICAgcmVjb3JkaW5nczogQXJyYXk8e1xyXG4gICAgICAgICAgICB0cmFja19uYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIGFydGlzdF9uYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIGxpc3Rlbl9jb3VudDogbnVtYmVyO1xyXG4gICAgICAgICAgfT47XHJcbiAgICAgICAgfTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdG90YWxMaXN0ZW5zOiBjb3VudERhdGEucGF5bG9hZD8uY291bnQsXHJcbiAgICAgICAgdG9wQXJ0aXN0czogYXJ0aXN0c0RhdGEucGF5bG9hZD8uYXJ0aXN0cz8ubWFwKGEgPT4gKHtcclxuICAgICAgICAgIG5hbWU6IGEuYXJ0aXN0X25hbWUsXHJcbiAgICAgICAgICBjb3VudDogYS5saXN0ZW5fY291bnRcclxuICAgICAgICB9KSksXHJcbiAgICAgICAgdG9wVHJhY2tzOiByZWNvcmRpbmdzRGF0YS5wYXlsb2FkPy5yZWNvcmRpbmdzPy5tYXAociA9PiAoe1xyXG4gICAgICAgICAgdGl0bGU6IHIudHJhY2tfbmFtZSxcclxuICAgICAgICAgIGFydGlzdDogci5hcnRpc3RfbmFtZSxcclxuICAgICAgICAgIGNvdW50OiByLmxpc3Rlbl9jb3VudFxyXG4gICAgICAgIH0pKVxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgTGlzdGVuQnJhaW56UHJvdmlkZXI7XHJcbiJdfQ==