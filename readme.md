# Ollama setup

export OLLAMA_HOST=localhost:8888
ollama serve

# Request a message from terminal looks like this

curl http://localhost:11434/api/chat -d '{
  "model": "mistral",
  "messages": [
    { "role": "user", "content": "why is the sky blue?" }
  ]
}'


# to run
ollama serve
node index.mjs 
