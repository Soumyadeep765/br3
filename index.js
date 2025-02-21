const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
let rids = [];



const app = express();
app.use(express.json());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function chunkArray(array, size) {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
        array.slice(i * size, i * size + size)
    );
}
async function alertNoUsersToBroadcast(botToken, adminId) {
  try {
    // Call the webhook endpoint
    await axios.get(`https://api.teleservices.io/Broadcast/webhook/state.php?bot_token=${botToken}`);

    const alertText = `⚠️ *ALERT: No Users in Your Bot!*\n\n🚨 *Oops! It looks like your bot doesn't have any users yet.*\n\n❌ *Please add users to your bot to proceed with the broadcast.*\n\n💬 Need help? Join our [Support Group](https://t.me/teleservices_support).\n📖 For documentation, check: [Teleservices Docs](https://docs.teleservices.io/#BJS)`;

    // Send the alert message and return the promise
    return axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: adminId,
      text: alertText,
      parse_mode: "Markdown"
    });
  } catch (error) {
    console.error("Error in alertNoUsersToBroadcast:", error.message);
    throw error; // Re-throw the error for the caller to handle
  }
}
async function floodWait(botToken, adminId, messageId, totalUsers, successCount, failedCount, errorBreakdown, waitTime) {
  const { blocked, deleted, invalid, other } = errorBreakdown;
  const statusText = `🚀 *STATUS: Waiting 😴...*\n

✅ *Successful Sent:* ${successCount}\n
😔 *Failed:* ${failedCount}\n
🔥 *Overall Status:*\n
👥 *Total Users:* ${totalUsers}\n
⚠️ *ERROR MATRIX:*\n
❌ *Blocked:* ${blocked} || 🗑️ *Deleted:* ${deleted}\n
❓ *Invalid IDs:* ${invalid} || ⚙️ *Other:* ${other}\n
💻 *System Status:* ⚙️ *Running...*\n
⏳ *Waiting for ${waitTime}s...*`;

  // Send the update
  await axios.post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    chat_id: adminId,
    message_id: messageId,
    text: statusText,
    parse_mode: "Markdown"
  });

  // Wait for the specified time using delay
  await delay(waitTime * 1000);
    }
