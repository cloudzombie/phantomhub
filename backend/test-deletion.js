const axios = require('axios');

// Replace with an actual token you've copied from your browser's localStorage
// You can get this by going to your application, opening DevTools, and checking localStorage
const TOKEN = '[Replace with your token from browser local storage]';
const API_URL = 'http://localhost:5001/api';

async function testPayloadDeletion() {
  try {
    // Step 1: Create a payload
    console.log('Step 1: Creating test payload...');
    const createResponse = await axios.post(`${API_URL}/payloads`, 
      {
        name: 'Test Delete Payload',
        script: 'REM Test\nSTRING Hello\nENTER',
        type: 'duckyscript'
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (createResponse.data.success) {
      const payloadId = createResponse.data.data.id;
      console.log(`Payload created successfully with ID: ${payloadId}`);
      
      // Step 2: Delete the payload
      console.log('Step 2: Deleting the payload...');
      const deleteResponse = await axios.delete(`${API_URL}/payloads/${payloadId}`, 
        {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Delete response:', deleteResponse.data);
      if (deleteResponse.data.success) {
        console.log('Payload deleted successfully!');
      } else {
        console.error('Failed to delete payload:', deleteResponse.data.message);
      }
    } else {
      console.error('Failed to create payload:', createResponse.data.message);
    }
  } catch (error) {
    console.error('Error executing test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

// Instructions for the user
console.log('=== Payload Deletion Test ===');
console.log('Before running this script:');
console.log('1. Open DevTools in your browser (F12)');
console.log('2. Go to Application tab → Local Storage');
console.log('3. Copy the value of the "token" key');
console.log('4. Replace the TOKEN variable in this script with that value');
console.log('5. Save this file and run it with: node test-deletion.js');
console.log('=====================================');

if (TOKEN === '[Replace with your token from browser local storage]') {
  console.error('Please edit this file to add your token first!');
} else {
  testPayloadDeletion();
} 