// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import fs from 'fs';
import fullReload from 'vite-plugin-full-reload';
import viteImagemin from 'vite-plugin-imagemin';
import eslintPlugin from 'vite-plugin-eslint';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import { visualizer } from 'rollup-plugin-visualizer';
import mpaPlus from 'vite-plugin-mpa-plus';
import sitemap from 'vite-plugin-sitemap';
import { robots } from 'vite-plugin-robots';
import { VitePWA } from 'vite-plugin-pwa';
import critical from 'rollup-plugin-critical';
import webfontDownload from 'vite-plugin-webfont-dl';

const loadJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const loadHTML = (p) => fs.readFileSync(p, 'utf-8');

const loadPartial = (name) => {
	try {
		return fs.readFileSync(
			path.resolve(__dirname, `src/pages/_partials/${name}.html`),

			'utf-8'
		);
	} catch (err) {
		console.error(`Błąd ładowania partiala ${name}:`, err);
		return '';
	}
};

const partials = {
	header: loadPartial('header'),
	nav: loadPartial('nav'),
	footer: loadPartial('footer'),
};

// Funkcja do znajdowania wszystkich plików HTML w src/pages/
const getHtmlFiles = (dir, basePath = '') => {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	let routes = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			routes = [
				...routes,
				...getHtmlFiles(fullPath, `${basePath}/${entry.name}`),
			];
		} else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
			routes.push(`${basePath}/${entry.name}`);
		}
	}

	return routes;
};

const dynamicRoutes = [
	'/', // główny index.html
	...getHtmlFiles(path.resolve(__dirname, 'src/pages'))
		.map((route) => route.replace('/index.html', '')) // /folder/index.html → /folder/
		.filter((route) => !route.includes('_partials')), // ignoruj partiale
];

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_'); // ← KLUCZOWE!

	return {
		esbuild: {
			drop: mode === 'production' ? ['console', 'debugger'] : [],
		},

		resolve: {
			alias: {
				'@': path.resolve(__dirname, 'src'),
				'@styles': path.resolve(__dirname, 'styles'),
			},
		},
		plugins: [
			eslintPlugin({
				include: ['src/**/*.js'],
				failOnError: true,
				emitWarning: true,
				emitError: true,
			}),
			robots({
				host: 'https://erectio.pl',
				sitemap: 'https://erectio.pl/sitemap.xml',
				policies: [
					{
						userAgent: '*',
						allow: ['/'],
						// disallow: ['/private', '/admin'],
					},
				],
				additionalDirectives: [
					'Crawl-delay: 10',
					'Clean-param: utm_source&utm_medium&utm_campaign',
				],
			}),
			fullReload(['src/pages/**/*.html', 'src/pages/_partials/**/*.html']),
			viteImagemin({
				avif: { quality: 90, speed: 6 },
				webp: { quality: 85 },
				mozjpeg: { quality: 90 },
				pngquant: { quality: [0.8, 0.9], speed: 4 },
				svgo: {
					plugins: [
						{ name: 'removeViewBox', active: false },
						{
							name: 'preset-default',
							params: {
								overrides: {
									removeTitle: false,
									removeDesc: false,
								},
							},
						},
					],
				},
			}),
			createSvgIconsPlugin({
				iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
				symbolId: 'icon-[name]',
				inject: 'body-first',
				customDomId: '__svg__icons__dom__',
			}),
			visualizer({
				filename: './dist/report.html',
				open: true,
				gzipSize: true,
				brotliSize: true,
			}),
			mpaPlus({
				pages: Object.fromEntries(
					['index', 'zaburzenia-erekcji'].map((name) => {
						const vars = loadJSON(`src/pages/variables/${name}.json`);
						return [
							name,
							{
								entry: `src/pages/${name}.html`,
								template: 'src/pages/base.html',
								filename: name === 'index' ? 'index.html' : `${name}.html`,
								inject: {
									data: {
										title: vars.title,
										desc: vars.desc,
										keywords: vars.keywords,
										url: vars.url,
										jsUrl: vars.jsUrl,
									},
									// partiale:
									header: loadHTML('src/pages/_partials/header.html'),
									nav: loadHTML('src/pages/_partials/nav.html'),
									footer: loadHTML('src/pages/_partials/footer.html'),
								},
							},
						];
					})
				),
				minify: true,
			}),
			{
				name: 'html-partials',
				transformIndexHtml(html) {
					return html
						.replace('<!-- PARTIAL_HEADER -->', partials.header)
						.replace('<!-- PARTIAL_NAV -->', partials.nav)
						.replace('<!-- PARTIAL_FOOTER -->', partials.footer);
				},
			},
			/** * KORZYSTAJ Z env.VITE_HOSTNAME ZAMIENIAJĄC import.meta.env.VITE_HOSTNAME */
			sitemap({
				hostname: env.VITE_HOSTNAME,
				dynamicRoutes,
				exclude: ['/private'],
				outDir: 'dist',
				extensions: 'html',
			}),
			webfontDownload(),
			VitePWA({
				registerType: 'autoUpdate',
				includeAssets: ['favicon.ico', 'icons/*.svg', 'images/*.png'],
				manifest: {
					name: 'Erectio',
					short_name: 'Erectio',
					description: 'Platforma wsparcia zdrowia mężczyzn',
					theme_color: '#FF7A0D',
					background_color: '#FFFFFF',
					display: 'standalone',
					scope: '/',
					start_url: '/',
					icons: [
						{ src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
						{ src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
						{
							src: 'icons/pwa-maskable.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable',
						},
					],
				},
				workbox: {
					maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
					globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
					runtimeCaching: [
						{
							urlPattern: /(\/|\.(html))$/,
							handler: 'NetworkFirst',
							options: {
								cacheName: 'html-cache',
								expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
								networkTimeoutSeconds: 5,
							},
						},
						{
							urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
							handler: 'CacheFirst',
							options: {
								cacheName: 'image-cache',
								expiration: {
									maxEntries: 100,
									maxAgeSeconds: 60 * 60 * 24 * 30,
								},
							},
						},
						{
							urlPattern: /\.(?:js|css)$/,
							handler: 'StaleWhileRevalidate',
							options: {
								cacheName: 'asset-cache',
								expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
							},
						},
					],
				},
				devOptions: {
					enabled: env.VITE_PWA_ENABLED === 'true',
					type: 'module',
					navigateFallback: '/index.html',
				},
			}),
		],
		build: {
			rollupOptions: {
				plugins: [
					critical({
						criticalUrl: '',
						// ten sam folder, do którego zapisujemy CSS
						criticalBase: './dist/',
						// dokładne pliki HTML, które mają dostać critical CSS
						criticalPages: [
							{ uri: 'index.html', template: 'index' },
							{
								uri: 'zaburzenia-erekcji.html',
								template: 'zaburzenia-erekcji',
							},
						],
						// 4) przekazujemy tylko te opcje do generatora critical
						criticalConfig: {
							base: './dist/',
							inline: true,
							dimensions: [
								{ width: 319, height: 742 },
								{ width: 743, height: 1199 },
							],
							cleanCSS: {
								level: {
									1: { all: true },
									2: { removeDuplicateRules: true },
								},
							},
						},
					}),
				],
			},
		},
	};
});
