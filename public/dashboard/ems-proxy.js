/**
 * Proxy for Twilio EMS token requests to avoid CORS issues
 */
(function() {
  console.log('EMS proxy script loaded');

  // Create a function to handle EMS token requests
  window.getEmsToken = function() {
    console.log('Making EMS token request through proxy');

    return fetch('/api/dashboard/ems-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identity: 'dashboard-user',
        product: 'flex',
        token_ttl: 3600
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('EMS token request failed: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('EMS token received successfully');
      return data;
    })
    .catch(error => {
      console.error('Error getting EMS token:', error);
      throw error;
    });
  };

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

  // Also patch fetch for modern code
  const originalFetch = window.fetch;

  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('ems.us1.twilio.com/v1/token')) {
      url = '/api/dashboard/ems-token';
      console.log('Redirecting fetch EMS token request to proxy:', url);
    }

    return originalFetch.call(this, url, options);
  };
})();
