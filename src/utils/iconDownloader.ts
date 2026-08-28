// Helper to download the official 512x512 PNG icon directly in the browser
export function downloadAppIcon(size = 512, filename = 'snacka-app-icon-512.png') {
  // Use image tag to load the icon and draw to canvas for clean PNG download
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, size, size);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.onerror = () => {
    // Fallback: direct link trigger
    const link = document.createElement('a');
    link.download = filename;
    link.href = '/icon-512.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.src = '/icon-512.png';
}
