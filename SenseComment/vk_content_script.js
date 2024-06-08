// Отслеживание изменений в DOM
const vkObserver = new MutationObserver(async (mutationsList) => {
  for (const mutation of mutationsList) {
    // Если изменение типа 'childList' и были добавлены новые узлы
    if (mutation.type === 'childList' && mutation.addedNodes.length) {
      // Поиск комментариев на странице без класса 'sentiment'
      const buttons = mutation.target.querySelectorAll("div:not(.sentiment).reply.reply_dived.clear");
      // Обработка найденных комментариев
      await handleVKButtons(buttons);
    }
  }
});

// Настройка и запуск наблюдения MutationObserver
const vkConfig = { childList: true, subtree: true }; //наблюдать за добавлением/удалением дочерних узлов во всем документе
vkObserver.observe(document.body, vkConfig);

async function processVKWebSocket(button) {
  // Получение текста комментария
  const textElement = button.getElementsByClassName("reply_text")[0];
  if (!textElement) return;

  const text = textElement.innerText;
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
async function handleVKButtons(buttons) {
  for (const button of buttons) {
    if (!button.classList.contains("sentiment")) {
      // Добавляем класс 'sentiment' к элементу
      button.classList.add("sentiment");
      await processVKWebSocket(button);
    }
  }
}
