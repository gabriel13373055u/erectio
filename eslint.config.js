// eslint.config.js
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				window: true,
				document: true,
				// inne globalne, jeśli potrzebujesz...
			},
		},
		plugins: {
			import: importPlugin,
		},
		rules: {
			// Styl kodu
			semi: ['error', 'always'],
			quotes: ['error', 'single', { avoidEscape: true }],
			indent: ['error', 'tab'],

			// Console.log
			'no-console': ['warn', { allow: ['warn', 'error'] }],

			// Reguły importu (ważniejsze z pluginu import)
			'import/no-unresolved': 'error',
			'import/named': 'error',
			'import/default': 'error',
			'import/namespace': 'error',
			'import/no-absolute-path': 'off', // ← wyłączone

			// Kolejność importów
			'import/order': [
				'error',
				{
					groups: [
						['builtin', 'external'],
						'internal',
						['parent', 'sibling'],
						'index',
					],
					alphabetize: { order: 'asc', caseInsensitive: true },
				},
			],
		},
	},
	// Dla Node/Gulp (tylko tam)
	{
		files: ['scripts/**/*.js', 'gulpfile.js'],
		languageOptions: {
			globals: {
				require: true,
				module: true,
				process: true,
				__dirname: true,
				exports: true,
			},
		},
		rules: {
			'no-console': 'off',
		},
	},
];
