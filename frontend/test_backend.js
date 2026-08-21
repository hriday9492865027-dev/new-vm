const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBackend() {
    console.log("Testing Backend Proxy at http://localhost:3000/api/compile...");

    const code = 'print("Hello from Backend Proxy")';
    
    try {
        const response = await fetch('http://localhost:3000/api/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: 'python',
                version: '*',
                files: [{ content: code }],
                stdin: ''
            })
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        
        if (data.run && data.run.stdout.includes("Hello from Backend Proxy")) {
            console.log("SUCCESS: Backend returned correct output.");
            console.log("Output:", data.run.stdout);
        } else {
            console.log("FAILURE: Unexpected response.");
            console.log("Data:", data);
        }

    } catch (error) {
        console.error("ERROR: Failed to connect to backend.", error);
    }
}

testBackend();
