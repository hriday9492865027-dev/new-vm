
const https = require('https');

function postPiston(stdin) {
    const code = `
try:
    print(f"Stdin received: {input()}")
    print(f"Stdin received: {input()}")
except EOFError:
    print("EOFError")
except Exception as e:
    print(f"Error: {e}")
`;

    const data = JSON.stringify({
        language: 'python',
        version: "*",
        files: [{ content: code }],
        stdin: stdin
    });

    const options = {
        hostname: 'emkc.org',
        path: '/api/v2/piston/execute',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    console.log(`Testing stdin: ${JSON.stringify(stdin)}`);

    const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            const json = JSON.parse(body);
            if (json.run) {
                console.log("Stdout:", json.run.stdout);
                console.log("Stderr:", json.run.stderr);
            } else {
                console.log("Response:", json);
            }
        });
    });

    req.on('error', error => {
        console.error(error);
    });

    req.write(data);
    req.end();
}

// Test Case: multiline input
postPiston("5\n1 1 1 1 1");
