const fetch = require("node-fetch");

async function testHiddenInputs() {
  // Test Case from sample_questions.txt for Array Sum
  // Input:
  // 5
  // 1 1 1 1 1
  const hiddenInput = "5\n1 1 1 1 1";

  const code = `
try:
    n = int(input())
    print(f"N: {n}")
    arr = list(map(int, input().split()))
    print(f"Sum: {sum(arr)}")
except EOFError:
    print("EOFError")
except Exception as e:
    print(f"Error: {e}")
`;

  console.log("Testing Piston API with Hidden Input...");
  console.log(`Stdin: ${JSON.stringify(hiddenInput)}`);

  try {
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "python",
        version: "*",
        files: [{ content: code }],
        stdin: hiddenInput,
      }),
    });

    const data = await response.json();
    console.log("Response:", data);

    if (data.run) {
      console.log("Stdout:", data.run.stdout);
      console.log("Stderr:", data.run.stderr);
    }
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}

testHiddenInputs();
