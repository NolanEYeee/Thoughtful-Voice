const esbuild = require('esbuild');

async function build() {
    try {
        await esbuild.build({
            entryPoints: ['src/content/main.js'],
            bundle: true,
            outfile: 'dist/content.bundle.js',
            platform: 'browser',
            format: 'iife', // Immediately Invoked Function Expression for content script isolation
            target: ['chrome100'],
        });
        console.log('Built content script');

        await esbuild.build({
            entryPoints: ['src/popup/popup.js'],
            bundle: true,
            outfile: 'dist/popup.bundle.js',
            platform: 'browser',
            target: ['chrome100'],
        });
        console.log('Built popup script');

    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();
