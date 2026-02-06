const automator = require('miniprogram-automator');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('Connecting to WeChat DevTools automator on port 9420...');
  
  let miniProgram;
  try {
    miniProgram = await automator.connect({
      wsEndpoint: 'ws://localhost:9420',
    });
    console.log('Connected successfully!');
  } catch (err) {
    console.error('Failed to connect:', err.message);
    process.exit(1);
  }

  try {
    // For mini-games, directly take screenshots without page navigation
    console.log('Taking screenshot 1...');
    await miniProgram.screenshot({
      path: path.join(SCREENSHOT_DIR, 'game_screen_1.png'),
    });
    console.log('Screenshot 1 saved!');

    // Small delay between screenshots
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Taking screenshot 2...');
    await miniProgram.screenshot({
      path: path.join(SCREENSHOT_DIR, 'game_screen_2.png'),
    });
    console.log('Screenshot 2 saved!');

    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Taking screenshot 3...');
    await miniProgram.screenshot({
      path: path.join(SCREENSHOT_DIR, 'game_screen_3.png'),
    });
    console.log('Screenshot 3 saved!');

    console.log('\nAll screenshots saved to:', SCREENSHOT_DIR);
    const files = fs.readdirSync(SCREENSHOT_DIR);
    files.forEach(f => {
      const stats = fs.statSync(path.join(SCREENSHOT_DIR, f));
      console.log(`  ${f} (${(stats.size / 1024).toFixed(1)} KB)`);
    });

  } catch (err) {
    console.error('Error during screenshot:', err.message);
    console.error(err.stack);
  } finally {
    try { await miniProgram.disconnect(); } catch(e) {}
    console.log('Done.');
  }
}

main().catch(console.error);
