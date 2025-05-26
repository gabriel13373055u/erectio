// postcss.config.cjs
module.exports = {
	plugins: [
		require('postcss-preset-env')({
			stage: 3, // włączamy propozycje na poziomie Stage 3
			autoprefixer: {
				grid: true, // dodatkowe prefixy do CSS Grid
			},
			features: {
				'nesting-rules': true, // włączamy zagnieżdżanie selektorów
				'custom-media-queries': true, // @custom-media
			},
		}),
	],
};
