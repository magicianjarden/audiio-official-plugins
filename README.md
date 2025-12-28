# Audiio Official Plugins

Official plugins for the [Audiio](https://github.com/magicianjarden/audiio-official) music platform.

## Available Plugins

| Plugin | Description | Roles |
|--------|-------------|-------|
| `@audiio/plugin-deezer` | Deezer metadata provider - track, album, and artist information | `metadata-provider` |
| `@audiio/plugin-youtube-music` | YouTube Music stream provider - audio streaming and search | `stream-provider` |
| `@audiio/plugin-applemusic` | Apple Music artwork provider - high-quality album art | `metadata-provider` |
| `@audiio/plugin-lrclib` | LRCLIB lyrics provider - synced and plain lyrics | `lyrics-provider` |
| `@audiio/plugin-karaoke` | Karaoke audio processor - vocal isolation and karaoke mode | `audio-processor` |
| `@audiio/plugin-sposify` | Spotify data integration - import history, audio features, ISRC matching | `metadata-provider` |
| `@audiio/plugin-algo` | Official Audiio ML recommendation algorithm | `audio-processor` |

## Installation

Plugins are installed via npm and automatically discovered by Audiio:

```bash
npm install @audiio/plugin-deezer
npm install @audiio/plugin-youtube-music
```

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/magicianjarden/audiio-official-plugins.git
cd audiio-official-plugins

# Install dependencies
npm install

# Build all plugins
npm run build
```

### Creating a New Plugin

1. Create a new package in the `packages/` directory:
   ```bash
   mkdir packages/plugin-your-name
   cd packages/plugin-your-name
   ```

2. Create a `package.json`:
   ```json
   {
     "name": "@audiio/plugin-your-name",
     "version": "1.0.0",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "audiio": {
       "type": "plugin",
       "id": "your-name",
       "roles": ["metadata-provider"]
     },
     "peerDependencies": {
       "@audiio/sdk": "^0.1.0"
     }
   }
   ```

3. Implement your plugin by extending the appropriate base class:
   - `BaseMetadataProvider` - For metadata providers
   - `BaseStreamProvider` - For stream providers
   - `BaseLyricsProvider` - For lyrics providers
   - `BaseAudioProcessor` - For audio processors

4. Export your class as the default export.

See the [@audiio/sdk documentation](https://github.com/magicianjarden/audiio-official/tree/main/packages/sdk) for complete API reference.

## Plugin Roles

- **`metadata-provider`** - Provides track, album, and artist metadata
- **`stream-provider`** - Resolves playable audio stream URLs
- **`lyrics-provider`** - Fetches song lyrics (plain or synced)
- **`audio-processor`** - Processes audio (effects, analysis, etc.)
- **`scrobbler`** - Reports listening history to external services

## License

MIT
