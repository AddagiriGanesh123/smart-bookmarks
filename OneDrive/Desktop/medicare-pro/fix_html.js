const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Check what's there
const hasMessages = html.includes('page-messages');
console.log('Has page-messages:', hasMessages);
console.log('Has </main>:', html.includes('</main>'));

// Find where </main> is and insert before it
html = html.replace('  </main>\n</div>', `
    <!-- Messages Page -->
    <div id="page-messages" class="page">
      <div class="page-header"><h1>Patient Messages</h1></div>
      <div class="msg-layout">
        <div class="msg-sidebar">
          <div class="msg-sidebar-header">Conversations</div>
          <div id="msg-patient-items"><div class="msg-loading">Loading...</div></div>
        </div>
        <div class="msg-main" id="msg-chat-area">
          <div class="msg-welcome">
            <h3>Patient Messages</h3>
            <p>Select a patient from the left to view messages</p>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`);

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('Done - checking result:');
console.log('Has page-messages now:', fs.readFileSync('frontend/index.html','utf8').includes('page-messages'));
