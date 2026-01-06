# Audiio Official Plugins

Official plugins for the [Audiio](https://github.com/magicianjarden/audiio-official) music platform.

## Available Plugins

| Plugin | Description | Type |
|--------|-------------|------|
| `local-library` | Local music library scanner and database | `library` |
| `plugin-deezer` | Deezer metadata and search provider | `metadata-provider` |
| `plugin-fanart` | Fanart.tv artist images and backgrounds | `metadata-provider` |
| `plugin-listenbrainz` | ListenBrainz scrobbling integration | `scrobbler` |
| `plugin-lrclib` | LRCLIB lyrics provider - synced and plain lyrics | `lyrics-provider` |
| `plugin-spotify-import` | Import Spotify library and playlists | `importer` |
| `plugin-youtube-music` | YouTube Music stream provider | `stream-provider` |
| `youtube-videos` | YouTube video search and playback | `stream-provider` |

## Installation

Plugins are loaded by the Audiio server from the `plugins` directory.

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

1. Create a new package in the `packages/` directory
2. Follow the plugin structure from existing plugins
3. Export your plugin class as the default export

See the [@audiio/sdk documentation](https://github.com/magicianjarden/audiio-official/tree/main/packages/shared/sdk) for complete API reference.

## License

MIT
