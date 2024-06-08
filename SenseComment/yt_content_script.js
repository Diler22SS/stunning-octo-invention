// Отслеживание изменений в DOM
const ytObserver = new MutationObserver(async (mutationsList) => {
  for (const mutation of mutationsList) {
    // Если изменение типа 'childList' и были добавлены новые узлы
    if (mutation.type === 'childList' && mutation.addedNodes.length) {
      // Поиск комментариев на странице без класса 'sentiment'
      const buttons = mutation.target.querySelectorAll("div:not(.sentiment)#toolbar");
      // Обработка найденных комментариев
      await handleYTButtons(buttons);
    }
  }
});

// Настройка и запуск наблюдения MutationObserver
const ytConfig = { childList: true, subtree: true }; //наблюдать за добавлением/удалением дочерних узлов во всем документе
ytObserver.observe(document.body, ytConfig);

async function processYTWebSocket(button) {
  // Получение текста комментария
  const previousSibling = button.parentNode.previousElementSibling;
  if (!previousSibling) return;

  const text = previousSibling.previousElementSibling.innerText;
  const div = document.createElement("div");

  // Отправка текста в background.js и ожидание ответа
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(text, (response) => {
      // Полученный ответ оборачивается в div, который добавляется после комментария
      console.log("received user data", response);
      div.innerHTML = "Тональность текста: " + response;
      button.after(div);
      resolve();
    });
  });
}

// Обработка найденных комментариев
async function handleYTButtons(buttons) {
  for (const button of buttons) {
    if (!button.classList.contains("sentiment")) {
      // Добавляем класс 'sentiment' к элементу
      button.classList.add("sentiment");
      await processYTWebSocket(button);
    }
  }
}