function logFailure(userId, reason, logFilePath) {
    const logEntry = `User ID: ${userId} | Reason: ${reason}\n`;
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
}
function chunkArrays(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
async function getProxyConfig() {
    const url = "https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=1&country_code__in=DE";
    const headers = {
        "Authorization": "Token bfxh7nq93gxf6lcfspektoz0svwe40byzxzp4wd9"
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`Failed to fetch proxy: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const proxy = data.results[0];
            const proxyAddress = proxy.proxy_address;
            const proxyPort = proxy.port;
            const proxyUsername = proxy.username;
            const proxyPassword = proxy.password;

            // Return Axios proxy config
            return {
                proxy: {
                    host: proxyAddress,
                    port: parseInt(proxyPort),
                    auth: {
                        username: proxyUsername,
                        password: proxyPassword
                    }
                }
            };
        } else {
            console.warn("No proxies found, proceeding without proxy.");
            return {}; // Return empty config if no proxy is available
        }
    } catch (error) {
        console.error("Error fetching proxy:", error);
        return {}; // Return empty config if there's an error fetching the proxy
    }
                    }

async function sendInitialStatus(botToken, adminId, totalUsers) {
    const startingText = `🚀`;
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: adminId,
        text: startingText,
        parse_mode: "Markdown"
    });
    return response.data.result.message_id;
}

async function updateStatus(botToken, adminId, messageId, completedBatches, totalBatches, totalUsers, successCount, failedCount, errorBreakdown, currentPage, totalPages) {
  const { blocked, deleted, invalid, other } = errorBreakdown;
  const statusText = `🚀 *STATUS: LIVE*\n
Page *${currentPage}/${totalPages}*\n
🔄 *Batches:* ${completedBatches}/${totalBatches}\n
✅ *Sent:* ${successCount} | 😔 *Failed:* ${failedCount}\n
🔥 *Total Users:* ${totalUsers}\n
⚠️ *Errors:* Blocked: ${blocked} | Deleted: ${deleted} | Other: ${other}\n
💻 *System Status:* ⚙️ *Running...*`;
  await axios.post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    chat_id: adminId,
    message_id: messageId,
    text: statusText,
    parse_mode: "Markdown"
  });
}

async function sendFinalStats(botToken, adminId, totalUsers, successCount, failedCount, errorBreakdown, logFilePath, messageId, formattedTime) {
  const { blocked, deleted, invalid, other } = errorBreakdown;
  const finalText = `✅ *Broadcast Complete!*\n
⏳ *Time Taken:* ${formattedTime}\n
👥 *Total Users:* ${totalUsers} | ✅ *Sent:* ${successCount}\n
😔 *Failed:* ${failedCount}\n
⚠️ *ERROR REPORT:*\n
❌ *Blocked:* ${blocked} || 🗑️ *Deleted:* ${deleted}\n
❓ *Invalid IDs:* ${invalid} || ⚙️ *Other:* ${other}\n
🎯 *System Status:* *Complete!* 😎`;

  await axios.post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    chat_id: adminId,
    message_id: messageId,
    text: finalText,
    parse_mode: "Markdown"
  });
await axios.get(`https://api.teleservices.io/Broadcast/webhook/state.php?bot_token=${botToken}`)

    

  await axios.post(`https://api.teleservices.io/Broadcast/webhook/removeusers.php`, {
    bot_token: botToken,
    admin_chat_id: adminId,
    ids: rids,
  });

  if (other) {
    if (fs.existsSync(logFilePath)) {
        const formData = new FormData();
        formData.append('chat_id', adminId);
        formData.append('document', fs.createReadStream(logFilePath));
        await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, formData, {
            headers: formData.getHeaders()
        });
        fs.unlinkSync(logFilePath);  // Delete the file after sending
    }
} else {
    if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);  // Delete the log file only if it exists and no errors occurred
    }
}
}
async function sendMediaOrText(botToken, userId, params, errorBreakdown, logFilePath, proxycon) {
    const { 
        type, text, caption, file_id, parse_mode = 'Markdown', 
        disable_web_page_preview = false, protect_content = false, 
        inline = [], pin = false, entities = null} = params;
    
    const commonData = {
        chat_id: userId,
        parse_mode,
        protect_content,
        reply_markup: { inline_keyboard: inline }
    };
    
    let apiMethod, requestData;

    switch (type) {
        case 'text':
            if (!text) {
                logFailure(userId, 'Missing text for message type "text"', logFilePath);
                errorBreakdown.other += 1;
                return false;
            }
            apiMethod = 'sendMessage';
            requestData = { ...commonData, text, disable_web_page_preview };
            break;
        case 'photo':
            if (!file_id) {
                logFailure(userId, 'Missing file_id for message type "photo"', logFilePath);
                errorBreakdown.other += 1;
                return false;
            }
            apiMethod = 'sendPhoto';
            requestData = { ...commonData, photo: file_id, caption };
            break;
        case 'video':
            apiMethod = 'sendVideo';
            requestData = { ...commonData, video: file_id, caption };
            break;
        case 'document':
            apiMethod = 'sendDocument';
            requestData = { ...commonData, document: file_id, caption };
            break;
        case 'audio':
            apiMethod = 'sendAudio';
            requestData = { ...commonData, audio: file_id, caption };
            break;
        case 'voice':
            apiMethod = 'sendVoice';
            requestData = { ...commonData, voice: file_id, caption };
            break;
        case 'sticker':
            apiMethod = 'sendSticker';
            requestData = { ...commonData, sticker: file_id };
            break;
        case 'animation':
            apiMethod = 'sendAnimation';
            requestData = { ...commonData, animation: file_id, caption };
            break;
        default:
            logFailure(userId, `Unsupported media type: ${type}`, logFilePath);
            errorBreakdown.other += 1;
            return false;
    }

    try {
        const response = await axios.post(`https://api.telegram.org/bot${botToken}/${apiMethod}`, requestData, proxycon);
        
        if (pin) {
            const messageId = response.data.result.message_id;
            await axios.post(`https://api.telegram.org/bot${botToken}/pinChatMessage`, {
                chat_id: userId,
                message_id: messageId
            });
        }

        return true;
    } catch (error) {
        const { error_code, description } = error.response?.data || {};
        if (error_code === 429) {
            const retryAfter = error.response.data.parameters.retry_after || 1;
            await delay(retryAfter * 1000);
            return sendMediaOrText(botToken, userId, params, errorBreakdown, logFilePath, proxycon, rids);
        }

        if (error_code === 400 && description.includes("chat not found")) {
            errorBreakdown.invalid += 1; 
            rids.push(userId);
        } else if (error_code === 403 && description.includes("bot was blocked by the user")) {
            errorBreakdown.blocked += 1;
            rids.push(userId);
        } else if (error_code === 403 && description.includes("user is deactivated")) {
            errorBreakdown.deleted += 1;
            rids.push(userId);
        } else {
            errorBreakdown.other += 1;
            rids.push(userId);
            logFailure(userId, `Other: ${description}`, logFilePath);
        }
        return false;
    }
}
async function fetchUsersPage(botUsername, page) {
    const url = `https://api.teleservices.io/Broadcast/public/users.php?bot_username=${botUsername}&page=${page}`;

    // Using native fetch
    const response = await fetch(url, {
        method: 'GET',  // The default method is GET, so you can omit it
        headers: {
            'Content-Type': 'application/json',  // Optional, depending on your API's requirement
        }
    });

    // Check if the response is successful (status 200)
    if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
    }

    // Parse JSON data from the response
    const data = await response.json();
    return data;
}
async function sendMessageBatch(botToken, userBatch, params, errorBreakdown, logFilePath, proxycon) {
    let success = 0;
    const promises = userBatch.map(async userId => {
        const isSuccess = await sendMediaOrText(botToken, userId, params, errorBreakdown, logFilePath);
        if (isSuccess) success += 1;
    });
    await Promise.all(promises);
    return success;
}


