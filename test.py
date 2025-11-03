import requests
from IPython.display import Markdown, display

OLLAMA_API = "http://localhost:11434/api/chat"
HEADERS = {"Content-Type": "application/json"}
MODEL = "llama3.2"

# Create a messages list using the same format that we used for OpenAI dsdsdsdsds

messages = [
    {"role": "user", "content": "hello"}
]

payload = {
        "model": MODEL,
        "messages": messages,
        "stream": False
    }

response = requests.post(OLLAMA_API, json=payload, headers=HEADERS)
print(response.json()['message']['content'])