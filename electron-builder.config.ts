import type { Configuration } from 'electron-builder';

const config: Configuration = {
  appId: 'com.vaultpass.app',
  productName: 'VaultPass',
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: ['dist/**/*', 'package.json'],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'assets/logo.png',
  },
  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  mac: {
    target: ['dmg'],
    icon: 'build/icon.icns',
    category: 'public.app-category.utilities',
  },
  linux: {
    target: ['AppImage'],
    icon: 'build/icon.png',
    category: 'Utility',
  },
  extraMetadata: {
    main: 'dist/main/main.js',
  },
};

export default config;
