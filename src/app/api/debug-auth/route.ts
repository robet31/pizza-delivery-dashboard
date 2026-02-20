import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Debug Login</title>
  <style>
    body { font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
    .result { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; }
    input { padding: 10px; width: 200px; margin: 5px; }
    button { padding: 10px 20px; background: #0066ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    pre { background: #1a1a1a; color: #0f0; padding: 15px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🔐 Debug Login Test</h1>
  <form id="testForm">
    <input type="email" id="email" value="admin@pizza.com" placeholder="Email"><br>
    <input type="text" id="password" value="password123" placeholder="Password"><br>
    <button type="submit">Test Login</button>
  </form>
  <div id="result" class="result" style="display:none"></div>
  
  <script>
    document.getElementById('testForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      const res = await fetch('/api/debug-auth', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password})
      });
      
      const data = await res.json();
      document.getElementById('result').style.display = 'block';
      document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    });
  </script>
</body>
</html>
`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}
