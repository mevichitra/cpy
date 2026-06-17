const { spawn, execSync } = require('child_process');
const path = require('path');

const TEST_PORT = 4000;
const BASE_URL = `http://localhost:${TEST_PORT}`;
let serverProcess;

function runCurl(args, stdinInput = null) {
  const cmd = `curl -s ${args}`;
  if (stdinInput !== null) {
    // Escape single quotes for shell string
    const escapedInput = stdinInput.replace(/'/g, "'\\''");
    return execSync(`printf '%s' '${escapedInput}' | ${cmd}`, { encoding: 'utf8' });
  }
  return execSync(cmd, { encoding: 'utf8' });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('--- Starting API Integration Tests ---');
  
  // 1. Start the server
  console.log(`Starting server on port ${TEST_PORT}...`);
  serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: TEST_PORT },
    cwd: __dirname
  });

  // Log server output to debug if needed
  serverProcess.stdout.on('data', (data) => {
    // console.log(`[Server]: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data.toString().trim()}`);
  });

  // Wait for server to start
  await delay(1000);

  try {
    const testSlug = `test-notes-${Date.now()}`;
    const slugUrl = `${BASE_URL}/${testSlug}`;
    console.log(`Using test slug: /${testSlug}`);

    // Test 1: GET empty note
    console.log('\nTest 1: Fetching non-existent note...');
    const initialGet = runCurl(slugUrl);
    console.log(`Result: "${initialGet}"`);
    if (initialGet !== '') {
      throw new Error(`Expected empty string, got: "${initialGet}"`);
    }
    console.log('✅ Test 1 Passed: Empty note returns empty content.');

    // Test 2: POST update note
    console.log('\nTest 2: Saving text via POST...');
    const postMessage = 'Hello from automated terminal tests!';
    const postResult = runCurl(`-d "${postMessage}" ${slugUrl}`);
    console.log(`Result: "${postResult.trim()}"`);
    if (!postResult.includes('Successfully saved')) {
      throw new Error(`Unexpected save output: "${postResult}"`);
    }
    console.log('✅ Test 2 Passed: Saved text response matches expected CLI format.');

    // Test 3: GET updated note
    console.log('\nTest 3: Fetching saved text...');
    const secondGet = runCurl(slugUrl);
    console.log(`Result: "${secondGet}"`);
    if (secondGet !== postMessage) {
      throw new Error(`Expected "${postMessage}", got: "${secondGet}"`);
    }
    console.log('✅ Test 3 Passed: Retrieved text matches saved text.');

    // Test 4: Pipe data via curl
    console.log('\nTest 4: Piping data via curl -d @- ...');
    const pipedMessage = 'Piped text content from standard input stream.';
    const pipeResult = runCurl(`-d @- ${slugUrl}`, pipedMessage);
    console.log(`Result: "${pipeResult.trim()}"`);
    if (!pipeResult.includes('Successfully saved')) {
      throw new Error(`Unexpected pipe save output: "${pipeResult}"`);
    }

    // Verify piped text was saved
    const thirdGet = runCurl(slugUrl);
    console.log(`Result: "${thirdGet}"`);
    if (thirdGet !== pipedMessage) {
      throw new Error(`Expected "${pipedMessage}", got: "${thirdGet}"`);
    }
    console.log('✅ Test 4 Passed: Piping contents saved correctly.');

    // Test 5: Verify browser raw data query parameter support
    console.log('\nTest 5: Accessing note via browser query parameter (?raw=true)...');
    // Using a different User Agent to simulate a browser but passing raw=true
    const rawQueryGet = runCurl(`-H "User-Agent: Mozilla/5.0" "${slugUrl}?raw=true"`);
    console.log(`Result: "${rawQueryGet}"`);
    if (rawQueryGet !== pipedMessage) {
      throw new Error(`Expected "${pipedMessage}" with raw=true, got: "${rawQueryGet}"`);
    }
    console.log('✅ Test 5 Passed: Query parameter ?raw=true works for non-CLI clients.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    // Terminate server
    if (serverProcess) {
      console.log('\nStopping test server...');
      serverProcess.kill('SIGINT');
    }
  }
}

main();
