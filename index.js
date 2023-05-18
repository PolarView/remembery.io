const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const axios = require("axios");
const { quizLength } = require("./utils");
const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPERBASE_URL;
const supabaseKey = process.env.SUPERBASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
// console.log(supabase); // display Supabase instance information to debug

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.YOUR_TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

let quizWordsArr;
let currentWordIndex = 0;
let quizWordsGuessed;
const selfTransRegexp = /\p{L}+\s-\s\p{L}+/u;

bot.setMyCommands([
  { command: "/storage", description: "shows all inputed words" },
  { command: "/clear", description: "clear all your inputed words from storage" },
  { command: "/quiz", description: "start quiz" }
]);

const quizOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [{ text: "Знаю", callback_data: "know" }],
      [{ text: "Не помню", callback_data: "forget" }],
      [{ text: "Выйти", callback_data: "exit" }]
    ]
  })
};

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  const word = msg.text;
  if (msg.text === "/start") {
    try {
      let { data: users } = await supabase.from("users").select("id").eq("id", chatId);
      if (users.length < 1) {
        const { data } = await supabase
          .from("users")
          .insert([{ id: chatId, first_name: msg.from.first_name, username: msg.from.username }]);
      }
    } catch (err) {
      console.log(`err occured during registration with error ${err}`);
      bot.sendMessage(
        chatId,
        "Sorry, error happend throghout registration, write us at @remembery_support"
      );
    }
    const greetingHtml = `<pre>
    <strong>
                 Remembery.io - твой проводник в мир английского языка, он существенно
                 облегчит тебе изучение английского и предоставит его в эффективной форме
    
    
                                       И так что же он умеет?.
    </strong>
                                              Features
        <b>
        * 📝 **Переводи и запоминай** - просто напиши слово которое тебя интересует,
        * и бот не только переведет его, но и добавит в твою личнуб коллекцию изученых слов!
        
        * 🎮 **Игра** - выбери /quiz и бот предложит тебе вспомнить пройденные тобою слова,
        * на основе нашего алгоритма 
        
        * 📊 **Сохраняй** - Все ваши слова надёжно хранятсе в вашей коллекции, в любой момент вы можете
        * забив /storage их просмотреть
        
        </b>
    </pre>         
       `;
    await bot.sendMessage(chatId, greetingHtml, { parse_mode: "HTML" });
  }
  if (selfTransRegexp.test(msg.text)) {
    const nativeWord = msg.text.split("-")[0].trim();
    const translation = msg.text.split("-")[1].trim();
    try {
      const { resp, error } = await supabase
        .from("words_storage")
        .insert([{ user_id: chatId, word: nativeWord, translation: translation }]);

      bot.sendMessage(chatId, `${nativeWord} - ${translation} added`);
    } catch (err) {
      console.log(`err occured during procession of your translation with error ${err}`);
      bot.sendMessage(
        chatId,
        "Sorry, error happend throghout procession of your translation, write us at @remembery_support"
      );
    }
  } else {
    if (msg.text === "/storage") {
      let { data: words_storage } = await supabase
        .from("words_storage")
        .select("word")
        .eq("user_id", chatId)
        .order("created_at", { ascending: false });

      if (words_storage.length > 0) {
        const storageWordsList = words_storage
          .map((item) => {
            return `*${Object.values(item)[0]}*`;
          })
          .join("\r\n");

        bot.sendMessage(chatId, storageWordsList, { parse_mode: "Markdown" });
      } else {
        bot.sendMessage(chatId, "You storage is empty");
      }
    } else if (msg.text === "/clear") {
      try {
        const { data, error } = await supabase.from("words_storage").delete().eq("user_id", chatId);

        bot.sendMessage(chatId, "Your word collection was cleared!");
      } catch (err) {
        console.log(`err occured during translation with error ${err}`);
        bot.sendMessage(
          chatId,
          "Sorry, error happend throghout registration, write us at @remembery_support"
        );
      }
    } else if (msg.text === "/quiz") {
      if (currentWordIndex === 0) {
        try {
          let { data: words_storage, error } = await supabase
            .from("words_storage")
            .select("*")
            .eq("user_id", chatId)
            .order("word_score", { ascending: true });

          const getSortedQuizWordsArr = async (words_storage) => {
            const newWordsSortes = [];
            const scoreSorted = [];
            words_storage.forEach((item) => {
              if (item.new) {
                newWordsSortes.push(item);
              } else {
                scoreSorted.push(item);
              }
            });

            return newWordsSortes.concat(scoreSorted);
          };
          quizWordsArr = await getSortedQuizWordsArr(words_storage);
          quizWordsGuessed = quizWordsArr.length;

          console.log(quizWordsArr);
          await bot.sendMessage(chatId, quizWordsArr[0].word, quizOptions);
        } catch (err) {
          console.log(`err occured during quiz with error ${err}`);
          bot.sendMessage(
            chatId,
            "Sorry, error happend throghout quiz, write us at @remembery_support"
          );
        }
      } else {
        await bot.sendMessage(chatId, "You are already in quiz, exit out to start new one");
      }
    } else if (msg.text !== "/start") {
      const translate = async (msg) => {
        const nativeWord = msg.text;
        const requestData = {
          q: nativeWord,
          source: "en",
          target: "ru"
        };
        const options = {
          method: "POST",
          url: "https://deep-translate1.p.rapidapi.com/language/translate/v2",
          headers: {
            "content-type": "application/json",
            "X-RapidAPI-Key": process.env.X_RapidAPI_Key,
            "X-RapidAPI-Host": process.env.X_RapidAPI_Host
          },
          data: requestData
        };

        try {
          const { data } = await axios.request(options);
          const translation = data.data.translations.translatedText;
          if (nativeWord && translation) {
            const { resp, error } = await supabase
              .from("words_storage")
              .insert([{ user_id: chatId, word: nativeWord, translation: translation }]);

            bot.sendMessage(chatId, `${translation}`);
          }
        } catch (err) {
          console.log(`err occured during translation with error ${err}`);
          bot.sendMessage(
            chatId,
            "Sorry, error happend throghout translation, write us at @remembery_support"
          );
        }
      };
      translate(msg);
    }
  }

  // send a message to the chat acknowledging receipt of their message
  // bot.sendMessage(chatId, "Received your message");
});

