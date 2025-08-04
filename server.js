// server.js

const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 使用原生 fetch，Node.js v18+ 已内置
// 如果你使用旧版Node.js，需要先 npm install node-fetch 然后 const fetch = require('node-fetch');

// 中间件：解析POST请求的JSON body
app.use(express.json());

// 中间件：提供 public 文件夹中的静态文件（HTML, CSS）
app.use(express.static(path.join(__dirname, 'public')));

// API 接口：/check-keys
app.post('/check-keys', async (req, res) => {
  const { keys } = req.body;
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ error: 'API keys array is required.' });
  }

  console.log(`收到 ${keys.length} 个 Key 的检测请求...`);

  const checkPromises = keys.map(key => checkSingleKey(key));
  const results = await Promise.allSettled(checkPromises);

  const formattedResults = results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // 这通常是代码内部错误，而不是API调用失败
      return {
        key: 'Unknown Key',
        isPro: false,
        error: 'An unexpected error occurred during check.',
        statusCode: 500
      };
    }
  });

  res.json(formattedResults);
});

// 辅助函数：检测单个 Key
async function checkSingleKey(apiKey) {
  const PRO_MODEL_NAME = 'gemini-2.5-pro-preview-05-06';
  const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${PRO_MODEL_NAME}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(GOOGLE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Check Pro status" }] }],
        generationConfig: { maxOutputTokens: 2 },
      }),
    });

    if (response.ok) {
      console.log(`Key ${apiKey.substring(0, 8)}... 是 Pro Key`);
      return { key: apiKey, isPro: true };
    } else {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || '未知错误';
      console.log(`Key ${apiKey.substring(0, 8)}... 失败: [${response.status}] ${errorMessage}`);
      return { key: apiKey, isPro: false, error: errorMessage, statusCode: response.status };
    }
  } catch (error) {
    console.error(`请求 Key ${apiKey.substring(0, 8)}... 时网络错误:`, error.message);
    return { key: apiKey, isPro: false, error: 'Network error or unable to reach Google API.', statusCode: 'N/A' };
  }
}


// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，正在监听 http://localhost:${PORT}`);
  console.log('请在浏览器中打开该地址来使用检测工具。');
});
