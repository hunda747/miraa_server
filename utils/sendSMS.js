/**
 * Utility function to send SMS messages via Afromessage API
 * @param {Object} options - SMS configuration options
 * @param {string} options.identifierId - Your Afromessage identifier ID
 * @param {string} options.senderName - Your sender name
 * @param {string} options.recipient - Phone number of the recipient
 * @param {string} options.message - SMS message content
 * @param {string} [options.callback] - Optional callback URL
 * @returns {Promise<Object>} - Response from the SMS API
 */
const sendSMS = async (options) => {
  try {
    const { identifierId, senderName, recipient, message, callback = '' } = options;

    // Validate required parameters
    if (!identifierId || !senderName || !recipient || !message) {
      throw new Error('Missing required parameters for sending SMS');
    }

    // Encode parameters for URL
    const encodedMessage = encodeURIComponent(message);
    const encodedCallback = callback ? encodeURIComponent(callback) : '';

    // Construct the API URL
    const apiUrl = `https://api.afromessage.com/api/send?from=${identifierId}&sender=${senderName}&to=${recipient}&message=${encodedMessage}${callback ? `&callback=${encodedCallback}` : ''}`;

    // Send the request
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SMS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

module.exports = sendSMS;
