export default defineNuxtPlugin(() => {
    if (process.client) {
      const script = document.createElement('script');
      script.src = 'https://api.tomtom.com/maps-sdk-for-web/6.x/6.x.min.js';
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  