bot.on("callback_query", async (msg) => {
  const data = msg.data;
  const chatId = msg.message.chat.id;
  const msgId = msg.message.message_id;
  let {
    word_score: currentWordScore,
    id: currentWordId,
    new: isNewWord
  } = quizWordsArr[currentWordIndex];
  const quizWordsTotalAmount = quizWordsArr.length;
  // const messageMarkDown = () => {
  //   return `
  //   `
  // }
  if (isNewWord) {
    const { data, error } = await supabase
      .from("words_storage")
      .update({ new: `${false}` })
      .eq("id", currentWordId);
  }
  if (data === "know") {
    await bot.sendMessage(
      chatId,
      `
    *Правильно - ${quizWordsArr[currentWordIndex].translation}*`,
      {
        parse_mode: "Markdown"
      }
    );
    if (currentWordScore < 1) {
      const { data, error } = await supabase
        .from("words_storage")
        .update({ word_score: `${currentWordScore + 0.1}` })
        .eq("id", currentWordId);
    }
    if (currentWordIndex === quizWordsArr.length - 1) {
      await bot.sendMessage(
        chatId,
        `Congrats, u guessed ${quizWordsGuessed} out of ${quizWordsTotalAmount}`
      );
      currentWordIndex = 0;
      await bot.deleteMessage(chatId, msgId);
      return;
    }
    await bot.deleteMessage(chatId, msgId);
    currentWordIndex++;
    await bot.sendMessage(chatId, quizWordsArr[currentWordIndex].word, quizOptions);
    return;
  }
  if (data === "forget") {
    await bot.sendMessage(
      chatId,
      `
    
    *${quizWordsArr[currentWordIndex].translation}*`,
      {
        parse_mode: "Markdown"
      }
    );
    if (currentWordScore > 0) {
      const { data, error } = await supabase
        .from("words_storage")
        .update({ word_score: `${currentWordScore - 0.1}` })
        .eq("id", currentWordId);
    }
    quizWordsGuessed = quizWordsGuessed - 1;
    if (currentWordIndex === quizWordsArr.length - 1) {
      await bot.sendMessage(
        chatId,
        `Congrats, u guessed ${quizWordsGuessed} out of ${quizWordsTotalAmount}`
      );
      await bot.deleteMessage(chatId, msgId);
      currentWordIndex = 0;
      return;
    }
    await bot.deleteMessage(chatId, msgId);
    currentWordIndex++;
    await bot.sendMessage(chatId, quizWordsArr[currentWordIndex].word, quizOptions);
    return;
  }
  if (data === "exit") {
    await bot.deleteMessage(chatId, msgId);

    currentWordIndex = 0;
    await bot.sendMessage(chatId, "exited out of quiz");
    return;
  }
});
