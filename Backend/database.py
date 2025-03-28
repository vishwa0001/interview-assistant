import os
import chromadb
from models import Message
import uuid
import time
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
import os

client_op = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

client = chromadb.HttpClient(host="localhost", port=8000)

embedding_function = embedding_functions.OpenAIEmbeddingFunction(
    api_key = os.environ.get('OPENAI_API_KEY'),
    model_name="text-embedding-ada-002"
)

session_collection = client.get_or_create_collection(
    name="chat_sessions"
)

collection = client.get_or_create_collection(
    name="mixed_content",
    embedding_function=embedding_function
)

async def create_session():
    session_id = str(uuid.uuid4())
    return session_id

async def store_message(session_id: str, message: Message, is_audio: bool = False, is_image: bool = False):
    timestamp = time.time()
    session_collection.add(
        documents=[message.content],
        metadatas=[{
            "role": message.role,
            "session_id": session_id,
            "timestamp": timestamp,
            "is_audio": is_audio,
        }],
        ids=[f"{session_id}_{uuid.uuid4()}"]
    )

async def get_messages(session_id: str):
    results = session_collection.get(
        where={"session_id": session_id}
    )
    messages = []
    for doc, meta in zip(results["documents"], results["metadatas"]):
        messages.append({
            "message": Message(role=meta["role"], content=doc),
            "timestamp": meta.get("timestamp", 0),
            "is_audio": meta.get("is_audio", False),
            "is_image": meta.get("is_image", False)
        })
    messages.sort(key=lambda x: x["timestamp"])
    return messages

def transcribe_audio(audio_file_path):
    """Transcribe audio using OpenAI Whisper."""
    try:
        with open(audio_file_path, 'rb') as audio_file:
            transcription = client_op.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        return transcription.text
    except Exception as e:
        raise Exception(f"Error in transcription: {str(e)}")
    finally:
        if os.path.exists(audio_file_path):
            os.remove(audio_file_path)