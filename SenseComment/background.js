// Сокет на порту 8765
let webSocket = new WebSocket("ws://localhost:8765");

webSocket.onopen = () => {
  console.log("WebSocket connection established");
};

webSocket.onclose = () => {
  console.log("WebSocket connection closed");
  webSocket = null;
};

webSocket.onerror = (error) => {
  console.error("WebSocket error: ", error);
};

function disconnect() {
  if (webSocket) {
    webSocket.close();
  }
}

// Обработка комментариев полученные от yt_content_script.js и vk_content_script.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) {
    sendResponse("The content is not supported");
  } else if (webSocket) {
    // Отправка сообщения на сервер
    webSocket.send(message);

    // Обработчик полученного сообщения от сервера
    // Отправка ответа к yt_content_script.js или vk_content_script
    webSocket.onmessage = (event) => {
      try {
        const dataList = JSON.parse(event.data.replace(/'/g, '"'));
        console.log(message, event.data, pickEmoji(dataList));
        sendResponse(pickEmoji(dataList));
      } catch (error) {
        console.log('Error: ', message, event.data, error);
        sendResponse(event.data);
      }
    };
  } else {
    sendResponse("WebSocket connection is not established");
  }
  return true;
});

// Функция для выбора эмодзи на основе ответа от сервера
function pickEmoji(response) {
  if (Array.isArray(response)) {
    let negativeScore = parseFloat(response[0][2]["score"]);
    let positiveScore = parseFloat(response[0][0]["score"]);

    if (negativeScore > 0.7) {
      return "😡";
    } else if (positiveScore > 0.7) {
      return "😀";
    } else {
      return "😐";
    }
  } else {
    return response;
  }
}

// Создание контекстного меню к выделенному тексту
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "highlight",
    title: "Оценить тональность текста",
    contexts: ["selection"],
  });
});

// Обработчик события клика по элементу контекстного меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "highlight" && info.selectionText) {
    console.log(info);

    // Выполнение скрипта, который получает элемент HTML выделенного текста, 
    // отправляет текст элемента на сервер, 
    // вставляет ответ сервера под элементом выделенного текста 
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: getElementContainingSelection, // Получение элемента
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const { elementHTML, elementText, selectionText } = results[0].result;
          console.log(elementHTML, elementText);

          // Отправка текста элемента на сервер
          if (webSocket) {
            webSocket.send(elementText);
            webSocket.onmessage = (event) => {
              try {
                const dataList = JSON.parse(event.data.replace(/'/g, '"'));
                const ans = pickEmoji(dataList);
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: addSmileyToElement, // вставляет ответ сервера под элементом выделенного текста
                  args: [elementHTML, ans],
                });
              } catch (error) {
                console.log('Error: ', elementText, event.data, error);
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: addSmileyToElement,
                  args: [elementHTML, "could not be determined"],
                });
              }
            };
          } else {
            console.log('Error: ', "WebSocket connection is not established");
          }
        }
      }
    );
  }
});

// Функция для получения элемента, содержащего выделенный текст
function getElementContainingSelection() {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const element = range.commonAncestorContainer.parentElement;
  return {
    elementHTML: element.innerHTML,
    elementText: element.innerText,
    selectionText: selection.toString(),
  };
}

// Функция для добавления ответа сервера под элемент выделенного текста
function addSmileyToElement(elementText, ans) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const element = range.commonAncestorContainer.parentElement;
  const newText = elementText + `<div>Тональность текста: ${ans}</div>`;
  element.innerHTML = newText;
}
