#!/usr/bin/env python3
"""
GTM API Rate Limiter
---------------------
Implements proper rate limiting for Google Tag Manager API based on documented limits.

GTM API Rate Limits (per project):
- Rate Limit: 0.25 queries per second (QPS) = 1 request every 4 seconds minimum
- Quota: 25 requests per 100 seconds (sliding window)
- Daily Quota: 10,000 requests per project per day

Author: Anthony Figgins
Version: 1.0.0
Date Updated: 2025-11-17
"""

import time
import threading
from collections import deque
from typing import Optional


class GTMRateLimiter:
    """
    Rate limiter for Google Tag Manager API.
    
    Enforces:
    - Minimum 4 seconds between requests (0.25 QPS)
    - Maximum 25 requests per 100 seconds (sliding window)
    - Thread-safe for concurrent requests
    """
    
    # GTM API Limits
    MIN_REQUEST_INTERVAL = 4.0  # 0.25 QPS = 1 request every 4 seconds
    MAX_REQUESTS_PER_WINDOW = 25  # 25 requests per 100 seconds
    WINDOW_SIZE = 100.0  # 100 seconds sliding window
    
    def __init__(self):
        """Initialize the rate limiter."""
        self.request_timestamps = deque()  # Sliding window of request timestamps
        self.last_request_time = 0.0  # Time of last request
        self.lock = threading.Lock()  # Thread safety
        
    def wait_if_needed(self) -> float:
        """
        Wait if necessary to respect rate limits.
        
        Returns:
            float: The actual wait time (in seconds) that was applied
        """
        with self.lock:
            now = time.time()
            wait_time = 0.0
            
            # Clean up old timestamps outside the window
            while self.request_timestamps and (now - self.request_timestamps[0]) > self.WINDOW_SIZE:
                self.request_timestamps.popleft()
            
            # Check if we're at the limit for the sliding window
            if len(self.request_timestamps) >= self.MAX_REQUESTS_PER_WINDOW:
                # Calculate how long to wait until the oldest request falls out of the window
                oldest_request_age = now - self.request_timestamps[0]
                wait_time = max(wait_time, self.WINDOW_SIZE - oldest_request_age + 0.1)  # Add 0.1s buffer
                if wait_time > 0:
                    time.sleep(wait_time)
                    now = time.time()  # Update now after sleeping
                    # Clean up again after waiting
                    while self.request_timestamps and (now - self.request_timestamps[0]) > self.WINDOW_SIZE:
                        self.request_timestamps.popleft()
            
            # Enforce minimum interval between requests (0.25 QPS = 4 seconds)
            time_since_last = now - self.last_request_time
            if time_since_last < self.MIN_REQUEST_INTERVAL:
                interval_wait = self.MIN_REQUEST_INTERVAL - time_since_last
                wait_time += interval_wait
                time.sleep(interval_wait)
                now = time.time()
            
            # Record this request
            self.last_request_time = now
            self.request_timestamps.append(now)
            
            return wait_time
    
    def get_stats(self) -> dict:
        """
        Get current rate limiter statistics.
        
        Returns:
            dict: Statistics including requests in window, time until next available slot, etc.
        """
        with self.lock:
            now = time.time()
            
            # Clean up old timestamps
            while self.request_timestamps and (now - self.request_timestamps[0]) > self.WINDOW_SIZE:
                self.request_timestamps.popleft()
            
            requests_in_window = len(self.request_timestamps)
            time_until_next = 0.0
            
            if requests_in_window >= self.MAX_REQUESTS_PER_WINDOW:
                oldest_request_age = now - self.request_timestamps[0]
                time_until_next = max(0, self.WINDOW_SIZE - oldest_request_age)
            else:
                time_since_last = now - self.last_request_time
                time_until_next = max(0, self.MIN_REQUEST_INTERVAL - time_since_last)
            
            return {
                'requests_in_window': requests_in_window,
                'max_requests_per_window': self.MAX_REQUESTS_PER_WINDOW,
                'window_size_seconds': self.WINDOW_SIZE,
                'time_until_next_request': time_until_next,
                'can_make_request': requests_in_window < self.MAX_REQUESTS_PER_WINDOW,
            }
    
    def reset(self):
        """Reset the rate limiter (clear all timestamps)."""
        with self.lock:
            self.request_timestamps.clear()
            self.last_request_time = 0.0

