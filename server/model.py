from transformers import pipeline
import asyncio

# Загрузка модели
async def load_models():
    loop = asyncio.get_event_loop()
    sentiment_task = await loop.run_in_executor(None, lambda: pipeline(
        model="lxyuan/distilbert-base-multilingual-cased-sentiments-student", 
        return_all_scores=True
    ))

    return sentiment_task
