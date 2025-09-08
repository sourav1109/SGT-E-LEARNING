import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  IconButton,
  Paper,
  Grid,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Container
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Speed as SpeedIcon,
  Fullscreen,
  FullscreenExit,
  Close
} from '@mui/icons-material';
import { updateWatchHistory } from '../../api/studentVideoApi';
import { formatDuration } from '../../utils/videoUtils';

const CustomVideoPlayer = ({ videoId, videoUrl, title, token, onTimeUpdate, onVideoComplete }) => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [timeWatched, setTimeWatched] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  // Speed options
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Initialize the video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Function to handle canplay event
    const handleCanPlay = () => setLoading(false);
    
    // Function to directly handle duration changes
    const handleDurationChange = () => {
      const newDuration = video.duration;
      if (!isNaN(newDuration) && newDuration > 0) {
        console.log(`Duration changed to: ${newDuration}s`);
        setDuration(newDuration);
      }
    };
    
    // Handle visibility change to prevent flickering when switching tabs
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden
        console.log("Tab hidden, preserving video state");
        // Save playing state but don't change it
        if (video.paused === false) {
          video.dataset.wasPlaying = "true";
        }
      } else {
        // Tab is now visible again
        console.log("Tab visible again, restoring video state");
        // Only handle restoration if the video was playing before
        if (video.dataset.wasPlaying === "true") {
          // Clear the flag
          video.dataset.wasPlaying = "";
          
          // Only try to play if the component still thinks it's playing
          if (isPlaying) {
            console.log("Attempting to resume playback after tab switch");
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error("Error resuming video after tab switch:", error);
              });
            }
          }
        }
      }
    };
    
    // Set initial volume and playback rate
    video.volume = volume;
    video.playbackRate = playbackRate;
    video.muted = isMuted;

    // Event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleDurationChange); 
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    // Add visibility change listener to handle tab switching
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Force loading of metadata if already loaded
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }
    
    // Force duration update if already available
    if (video.duration > 0 && !isNaN(video.duration)) {
      handleDurationChange();
    }
    
    // Force loading indicator off if already can play
    if (video.readyState >= 3) {
      setLoading(false);
    }

    return () => {
      // Clean up event listeners
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleVideoEnded);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      
      // Remove visibility change listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Update watch time when component unmounts
      updateWatchTime(true);
    };
    // Only re-run when video URL changes, not on every state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  // Update watch time at regular intervals
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isPlaying && timeWatched > 0.5) {  // Only update if we have meaningful time accumulated
        updateWatchTime(false);
      }
    }, 10000); // Update every 10 seconds for more accurate tracking

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, timeWatched]);

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;

    // Get duration directly from the video element
    const videoDuration = videoRef.current.duration;
    console.log(`Video metadata loaded. Raw duration: ${videoDuration}s`);
    
    // Check if we have a valid duration
    if (!isNaN(videoDuration) && videoDuration > 0) {
      console.log(`Setting valid duration: ${videoDuration}s`);
      setDuration(videoDuration);
      
      // Also store the duration as a data attribute on the video element
      // so we can retrieve it if needed later
      videoRef.current.dataset.duration = videoDuration;
    } else {
      console.warn("Got invalid duration from metadata event");
      
      // Try to get duration using a different approach - try to read it after a delay
      setTimeout(() => {
        if (videoRef.current) {
          const retryDuration = videoRef.current.duration;
          console.log(`Retry getting duration: ${retryDuration}s`);
          
          if (!isNaN(retryDuration) && retryDuration > 0) {
            console.log(`Setting duration from retry: ${retryDuration}s`);
            setDuration(retryDuration);
            videoRef.current.dataset.duration = retryDuration;
          } else {
            // If still can't get duration, try a more aggressive approach
            // Start playing for a moment to force duration to be calculated
            console.warn("Still can't get duration, trying to play briefly");
            const originalMuted = videoRef.current.muted;
            videoRef.current.muted = true; // Mute to avoid unexpected sound
            
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                // Successfully started playing
                setTimeout(() => {
                  // Get duration after playing briefly
                  const forcedDuration = videoRef.current.duration;
                  console.log(`Got duration after playing: ${forcedDuration}s`);
                  
                  // Pause the video again
                  videoRef.current.pause();
                  videoRef.current.muted = originalMuted;
                  
                  if (!isNaN(forcedDuration) && forcedDuration > 0) {
                    setDuration(forcedDuration);
                    videoRef.current.dataset.duration = forcedDuration;
                  } else {
                    // Last resort - use a hardcoded duration from the video data if available
                    console.warn("Using fallback duration");
                    // Set a default duration (100 seconds) as absolute fallback
                    setDuration(100);
                  }
                }, 500);
              }).catch(error => {
                console.error("Error in forced play attempt:", error);
                videoRef.current.muted = originalMuted;
                // Use fallback duration
                setDuration(100);
              });
            }
          }
        }
      }, 1000);
    }
    
    // Turn off loading indicator if appropriate
    if (videoRef.current.readyState >= 3) {
      setLoading(false);
    }
    
    // Set playback properties
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Store previous time to calculate actual change
    const prevTime = currentTime;
    
    // Update current position
    const newCurrentTime = video.currentTime;
    setCurrentTime(newCurrentTime);
    
    // IMPORTANT: Update duration if it's not set correctly yet
    // This is critical as some browsers might not properly load metadata
    const videoDuration = video.duration;
    if ((duration === 0 || isNaN(duration)) && videoDuration > 0 && !isNaN(videoDuration)) {
      console.log(`Updating duration in timeUpdate: ${videoDuration}s`);
      setDuration(videoDuration);
      
      // Also store in dataset for backup
      video.dataset.duration = videoDuration;
    }
    
    // Even if we already have a duration, check if it needs updating
    // This handles cases where the duration might change (adaptive streaming)
    if (!isNaN(videoDuration) && videoDuration > 0 && Math.abs(duration - videoDuration) > 1) {
      console.log(`Correcting duration from ${duration}s to ${videoDuration}s`);
      setDuration(videoDuration);
    }
    
    // Calculate time watched since last update
    const now = Date.now();
    
    // Only accumulate time when the video is actually playing
    if (isPlaying) {
      // Calculate time difference in video playback
      // This is more accurate than using elapsed real time
      const videoTimeDiff = Math.abs(newCurrentTime - prevTime);
      
      // Ensure we're not adding negative time or unreasonably large jumps
      // (which would happen during seeking)
      if (videoTimeDiff > 0 && videoTimeDiff < 1) {  // Normal playback increments
        setTimeWatched(prev => prev + videoTimeDiff);
        console.log(`Added ${videoTimeDiff.toFixed(2)}s to watched time. Total: ${(timeWatched + videoTimeDiff).toFixed(2)}s`);
      }
    }
    
    setLastUpdateTime(now);
    
    // Call the onTimeUpdate callback if provided
    if (onTimeUpdate) {
      onTimeUpdate(newCurrentTime, videoDuration > 0 ? videoDuration : duration);
    }
  };

  const handleVideoEnded = () => {
    // Mark the video as completed when it ends
    setIsPlaying(false);
    setVideoEnded(true);
    
    // Set a flag to indicate this video has ended
    if (videoRef.current) {
      videoRef.current.dataset.ended = "true";
    }
    
    // Ensure we've captured all of the watch time
    if (timeWatched > 0) {
      // Force isCompleted to true since the video has played to the end
      updateWatchTime(true);
    }
    
    // Instead of immediately notifying parent, add a small delay
    // to prevent state thrashing that could cause shivering
    setTimeout(() => {
      // Only notify if we still have a valid video reference and haven't already notified
      if (videoRef.current && onVideoComplete && videoRef.current.dataset.notified !== "true") {
        console.log(`Notifying parent that video ${videoId} is completed (delayed)`);
        // Mark video as notified to prevent duplicate notifications
        videoRef.current.dataset.notified = "true";
        onVideoComplete(videoId);
      }
    }, 500);
    
    console.log(`Video ended with ${timeWatched.toFixed(2)}s accumulated watch time`);
    
    // Prevent any automatic restarts or state changes that might cause shivering
    // by setting a stable end state
    if (videoRef.current) {
      videoRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      // Re-add after a short delay to stop rapid updates at the end
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
        }
      }, 1000);
    }
  };

  const handleVideoError = (e) => {
    console.error('Video error:', e);
    setError('Error loading video. Please try again later.');
    setLoading(false);
  };

  // Track when video starts playing
  const handlePlay = () => {
    console.log("Video play event triggered");
    setIsPlaying(true);
    
    // Reset the last update time when video starts playing
    // to avoid counting the paused time
    setLastUpdateTime(Date.now());
    
    // Log accurate information
    const video = videoRef.current;
    if (video) {
      // Store that the video is playing for tab visibility tracking
      video.dataset.wasPlaying = "true";
      console.log(`Video started playing at ${video.currentTime.toFixed(2)}/${video.duration.toFixed(2)}`);
    }
  };

  // Track when video is paused
  const handlePause = () => {
    console.log("Video pause event triggered");
    setIsPlaying(false);
    
    // Get accurate position information
    const video = videoRef.current;
    if (!video) return;
    
    // Clear the playing state flag
    video.dataset.wasPlaying = "";
    
    const position = video.currentTime;
    
    // When paused, update watch history immediately if we have accumulated enough time
    if (timeWatched > 0.5) {
      updateWatchTime(false);
    }
    
    console.log(`Video paused at ${position.toFixed(2)}s, accumulated watch time: ${timeWatched.toFixed(2)}s`);
  };

  const updateWatchTime = async (isFinal = false) => {
    try {
      // Check if we have both token and videoId before proceeding
      if (!token) {
        console.warn('Cannot update watch history: Token is missing');
        return;
      }
      
      if (!videoId) {
        console.warn('Cannot update watch history: Video ID is missing');
        return;
      }
      
      // Only report if we have actual time to report or if this is a final update
      if (timeWatched > 0.1 || isFinal) {
        // Ensure timeSpent is a valid number (minimum 0.1 seconds to avoid API validation issues)
        const timeToReport = Math.max(0.1, timeWatched || 0);
        
        // Calculate completion status
        // A video is considered complete if:
        // 1. The current position is at least 95% of the duration, OR
        // 2. The video has ended (isFinal=true for ended event), OR
        // 3. The accumulated watch time exceeds 95% of the duration
        // Using a higher threshold (95% instead of 90%) to ensure students watch more of the video
        const completionThreshold = 0.95;
        const currentPos = currentTime || 0;
        const totalDuration = duration || 100; // Use a default if duration is not available
        
        const isPositionCompleted = totalDuration > 0 && (currentPos / totalDuration) >= completionThreshold;
        const isTimeCompleted = totalDuration > 0 && timeToReport >= (totalDuration * completionThreshold);
        const isCompleted = isPositionCompleted || isTimeCompleted || isFinal;
        
        // Prepare analytics data
        const analyticsData = {
          timeSpent: timeToReport,
          currentTime: currentPos,
          duration: totalDuration,
          playbackRate: playbackRate || 1,
          isCompleted: isCompleted,
          timestamp: new Date().toISOString(),
          isFinal: isFinal
        };
        
        console.log(`Sending analytics update: Time: ${timeToReport.toFixed(2)}s, Position: ${currentPos.toFixed(2)}/${totalDuration.toFixed(2)}s, Completed: ${isCompleted}`);
        
        // Send to backend
        const response = await updateWatchHistory(videoId, analyticsData, token);
        console.log("Watch history update response:", response);

        // Reset the accumulated time if it was successfully sent and not a final update
        if (!isFinal) {
          setTimeWatched(0);
        }
        
        // If this is a final update and the video is completed, notify parent
        if (isFinal && isCompleted && onVideoComplete) {
          console.log(`Final update with completion - notifying parent for video ${videoId}`);
          onVideoComplete(videoId);
        }
      } else {
        console.log('Skipping update - insufficient watch time accumulated');
      }
    } catch (err) {
      console.error('Error updating watch history:', err);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    console.log("Toggle play called, current state:", isPlaying ? "playing" : "paused");
    
    try {
      if (isPlaying) {
        // Pause the video
        video.pause();
        // This will trigger handlePause event handler
      } else {
        // Try to play and handle any errors
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Error in togglePlay:", error);
            // Reset state if play fails
            setIsPlaying(false);
          });
        }
        // handlePlay event handler will be triggered on success
      }
    } catch (error) {
      console.error("Exception in togglePlay:", error);
      // Ensure state is consistent in case of errors
      setIsPlaying(video.paused === false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (event, newValue) => {
    const video = videoRef.current;
    if (video) {
      video.volume = newValue;
      setVolume(newValue);
      setIsMuted(newValue === 0);
    }
  };

  const handleSpeedChange = (speed) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
      setPlaybackRate(speed);
    }
  };

  // Allow controlled seeking through the progress bar
  const handleProgressChange = (event, newValue) => {
    if (videoRef.current) {
      // Update the video position to the new value
      videoRef.current.currentTime = newValue;
      // Update state to reflect the new position
      setCurrentTime(newValue);
    }
  };

  // Toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      // Remember the current state before entering fullscreen
      const currentPosition = videoRef.current ? videoRef.current.currentTime : 0;
      const wasPlaying = isPlaying;
      const currentDuration = duration;
      
      // First pause the video (to prevent flickering during transition)
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
      }
      
      // Set the states
      setIsFullScreen(true);
      
      // Open dialog after a brief delay to ensure state changes have been applied
      setTimeout(() => {
        setIsDialogOpen(true);
        
        // After dialog is open, restore video state
        setTimeout(() => {
          if (videoRef.current) {
            // Restore position
            videoRef.current.currentTime = currentPosition;
            
            // Make sure duration is properly set
            if (currentDuration > 0) {
              setDuration(currentDuration);
            } else if (videoRef.current.duration > 0) {
              setDuration(videoRef.current.duration);
            }
            
            // Force a refresh of the current position display
            setCurrentTime(videoRef.current.currentTime);
            
            // Resume playing if it was playing before
            if (wasPlaying) {
              try {
                videoRef.current.play().catch(error => {
                  console.error("Error playing video in fullscreen:", error);
                });
              } catch (e) {
                console.error("Error in play() call:", e);
              }
            }
          }
        }, 300); // Delay after dialog opens
      }, 50); // Delay before opening dialog
    } else {
      // Remember the current state before exiting fullscreen
      const currentPosition = videoRef.current ? videoRef.current.currentTime : 0;
      const wasPlaying = isPlaying;
      const currentDuration = duration;
      
      // First pause the video
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
      }
      
      // First close dialog
      setIsDialogOpen(false);
      
      // After dialog is closed, exit fullscreen and restore state
      setTimeout(() => {
        setIsFullScreen(false);
        
        // After a short delay, restore video state
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentPosition;
            
            // Make sure duration is properly set
            if (currentDuration > 0) {
              setDuration(currentDuration);
            } else if (videoRef.current.duration > 0) {
              setDuration(videoRef.current.duration);
            }
            
            // Force a refresh of the current position display
            setCurrentTime(videoRef.current.currentTime);
            
            if (wasPlaying) {
              try {
                videoRef.current.play().catch(error => {
                  console.error("Error playing video after fullscreen:", error);
                });
              } catch (e) {
                console.error("Error in play() call:", e);
              }
            }
          }
        }, 300); // Delay after state changes
      }, 100); // Delay after dialog closes
    }
  };

  // Check if we have a valid duration
  const getDisplayDuration = () => {
    // Use the most reliable source for duration
    if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
      return videoRef.current.duration;
    } else if (duration && !isNaN(duration) && duration > 0) {
      return duration;
    } else if (videoRef.current && videoRef.current.dataset.duration) {
      const storedDuration = parseFloat(videoRef.current.dataset.duration);
      if (!isNaN(storedDuration) && storedDuration > 0) {
        return storedDuration;
      }
    }
    // Fallback to a reasonable default (2 minutes)
    return 120;
  };

  // Get a valid current time value
  const getDisplayCurrentTime = () => {
    if (videoRef.current && !isNaN(videoRef.current.currentTime)) {
      return videoRef.current.currentTime;
    } else if (!isNaN(currentTime)) {
      return currentTime;
    }
    return 0;
  };
  
  // Show controls when mouse moves over video
  const handleMouseMove = () => {
    setShowControls(true);
    
    // Clear any existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Set timeout to hide controls after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
    
    setControlsTimeout(timeout);
  };

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);
  
  // Add an effect to handle page visibility changes at the component level
  useEffect(() => {
    // Function to handle page visibility changes
    const handlePageVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Page is now hidden
        console.log("Page hidden - preserving player state");
        // If currently playing, remember this state
        if (isPlaying) {
          // We don't pause here because that would trigger unwanted state changes
          // The video element visibility handler will handle this
        }
      } else if (document.visibilityState === 'visible') {
        // Page is now visible
        console.log("Page visible again - restoring player state");
        // Refresh the player state - force a re-render
        if (videoRef.current) {
          // Update duration if needed
          if (videoRef.current.duration > 0 && videoRef.current.duration !== duration) {
            setDuration(videoRef.current.duration);
          }
          
          // Make sure play/pause state is synchronized
          setIsPlaying(videoRef.current.paused === false);
        }
      }
    };
    
    // Add event listener
    document.addEventListener('visibilitychange', handlePageVisibility);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handlePageVisibility);
    };
  }, [isPlaying, duration]);

  return (
    <>
      {/* Regular Player */}
      <Paper 
        elevation={2} 
        sx={{ borderRadius: 2, overflow: 'hidden' }}
        ref={videoContainerRef}
      >
        {/* Video Player */}
        <Box 
          sx={{ 
            position: 'relative', 
            width: '100%', 
            backgroundColor: '#000',
            overflow: 'hidden',
            // Add CSS to prevent shivering effect
            willChange: 'transform',
            // Apply hardware acceleration to prevent visual glitches
            transform: 'translateZ(0)'
          }}
          onMouseMove={handleMouseMove}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                backgroundColor: 'rgba(0,0,0,0.5)'
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          )}

          <video
            ref={videoRef}
            key="main-video-player"
            src={videoUrl}
            style={{ 
              width: '100%', 
              display: isFullScreen ? 'none' : 'block', 
              maxHeight: '500px',
              // Prevent shivering with hardware acceleration
              transform: 'translateZ(0)',
              willChange: 'transform',
              // Ensure smoother rendering
              imageRendering: 'optimizeQuality'
            }}
            playsInline
            preload="metadata"
            autoPlay={false}
            muted={isMuted}
            poster="" // Empty poster to prevent flickering when switching tabs
            onSuspend={(e) => console.log("Video suspended")}
            onWaiting={(e) => console.log("Video waiting")}
            onStalled={(e) => console.log("Video stalled")}
            onEmptied={(e) => console.log("Video emptied")}
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={() => {
              if (videoRef.current && videoRef.current.duration > 0) {
                setDuration(videoRef.current.duration);
                console.log(`Video loaded data, duration: ${videoRef.current.duration}s`);
              }
            }}
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            controlsList="nodownload"
          />

          {error && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                p: 2
              }}
            >
              <Typography variant="h6">{error}</Typography>
            </Box>
          )}

          {/* Overlay Controls - Only show when showControls is true */}
          {showControls && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 1.5,
                backgroundColor: 'rgba(0,0,0,0.7)',
                transition: 'opacity 0.3s',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'auto' : 'none',
              }}
            >
              {/* Progress bar - now supports seeking */}
              <Slider
                value={getDisplayCurrentTime()}
                max={getDisplayDuration()}
                onChange={handleProgressChange}
                aria-label="video progress"
                sx={{ 
                  color: 'primary.main',
                  height: 8,
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                    '&::before': {
                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                    },
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0px 0px 0px 8px rgb(25 118 210 / 16%)',
                    },
                  },
                  '& .MuiSlider-rail': {
                    opacity: 0.5,
                  },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                {/* Left controls: Play/Pause and time */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton onClick={togglePlay} size="large" sx={{ color: 'white' }}>
                    {isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                  <Typography variant="body2" sx={{ ml: 1, color: 'white' }}>
                    {formatDuration(getDisplayCurrentTime())} / {formatDuration(getDisplayDuration())}
                  </Typography>
                </Box>

                {/* Right controls: Volume, Speed, and Fullscreen */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {/* Volume control */}
                  <Box sx={{ display: 'flex', alignItems: 'center', width: 150, mr: 2 }}>
                    <IconButton onClick={toggleMute} size="small" sx={{ color: 'white' }}>
                      {isMuted ? <VolumeOff /> : <VolumeUp />}
                    </IconButton>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      aria-label="Volume"
                      sx={{ ml: 1, color: 'primary.main' }}
                      size="small"
                    />
                  </Box>

                  {/* Playback speed control */}
                  <Tooltip title="Playback Speed">
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      <IconButton size="small" sx={{ color: 'white' }}>
                        <SpeedIcon />
                      </IconButton>
                      <Box component="span" sx={{ ml: 0.5 }}>
                        {speedOptions.map((speed) => (
                          <Tooltip key={speed} title={`${speed}x`}>
                            <IconButton
                              size="small"
                              onClick={() => handleSpeedChange(speed)}
                              sx={{
                                mx: 0.2,
                                backgroundColor: playbackRate === speed ? 'primary.main' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: playbackRate === speed ? 'primary.dark' : 'rgba(255,255,255,0.2)'
                                },
                                width: 30,
                                height: 24,
                                fontSize: '0.75rem'
                              }}
                            >
                              {speed}x
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  </Tooltip>

                  {/* Fullscreen toggle */}
                  <IconButton 
                    onClick={toggleFullScreen} 
                    size="small"
                    sx={{ color: 'white' }}
                  >
                    {isFullScreen ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {/* Title and description (only show in regular view) */}
        {!isFullScreen && (
          <Box sx={{ p: 1.5, backgroundColor: '#f5f5f5' }}>
            <Typography variant="subtitle1" gutterBottom>
              {title}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Fullscreen Dialog */}
      <Dialog
        fullScreen
        open={isDialogOpen}
        disableEnforceFocus // Helps with flickering by not forcing focus
        disableAutoFocus    // Prevents auto focus that could cause flickering
        disableRestoreFocus // Prevents focus restoration issues
        onClose={() => {
          // Use the toggleFullScreen function to handle closing properly
          if (isFullScreen) {
            toggleFullScreen();
          }
        }}
        TransitionProps={{
          timeout: 300, // Control transition speed
          // Setting keepMounted to true prevents remounting of components
          // which reduces flickering during transitions
          mountOnEnter: true,
          unmountOnExit: false,
          onEnter: () => {
            console.log("Dialog entering");
          },
          onEntered: () => {
            console.log("Dialog fully entered");
          },
          onExit: () => {
            console.log("Dialog exiting");
          },
          onExited: () => {
            console.log("Dialog fully exited");
            // Ensure time tracking is preserved
            if (timeWatched > 0.5) {
              updateWatchTime(false);
            }
          }
        }}
        sx={{ 
          '& .MuiDialog-paper': { 
            backgroundColor: '#000',
            margin: 0
          },
          '& .MuiDialog-container': {
            // Prevent flickering during transitions
            backgroundColor: '#000'
          }
        }}
      >
        <AppBar position="fixed" color="transparent" elevation={0} sx={{ top: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
              {title}
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={toggleFullScreen}
              aria-label="close"
              sx={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }
              }}
            >
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Box 
          sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: '#000',
            position: 'relative',
            // Add CSS to prevent shivering effect
            willChange: 'transform',
            // Apply hardware acceleration to prevent visual glitches
            transform: 'translateZ(0)',
          }}
          onMouseMove={handleMouseMove}
        >
          {loading && (
            <CircularProgress 
              color="primary" 
              sx={{ position: 'absolute', zIndex: 10 }}
            />
          )}
          
          {isDialogOpen && (
            <video
              src={videoUrl}
              key="fullscreen-video-player"
              ref={videoRef}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                cursor: 'pointer',
                // Prevent shivering with hardware acceleration
                transform: 'translateZ(0)',
                willChange: 'transform',
                // Ensure smoother rendering
                imageRendering: 'optimizeQuality'
              }}
              playsInline
              preload="metadata"
              autoPlay={false}
              muted={isMuted}
              poster="" // Empty poster to prevent flickering
              onSuspend={(e) => console.log("Fullscreen video suspended")}
              onWaiting={(e) => console.log("Fullscreen video waiting")}
              onStalled={(e) => console.log("Fullscreen video stalled")}
              onEmptied={(e) => console.log("Fullscreen video emptied")}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={() => {
                if (videoRef.current && videoRef.current.duration > 0) {
                  setDuration(videoRef.current.duration);
                  console.log(`Fullscreen video loaded data, duration: ${videoRef.current.duration}s`);
                }
              }}
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              controlsList="nodownload"
            />
          )}

          {/* Overlay Controls */}
          {showControls && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 3,
                backgroundColor: 'rgba(0,0,0,0.7)',
                transition: 'opacity 0.3s',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'auto' : 'none',
              }}
            >
              <Container maxWidth="lg">
                <Slider
                  value={getDisplayCurrentTime()}
                  max={getDisplayDuration()}
                  onChange={handleProgressChange}
                  aria-label="video progress"
                  sx={{ 
                    color: 'primary.main',
                    height: 10,
                    '& .MuiSlider-thumb': {
                      width: 20,
                      height: 20,
                      transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                      '&::before': {
                        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                      },
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0px 0px 0px 8px rgb(25 118 210 / 16%)',
                      },
                    },
                    '& .MuiSlider-rail': {
                      opacity: 0.5,
                    },
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  {/* Left controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={togglePlay} size="large" sx={{ color: 'white' }}>
                      {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                    </IconButton>
                    <Typography variant="body1" sx={{ ml: 2, color: 'white' }}>
                      {formatDuration(getDisplayCurrentTime())} / {formatDuration(getDisplayDuration())}
                    </Typography>
                  </Box>

                  {/* Right controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Volume control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', width: 150, mr: 3 }}>
                      <IconButton onClick={toggleMute} size="medium" sx={{ color: 'white' }}>
                        {isMuted ? <VolumeOff /> : <VolumeUp />}
                      </IconButton>
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        aria-label="Volume"
                        sx={{ ml: 1, color: 'primary.main' }}
                      />
                    </Box>

                    {/* Playback speed control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                      <IconButton size="medium" sx={{ color: 'white' }}>
                        <SpeedIcon />
                      </IconButton>
                      <Box component="span" sx={{ ml: 1 }}>
                        {speedOptions.map((speed) => (
                          <Tooltip key={speed} title={`${speed}x`}>
                            <IconButton
                              size="small"
                              onClick={() => handleSpeedChange(speed)}
                              sx={{
                                mx: 0.5,
                                backgroundColor: playbackRate === speed ? 'primary.main' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: playbackRate === speed ? 'primary.dark' : 'rgba(255,255,255,0.2)'
                                },
                                width: 36,
                                height: 36,
                                fontSize: '0.875rem'
                              }}
                            >
                              {speed}x
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>

                    {/* Fullscreen toggle */}
                    <IconButton 
                      onClick={toggleFullScreen} 
                      size="medium"
                      sx={{ color: 'white' }}
                    >
                      <FullscreenExit />
                    </IconButton>
                  </Box>
                </Box>
              </Container>
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default CustomVideoPlayer;
