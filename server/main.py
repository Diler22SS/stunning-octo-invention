import asyncio
import websockets
import logging
from concurrent.futures import ThreadPoolExecutor
from model import load_models

# Настройка логирования для записи сообщений в файл 'server.log'
logging.basicConfig(filename='server.log', encoding='utf-8', level=logging.INFO)

# Функция для определения сентимента
async def define_sentiment(websocket, path, sentiment_task, executor):
    try:
        # Асинхронно обрабатываются сообщения, полученные через WebSocket
        async for message in websocket:
            try:
                # Анализ сообщения
                result = await asyncio.get_event_loop().run_in_executor(executor, sentiment_task, message)
                result.append('0')
                # Результат анализа формируется в виде строки и отправляется обратно клиенту
                response = f"{result}"
                await websocket.send(response)
                logging.info(f'Server Sent: {message} define_sentiment {response}')
            except Exception as e:
                logging.error(f'Error processing message: {e}')
                await websocket.send(f'Error: {str(e)}')
    except websockets.ConnectionClosed as e:
        logging.info(f'Connection closed: {e}')
    except Exception as e:
        logging.error(f'Unexpected error: {e}')

async def main():
    # Создание пула потоков для выполнения задач
    executor = ThreadPoolExecutor(max_workers=4)
    
    # Загрузка модели для анализа сентимента
    sentiment_task = await load_models()
    
    async def server(websocket, path):
        await define_sentiment(websocket, path, sentiment_task, executor)
    
    # Запуск WebSocket сервера на localhost:8765
    server = await websockets.serve(server, "localhost", 8765)
    logging.info("WebSocket server started on ws://localhost:8765")
    await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Server stopped by user")
    except Exception as e:
        logging.error(f'Unexpected server error: {e}')