app.all('/br', async (req, res) => {
  const startTime = Date.now();
  try {
    // Extract parameters from the request body or query
    const botToken = req.body.bot_token || req.query.bot_token;
    const adminId = req.body.admin_id || req.query.admin_id;
    const botUsername = req.body.bot_username || req.query.bot_username;

    const type = req.body.type || req.query.type;
    const text = req.body.text || req.query.text;
    const caption = req.body.caption || req.query.caption;
    const file_id = req.body.file_id || req.query.file_id;
    const parse_mode = req.body.parse_mode || req.query.parse_mode;
    const protect_content = req.body.protect_content || req.query.protect_content;
    const disable_web_page_preview = req.body.disable_web_page_preview || req.query.disable_web_page_preview;
    const inline = req.body.inline_keyboard || req.query.inline_keyboard;
    const pin = req.body.pin || req.query.pin;
    const entity = req.body.entity || req.query.entity;

    // Validate required parameters
    if (!botToken || !adminId || !botUsername || !type) {
      return res.status(400).json({ message: 'Missing required parameters.' });
    }

    const BID = botToken.split(":")[0];
    const logFilePath = path.join(__dirname, `${BID}_broadcast_log.txt`);
    fs.writeFileSync(logFilePath, '', 'utf8');

    let totalUsers = 0;
    let successCount = 0;
    let failedCount = 0;
    const errorBreakdown = { blocked: 0, deleted: 0, invalid: 0, other: 0 };
    let messageId = null;
    
    // Fetch the users from the first page
    const firstPageData = await fetchUsersPage(botUsername, 1);
    totalUsers = firstPageData.total_users;
    
    if (totalUsers <= 0) { // Fix condition to check if no users
      await alertNoUsersToBroadcast(botToken, adminId);
      return res.status(200).json({ message: 'No users to broadcast to.' });
    }

    const totalPages = firstPageData.total_pages;
    const usersId = firstPageData.ids;

    const batchSize = 25;
    const userBatches = chunkArray(usersId, batchSize);
    const totalBatches = userBatches.length;

    // Send initial status message with total users
    messageId = await sendInitialStatus(botToken, adminId, totalUsers, totalBatches, totalPages);

    // Process each page
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      const pageData = await fetchUsersPage(botUsername, currentPage);
      const usersId = pageData.ids;
      const userBatches = chunkArray(usersId, batchSize);
      const pageTotalBatches = userBatches.length;

      let pageSuccessCount = 0;
      let proxycon = getProxyConfig();

      if (currentPage % 10 === 0) { // Fix to use strict equality check
        await floodWait(botToken, adminId, messageId, totalUsers, successCount, failedCount, errorBreakdown, 30);
      }

      // Process each batch
      for (let i = 0; i < pageTotalBatches; i++) {
        const batch = userBatches[i];
        const batchSuccess = await sendMessageBatch(botToken, batch, { 
          type, text, caption, file_id, parse_mode, 
          disable_web_page_preview, protect_content, inline, pin, entity }, errorBreakdown, logFilePath, proxycon);
    
        pageSuccessCount += batchSuccess;
        successCount += batchSuccess;
        failedCount += batch.length - batchSuccess;
    
        // Update status for each page and batch
        await updateStatus(botToken, adminId, messageId, i + 1, pageTotalBatches, totalUsers, successCount, failedCount, errorBreakdown, currentPage, totalPages);
    
        // Add a 0.5-second delay before processing the next batch
        await delay(500);
      }

      if (currentPage < totalPages) {
        await floodWait(botToken, adminId, messageId, totalUsers, successCount, failedCount, errorBreakdown, 10);
      }
    }

    // Calculate the elapsed time for the broadcast
    const elapsedTime = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsedTime / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const formattedTime = elapsedMinutes > 0
      ? `${elapsedMinutes}m ${elapsedSeconds % 60}s`
      : `${elapsedSeconds}s`;

    // Send final stats to the admin
    await sendFinalStats(botToken, adminId, totalUsers, successCount, failedCount, errorBreakdown, logFilePath, messageId, formattedTime);

    return res.status(200).json({ message: 'Broadcast completed successfully.' });
  } catch (error) {
    console.error('Error during broadcast:', error);
    return res.status(500).json({ message: 'Error during broadcast.', error: error.message });
  }
});

