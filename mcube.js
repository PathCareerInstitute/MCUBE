const cron = require("node-cron");
const axios = require("axios");
const twilio = require("twilio");
const dotenv = require("dotenv");

dotenv.config();

// ===== CONFIG =====
const API_URL = "https://config.mcube.com/Restmcube-api/login";

// ===== TWILIO CONFIG =====
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
const FROM_NUMBER = process.env.TWILIO_FROM;
const TO_NUMBER = process.env.TWILIO_TO;

// ===== USERS =====
const users = [
  { username: "path1", password: "123456" },
  { username: "path2", password: "123456" },
  { username: "path3", password: "123456" },
  { username: "path4", password: "123456" },
  { username: "path5", password: "123456" },
  { username: "Mohitchawla", password: "153126" },
];

// ===== HEADERS =====
const headers = {
  "Content-Type": "application/json",
  "Origin": "https://app.mcube.com",
  "Referer": "https://app.mcube.com/",
  "User-Agent": "Mozilla/5.0",
  "Accept": "application/json, text/plain, */*",
};

// ===== HELPERS =====
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ===== SEND SMS =====
const sendSMS = async (message) => {
  try {
    await client.messages.create({
      body: message,
      from: FROM_NUMBER,
      to: TO_NUMBER,
    });
    console.log("📩 SMS sent");
  } catch (err) {
    console.error("❌ SMS error:", err.message);
  }
};

const loginUser = async (user, retry = 2) => {
  try {
    const res = await axios.post(API_URL, user, {
      headers,
      timeout: 10000,
    });

    // 🔥 IMPORTANT CHECK
    if (res.data?.status === 200) {
      console.log(`✅ ${user.username} logged in`);
      return { user: user.username, status: "success" };
    } else {
      throw new Error(res.data?.message || "Login failed");
    }

  } catch (err) {
    if (retry > 0) {
      console.log(`⚠️ Retry ${user.username} (${retry})`);
      return loginUser(user, retry - 1);
    }

    console.error(`❌ ${user.username} failed`);
    console.error("Reason:", err.response?.data || err.message);

    return { user: user.username, status: "failed" };
  }
};


// ===== MAIN JOB =====
const runAllUsers = async () => {
  console.log("\n⏰ Job started:", new Date().toLocaleString());

  let failedUsers = [];

  for (const user of users) {
    const result = await loginUser(user);

    if (result.status === "failed") {
      failedUsers.push(result.user);
    }

    await delay(2000); // avoid rate limit
  }

  // ===== SEND ALERT =====
  if (failedUsers.length > 0) {
    const message = `🚨 MCube Login Failed\n\nUsers:\n${failedUsers.join(
      "\n"
    )}\n\nTime: ${new Date().toLocaleString()}`;

    await sendSMS(message);
  } else {
    console.log("✅ All users logged in successfully");
  }

  console.log("🏁 Job finished\n");
};

// ===== CRON (EVERY HOUR) =====
cron.schedule("*/50 * * * *", runAllUsers, {
  timezone: "Asia/Kolkata",
});

// ===== RUN ON START =====
runAllUsers();