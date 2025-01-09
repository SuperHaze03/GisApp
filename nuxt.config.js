export default defineNuxtConfig({
  css: [
    '~/assets/css/tailwind.css',
  
  ],

  app: {
    head: {
      script: [
        {
          src: 'https://api.tomtom.com/maps-sdk-for-web/6.x/6.x.min.js',
          defer: true,
          onload: "window.TomTomSDKLoaded = true", // Tandai bahwa SDK sudah dimuat
          crossorigin: 'anonymous', // Tambahkan ini
        },
      ],
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

});