async function forwardMessage(botToken, userId, params, errorBreakdown, logFilePath, proxycon, rids =[]) {
  const { from_chat_id, message_id, pin = false, forward_tag = true } = params;

  if (!from_chat_id || !message_id) {
    logFailure(userId, 'Missing from_chat_id or message_id for message type', logFilePath);
    errorBreakdown.other += 1;
    return false;
  }

  const requestData = { chat_id: userId, from_chat_id, message_id };

  try {
    let newMessageId;

    if (forward_tag) {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/forwardMessage`, requestData, proxycon);
      newMessageId = response.data.result.message_id;
    } else {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/copyMessage`, requestData, proxycon);
      newMessageId = response.data.result.message_id;
    }

    if (pin) {
      await axios.post(`https://api.telegram.org/bot${botToken}/pinChatMessage`, {
        chat_id: userId,
        message_id: newMessageId
      });
    }

    return true;
  } catch (error) {
    const { error_code, description } = error.response?.data || {};
    if (error_code === 429) {
      const retryAfter = error.response.data.parameters.retry_after || 1;
      await delay(retryAfter * 1000);
      return forwardMessage(botToken, userId, params, errorBreakdown, logFilePath, proxycon, rids);
    }

    if (error_code === 400 && description.includes("chat not found")) {
      errorBreakdown.invalid += 1;
      rids.push(userId)
    } else if (error_code === 403 && description.includes("bot was blocked by the user")) {
      errorBreakdown.blocked += 1;
      rids.push(userId);
    } else if (error_code === 403 && description.includes("user is deactivated")) {
      errorBreakdown.deleted += 1;
      rids.push(userId);
    } else {
      errorBreakdown.other += 1;
      logFailure(userId, `Other: ${description}`, logFilePath);
    }
    return false;
  }
}

