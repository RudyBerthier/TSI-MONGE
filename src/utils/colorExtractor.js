export function getAverageColor(imageUrl) {
  return new Promise((resolve) => {
    // Default fallback color
    const fallbackColor = '#121212';

    if (!imageUrl) return resolve(fallbackColor);

    const img = new Image();
    // Enable CORS to read pixels from external images (Spotify, YouTube thumbnails)
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Small size for speed, we just want the average
        canvas.width = 64;
        canvas.height = 64;
        
        ctx.drawImage(img, 0, 0, 64, 64);
        
        const imageData = ctx.getImageData(0, 0, 64, 64);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0;
        let count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          // Skip completely transparent pixels
          if (data[i + 3] < 128) continue;
          
          const currentR = data[i];
          const currentG = data[i + 1];
          const currentB = data[i + 2];
          
          // Skip pixels that are too white or too black (mutes the average too much)
          const sum = currentR + currentG + currentB;
          if (sum > 700 || sum < 30) continue;

          r += currentR;
          g += currentG;
          b += currentB;
          count++;
        }
        
        if (count === 0) return resolve(fallbackColor);
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        // Darken the color slightly to ensure white text is always readable
        const darkenFactor = 0.8;
        r = Math.floor(r * darkenFactor);
        g = Math.floor(g * darkenFactor);
        b = Math.floor(b * darkenFactor);

        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch (err) {
        // Fallback for CORS issues preventing pixel read
        console.warn('Canvas pixel extraction blocked by CORS. Using fallback color.');
        resolve(fallbackColor);
      }
    };

    img.onerror = () => {
      resolve(fallbackColor);
    };

    img.src = imageUrl;
  });
}
