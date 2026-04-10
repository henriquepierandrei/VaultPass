# VaultPass — Secure Desktop Password Manager

A production-ready, cross-platform desktop password manager built with Electron, React, TypeScript, and Tailwind CSS. Features AES-256-GCM encryption, import/export from all major password managers, a built-in password generator, and a polished dark/light UI.

![VaultPass](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

---

## Features

### Security
- **AES-256-GCM encryption** for all sensitive data
- **PBKDF2 key derivation** with 100,000 iterations (SHA-256)
- Master key **never stored on disk** — derived in memory only
- **Unique IV** (12 bytes random) per encryption operation
- **GCM authentication tag** verification to detect tampering
- **Brute-force protection**: progressive lockout (3 attempts → 30s, 5 → 5min, 10 → permanent)
- **Configurable session timeout** (5, 15, 30, 60 min) with auto-lock
- **Password history** tracking (last 5 versions per entry)

### Core Functionality
- Create, edit, duplicate, and delete vault entries
- Real-time search across title, username, URL, description, and tags
- Filter by category, favorites, and password strength
- Sort by name, creation date, update date, or strength
- Copy password/username/URL to clipboard with auto-clear (30s)
- Favorite entries with star animation
- Automatic favicon fetching via Google Favicon API

### Password Generator
- Configurable length: 8–128 characters
- Toggles: uppercase, lowercase, numbers, symbols
- Exclude ambiguous characters (0, O, l, I)
- Custom character exclusion list
- Generate 1–10 passwords at once
- Visual strength indicator with entropy calculation
- Crack time estimation (based on 10B guesses/sec)
- One-click "Use this password" to fill forms

### Import / Export
- **Import from**: CSV (with column mapping), JSON, Bitwarden, LastPass, 1Password, KeePass XML
- **Export to**: Encrypted .vault (backup), JSON, CSV (with optional masking), PDF
- Native file dialogs for file selection
- Automatic versioned backups before each save

### UI / UX
- **Dark and Light themes** with smooth transitions
- Custom design system with Tailwind CSS
- Responsive sidebar (collapsed 64px / expanded 240px)
- Detail drawer for entry viewing
- Skeleton loading states
- Empty state illustrations
- Toast notifications for all actions
- Full keyboard navigation and accessibility (WCAG AA)
- Material Symbols Rounded icons

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New entry |
| `Ctrl+F` | Focus search |
| `Ctrl+G` | Open password generator |
| `Ctrl+L` | Lock vault |
| `Ctrl+,` | Open settings |
| `Escape` | Close modal/drawer |
| `Ctrl+C` (on password field) | Copy without revealing |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Electron 33 (LTS) |
| **Language** | TypeScript 5+ (strict mode, all files) |
| **UI** | React 18 (functional components + hooks) |
| **Styling** | Tailwind CSS v3 (custom design system) |
| **Bundler** | Vite 6 + electron-vite |
| **State** | Zustand 5 |
| **Routing** | React Router v6 |
| **Forms** | React Hook Form + Zod |
| **Build** | Electron Builder (NSIS, DMG, AppImage) |
| **Testing** | Vitest (unit) + Playwright (E2E) |
| **Icons** | Google Material Symbols Rounded |
| **Fonts** | Inter (@fontsource) |

---

## Project Structure

```
vaultpass/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # App entry point, window creation
│   │   ├── ipc-handlers.ts      # All IPC channel handlers
│   │   ├── crypto.ts            # AES-256-GCM encryption utilities
│   │   ├── password-generator.ts # Secure password generation
│   │   └── import-export.ts     # Import/export format handlers
│   ├── preload/
│   │   └── preload.ts           # contextBridge API exposure
│   ├── renderer/                # React application
│   │   ├── App.tsx              # Root component with routing
│   │   ├── main.tsx             # React entry point
│   │   ├── index.html           # HTML template
│   │   ├── global.d.ts          # Window API type declarations
│   │   ├── styles/
│   │   │   └── index.css        # Tailwind + custom design system
│   │   ├── pages/
│   │   │   ├── Login.tsx        # Vault unlock page
│   │   │   ├── Setup.tsx        # First-time setup page
│   │   │   ├── Dashboard.tsx    # Main vault view
│   │   │   ├── Settings.tsx     # App settings
│   │   │   └── Audit.tsx        # Security audit page
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── EntryCard.tsx
│   │   │   ├── EntryForm.tsx
│   │   │   ├── EntryDrawer.tsx
│   │   │   ├── GeneratorModal.tsx
│   │   │   ├── PasswordStrengthBar.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── SkeletonCard.tsx
│   │   │   └── ImportExportModal.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts     # Authentication state
│   │   │   ├── vaultStore.ts    # Vault entries, filters, sorting
│   │   │   ├── settingsStore.ts # App settings
│   │   │   └── generatorStore.ts # Password generator state
│   │   ├── hooks/
│   │   │   └── useHooks.ts      # Custom React hooks
│   │   └── utils/
│   │       ├── clipboard.ts     # Clipboard with auto-clear
│   │       └── password-strength.ts # Strength calculation
│   └── shared/
│       ├── types.ts             # Shared TypeScript types
│       └── constants.ts         # App-wide constants
├── tests/
│   ├── unit/
│   │   ├── crypto.test.ts
│   │   ├── password-generator.test.ts
│   │   └── import-export.test.ts
│   └── e2e/                     # Playwright tests
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── electron-builder.config.ts
├── playwright.config.ts
├── vitest.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+ or **pnpm** 8+

### Installation

```bash
# Clone or navigate to the project directory
cd vaultpass

# Install dependencies
npm install
```

### Development

```bash
# Start the app in development mode with HMR
npm run dev
```

This launches the Electron app with Vite hot module reloading. Changes to the renderer will update instantly. Changes to main/preload require a restart.

### Building

```bash
# Build for the current platform
npm run build

# Output:
#   Windows: release/VaultPass-Setup.exe (NSIS installer)
#   macOS:   release/VaultPass-{version}.dmg
#   Linux:   release/VaultPass-{version}.AppImage
```

### Preview Production Build

```bash
# Build and run the production build locally
npm run preview
```

### Testing

```bash
# Run unit tests with Vitest
npm test

# Run E2E tests with Playwright
npm run test:e2e
```

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Format all files with Prettier
npm run format
```

---

## Usage

### First Launch

1. On first launch, you'll be prompted to **create a master password**
2. Your master password must be at least 12 characters with uppercase, lowercase, numbers, and symbols
3. Optionally add a memory hint (stored locally only, never with the vault)
4. Click **Create Vault**

### Unlocking

1. Enter your master password
2. Click **Unlock**
3. After a configurable timeout, the vault auto-locks and clears the master key from memory

### Adding Entries

1. Click **+ New Entry** or press `Ctrl+N`
2. Fill in the service details
3. Use the **Generate Password** button for strong passwords
4. Save — the vault auto-saves after each change

### Searching & Filtering

- Use the **search bar** at the top (debounced at 200ms)
- Filter by **category** in the sidebar
- Toggle **Favorites** to see starred entries
- Filter by **password strength** to find weak entries

### Importing from Other Password Managers

1. Open **Import/Export** from the sidebar
2. Select the **Import** tab
3. Choose your source format (Bitwarden, LastPass, 1Password, KeePass, CSV, JSON)
4. Select the exported file
5. For CSV: map your columns to VaultPass fields
6. Click **Import**

### Exporting

1. Open **Import/Export** from the sidebar
2. Select the **Export** tab
3. Choose your export format
4. Select a save location
5. ⚠️ **Warning**: Unencrypted exports (JSON, CSV, PDF) contain your passwords in plaintext

### Security Audit

Navigate to the **Security Audit** page to see:
- Entries with **weak passwords**
- **Reused passwords** across services
- **Old passwords** (>90 days since last update)
- Click **Fix** on any entry to edit it directly

---

## Security Architecture

```
┌─────────────────────────────────────────────┐
│                  Renderer                   │
│   (React UI — no access to crypto/keys)     │
│   window.api.* → IPC invoke calls only      │
└──────────────────┬──────────────────────────┘
                   │ IPC (invoke/handle)
                   │ contextBridge isolated
┌──────────────────▼──────────────────────────┐
│              Main Process                   │
│  ┌───────────────────────────────────────┐  │
│  │           IPC Handlers               │  │
│  │  (Validates all input from renderer)  │  │
│  └───────────────────┬───────────────────┘  │
│                      │                       │
│  ┌───────────────────▼───────────────────┐  │
│  │        Crypto Module                  │  │
│  │  AES-256-GCM | PBKDF2 (100K iters)   │  │
│  │  Master key: in-memory only           │  │
│  └───────────────────┬───────────────────┘  │
│                      │                       │
│  ┌───────────────────▼───────────────────┐  │
│  │       Vault File (.vault)             │  │
│  │  { version, salt, iv, tag, data }     │  │
│  │  Saved to user-configurable path      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Key security properties:**
- `contextIsolation: true` — renderer cannot access Node.js APIs
- `nodeIntegration: false` — no require() in renderer
- `sandbox: true` — renderer runs in isolated sandbox
- Master key exists **only in main process memory**
- Key is **zeroed on lock** (logout, timeout, manual lock)
- Each encryption uses a **unique random IV**
- GCM **authentication tag** prevents ciphertext tampering

---

## Configuration

### Settings

All settings are managed via the Settings page and persisted using `electron-store`:

| Setting | Options | Default |
|---------|---------|---------|
| Theme | Dark / Light | Dark |
| Session Timeout | 5, 15, 30, 60 min | 15 min |
| Vault Path | User-selectable | Documents/vaultpass.vault |
| Auto Backup | On / Off | On |
| Backup Path | User-selectable | Same as vault dir |

### Custom Vault Location

In Settings → Storage, you can browse and select a custom location for your `.vault` file. This is useful for syncing with cloud storage (e.g., Dropbox, OneDrive).

---

## Keyboard Shortcuts Reference

| Shortcut | Description |
|----------|-------------|
| `Ctrl + N` | Create a new vault entry |
| `Ctrl + F` | Focus the search input |
| `Ctrl + G` | Open the Password Generator modal |
| `Ctrl + L` | Lock the vault immediately |
| `Ctrl + ,` | Open Settings page |
| `Escape` | Close any open modal or drawer |
| `Tab` | Navigate between form fields |
| `Ctrl + C` (on password field) | Copy password without revealing |

---

## Troubleshooting

### Vault won't unlock
- Verify your master password (case-sensitive)
- Check that the vault file path in Settings is correct
- If brute-force locked, wait for the lockout timer to expire

### Forgot master password
- VaultPass **cannot recover** your master password (it's never stored)
- If you have a backup `.vault` file and remember the old password, you can restore
- Always keep a secure offline backup of your master password

### Import fails
- Ensure the exported file is in the correct format
- For CSV, verify column mapping in the import dialog
- KeePass XML: ensure it's exported from KeePass 2.x

### App crashes on startup
- Delete the `electron-store` config file:
  - Windows: `%APPDATA%/vaultpass/`
  - macOS: `~/Library/Application Support/vaultpass/`
  - Linux: `~/.config/vaultpass/`

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Run linter: `npm run lint`
6. Commit with conventional commit messages
7. Submit a Pull Request

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **AES-256-GCM** and **PBKDF2** implementations via Node.js `crypto` module
- **Material Symbols Rounded** by Google (Apache 2.0)
- **Inter** font family by Rasmus Andersson (OFL)
- Inspired by Bitwarden, 1Password, and KeePass

---

**Built with ♥ using Electron, React, TypeScript, and Tailwind CSS**