async function sendForwardBatch(botToken, userBatch, params, errorBreakdown, logFilePath, proxycon, rids) {
    let success = 0;
    const promises = userBatch.map(async userId => {
        const isSuccess = await forwardMessage(botToken, userId, params, errorBreakdown, logFilePath, proxycon, rids);  // Only handles forwarding
        if (isSuccess) success += 1;
    });
    await Promise.all(promises);
    return success;
}

app.all('/forward', async (req, res) => {
  const startTime = Date.now();
  try {
    const botToken = req.body.bot_token || req.query.bot_token;
    const adminId = req.body.admin_id || req.query.admin_id;
    const botUsername = req.body.bot_username || req.query.bot_username;
    const type = req.body.type || req.query.type;
    const from_chat_id = req.body.from_chat_id || req.query.from_chat_id;
    const message_id = req.body.message_id || req.query.message_id;
    const pin = req.body.pin || req.query.pin;
    const forward_tag = req.body.forward || req.query.forward; // Fixed to use req.query.forward

    if (!botToken || !adminId || !botUsername || !from_chat_id || !message_id || type !== 'forward') {
      return res.status(400).json({ message: 'Missing required parameters or incorrect type.' });
    }

    const BID = botToken.split(":")[0];
    const logFilePath = path.join(__dirname, `${BID}_broadcast_log.txt`);
    fs.writeFileSync(logFilePath, '', 'utf8');

    let totalUsers = 0;
    let successCount = 0;
    let failedCount = 0;
    const errorBreakdown = { blocked: 0, deleted: 0, invalid: 0, other: 0 };
    let messageIdForStatus = null;
    let rids = [];

    const firstPageData = await fetchUsersPage(botUsername, 1);
    totalUsers = firstPageData.total_users;
    const totalPages = firstPageData.total_pages;
    const usersId = firstPageData.ids;
    
    if (totalUsers <= 0) { // Changed from totalUsers < 0 to totalUsers <= 0 for correct validation
      await alertNoUsersToBroadcast(botToken, adminId);
      return res.status(200).json({ message: 'No users to broadcast to.' });
    }

    const batchSize = 25;
    const userBatches = chunkArray(usersId, batchSize);
    const totalBatches = userBatches.length;

    messageIdForStatus = await sendInitialStatus(botToken, adminId, totalUsers, totalBatches, totalPages);

    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      const pageData = await fetchUsersPage(botUsername, currentPage);
      const usersId = pageData.ids;
      const userBatches = chunkArray(usersId, batchSize);
      const pageTotalBatches = userBatches.length;

      let pageSuccessCount = 0;
      let proxycon = getProxyConfig();

      if (currentPage % 10 === 0) { // Fixed to === for strict equality check
        await floodWait(botToken, adminId, messageIdForStatus, totalUsers, successCount, failedCount, errorBreakdown, 30);
      }

      for (let i = 0; i < pageTotalBatches; i++) {
        const batch = userBatches[i];
        const batchSuccess = await sendForwardBatch(botToken, batch, { 
          from_chat_id, message_id, pin, forward_tag
        }, errorBreakdown, logFilePath, proxycon, rids);

        pageSuccessCount += batchSuccess;
        successCount += batchSuccess;
        failedCount += batch.length - batchSuccess;

        await updateStatus(botToken, adminId, messageIdForStatus, i + 1, pageTotalBatches, totalUsers, successCount, failedCount, errorBreakdown, currentPage, totalPages, rids);

        await delay(500);
      }
      
      if (currentPage < totalPages) {
        await floodWait(botToken, adminId, messageIdForStatus, totalUsers, successCount, failedCount, errorBreakdown, 5);
      }
    }

    const elapsedTime = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsedTime / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const formattedTime = elapsedMinutes > 0
      ? `${elapsedMinutes}m ${elapsedSeconds % 60}s`
      : `${elapsedSeconds}s`;

    await sendFinalStats(botToken, adminId, totalUsers, successCount, failedCount, errorBreakdown, logFilePath, messageIdForStatus, formattedTime, rids);

    res.status(200).json({ message: 'Forward broadcast completed successfully.' });
  } catch (error) {
    console.error('Error during forward broadcast:', error);
    res.status(500).json({ message: 'Error during forward broadcast.', error: error.message });
  }
});
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
