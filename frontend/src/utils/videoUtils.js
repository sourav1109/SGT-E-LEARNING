/**
 * Formats a video URL to ensure it's properly accessible
 * @param {string} videoUrl - The video URL from the backend
 * @returns {string} Properly formatted video URL
 */
export const formatVideoUrl = (videoUrl) => {
  console.log('Original video URL:', videoUrl);
  
  if (!videoUrl) {
    console.error('No video URL provided to formatVideoUrl');
    return '';
  }
  
  // If the URL already starts with http, return it as is
  if (videoUrl.startsWith('http')) {
    console.log('Video URL is already absolute:', videoUrl);
    return videoUrl;
  }
  
  // Try to test if this is one of our known files by direct filename
  // These are the files we saw in the uploads directory from our test
  const knownVideos = [
    '7bdd6cb5b415d9cdd7d31f5388f9067f',
    '9c5f9f0b1562d968d2aa1c7191e988f4',
    'ba7d0266a35a46eeeee9733d5303c72b',
    'd61931fb2c0e2f37893d11689351bcc7'
  ];
  
  // If videoUrl is just a filename (no path) and it's one of our known files
  if (knownVideos.includes(videoUrl) && !videoUrl.includes('/')) {
    console.log('Known video file detected, using direct path');
    const directUrl = `http://localhost:5000/uploads/${videoUrl}`;
    console.log('Direct URL:', directUrl);
    return directUrl;
  }
  
  // Handle different formats of relative URLs
  let formattedUrl;
  
  if (videoUrl.startsWith('/uploads/')) {
    // Already has /uploads/ prefix with leading slash
    formattedUrl = videoUrl;
  } else if (videoUrl.startsWith('uploads/')) {
    // Has uploads/ prefix without leading slash, but make sure we don't duplicate it
    if (videoUrl.includes('uploads/uploads/')) {
      // Fix duplicated uploads path
      formattedUrl = `/${videoUrl.replace('uploads/uploads/', 'uploads/')}`;
    } else {
      formattedUrl = `/${videoUrl}`;
    }
  } else {
    // Doesn't have uploads prefix at all - add it
    formattedUrl = `/uploads/${videoUrl}`;
  }
  
  // Check for and fix double uploads paths
  if (formattedUrl.includes('/uploads/uploads/')) {
    formattedUrl = formattedUrl.replace('/uploads/uploads/', '/uploads/');
  }
  
  // Prepend the backend URL
  const fullUrl = `http://localhost:5000${formattedUrl}`;
  console.log('Final formatted video URL:', fullUrl);
  return fullUrl;
};

/**
 * Formats duration in seconds to a readable time format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  // Handle edge cases
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return '0:00';
  }
  
  // Ensure we have a positive number
  const duration = Math.max(0, parseFloat(seconds));
  
  // For longer videos, include hours
  if (duration >= 3600) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const remainingSeconds = Math.floor(duration % 60);
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
  
  // Standard minutes:seconds format
  const minutes = Math.floor(duration / 60);
  const remainingSeconds = Math.floor(duration % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};
