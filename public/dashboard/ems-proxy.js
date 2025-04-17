/**
 * Proxy for Twilio EMS token requests to avoid CORS issues
 */
(function() {
  // Override the XMLHttpRequest open method to intercept Twilio EMS requests
  const originalOpen = XMLHttpRequest.prototype.open;
  
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    // Check if this is a request to Twilio EMS token endpoint
    if (url.includes('ems.us1.twilio.com/v1/token')) {
      // Replace with our proxy endpoint
      url = '/api/dashboard/ems-token';
      console.log('Redirecting EMS token request to proxy:', url);
    }
    
    // Call the original open method with the potentially modified URL
    return originalOpen.call(this, method, url, async, user, password);
  };
})();
