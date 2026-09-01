const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

let diff = '';
try {
    diff = execSync('git diff --cached', { encoding: 'utf8' });
} catch (e) {
    process.exit(0);
}

if (!diff.trim()) {
    process.exit(0);
}

const mcpJsonPath = path.join(process.cwd(), '.aevum', 'mcp.json');
if (!fs.existsSync(mcpJsonPath)) {
    process.exit(0);
}

let port = 3344;
try {
    const mcpData = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
    port = mcpData.port || 3344;
} catch (e) {
    process.exit(0);
}

const postData = JSON.stringify({ diff });

const req = http.request({
    hostname: '127.0.0.1',
    port: port,
    path: '/api/git/pre-commit',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (response.success) {
                process.exit(0);
            } else {
                console.error('\n❌ [Aevum Git-Hook] Commit bị chặn:');
                console.error(response.message || 'Chưa vượt qua kiểm tra chất lượng.');
                process.exit(1);
            }
        } catch (e) {
            process.exit(0);
        }
    });
});

req.on('error', (e) => {
    process.exit(0);
});

req.write(postData);
req.end();
