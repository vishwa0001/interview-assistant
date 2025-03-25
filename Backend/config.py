import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
import os 

client_op = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

client = chromadb.HttpClient(host="localhost", port=8000)

embedding_function = embedding_functions.OpenAIEmbeddingFunction(
    api_key=os.environ.get('OPENAI_API_KEY'),
    model_name="text-embedding-ada-002"
)

collection = client.get_or_create_collection(
    name="mixed_content",
    embedding_function=embedding_function
)
