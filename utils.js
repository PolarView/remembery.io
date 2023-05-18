const quizLength = (wordsStorage) => {
  const wordsStorageLength = wordsStorage.length;
  if (wordsStorageLength < 25) return null;
  else if (wordsStorageLength > 50) return 30;
};

module.exports = { quizLength };
