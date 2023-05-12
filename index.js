const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
// const { parse } = require("path");
const supabaseUrl = process.env.SUPERBASE_URL;
const supabaseKey = process.env.SUPERBASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
console.log(supabase); // display Supabase instance information to debug

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.YOUR_TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

bot.setMyCommands([
  { command: "/storage", description: "shows all inputed words" },
  { command: "/clear", description: "clear all your inputed words from storage" },
  { command: "/quiz", description: "start quiz" }
]);

// // Matches "/echo [whatever]"
// bot.onText(/\/echo (.+)/, (msg, match) => {
//   // 'msg' is the received Message from Telegram
//   // 'match' is the result of executing the regexp above on the text content
//   // of the message

//   const chatId = msg.chat.id;
// });

// Listen for any kind of message. There are different kinds of
// messages.
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  console.log("hi");
  const word = msg.text;
  console.log(msg);
  if (msg.text === "/start") {
    const greetingMd = `You can check the output markdown text in **two columns editing**.

    *   Features
        *   [x] 📝 **WYSIWYG Markdown** - Write markdown in an elegant way
        *   [x] 🎨 **Themable** - Theme can be shared and used with npm packages
        *   [x] 🎮 **Hackable** - Support your awesome idea by plugin
        *   [x] ⚡ **Slash & Tooltip** - Write fast for everyone, driven by plugin
        *   [x] 🧮 **Math** - LaTeX math equations support, driven by plugin
        *   [x] 📊 **Table** - Table support with fluent ui, driven by plugin
        *   [x] 💾 **Clipboard** - Support copy and paste markdown, driven by plugin
        *   [x] 👍 **Emoji** - Support emoji shortcut and picker, driven by plugin
    *  `;
    bot.sendMessage(chatId, greetingMd, { parse_mode: "Markdown" });
  }
  if (msg.text === "/storage") {
    let { data: consistentStorage, error } = await supabase
      .from("consistentStorage")
      .select("word");

    if (consistentStorage.length > 0) {
      const storageWordsList = consistentStorage.map((item) => Object.values(item)[0]).join("\r\n");
      // const mdHistory = wordsConsistentStorage.join("\r\n");
      // console.log(mdHistory);
      bot.sendMessage(chatId, storageWordsList);
    } else {
      bot.sendMessage(chatId, "You storage is empty");
    }
  } else if (msg.text === "/clear") {
    const { data, error } = await supabase.from("consistentStorage").delete().neq("id", 40000);
    bot.sendMessage(chatId, "Your word collection was cleared!");
  } else if (msg.text === "quiz") {
  } else if (msg.text !== "/start") {
    const translate = async (msg) => {
      const options = {
        method: "GET",
        url: "https://translated-mymemory---translation-memory.p.rapidapi.com/get",
        params: {
          langpair: "en|ru",
          q: word,
          mt: "1",
          onlyprivate: "0",
          de: "a@b.c"
        },
        headers: {
          "X-RapidAPI-Key": process.env.X_RapidAPI_Key,
          "X-RapidAPI-Host": process.env.X_RapidAPI_Host
        }
      };

      try {
        const { data } = await axios.request(options);
        const nativeWord = data.matches[0].segment;
        const translation = data.matches[0].translation;
        // const historyItem = `${data.matches[0].segment} - ${translation}`;

        const { resp, error } = await supabase
          .from("consistentStorage")
          .insert([{ word: nativeWord, translation: translation }]);

        bot.sendMessage(chatId, `${translation}`);
      } catch (error) {
        console.error(error);
      }
    };
    translate();
  }

  // send a message to the chat acknowledging receipt of their message
  // bot.sendMessage(chatId, "Received your message");
});
