## Ollama setup

I had trouble with the default port, hence changing it to 8888, but whatever works. Oddly enough, I still had to make the request to the default port. I'm using the mistral model.

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral
export OLLAMA_HOST=localhost:8888
```

## Run
```bash
ollama serve
node index.mjs
```

## For reference, requesting a response from terminal looks like this

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "mistral",
  "messages": [
    { "role": "user", "content": "why is the sky blue?" }
  ]
}'
```

## Useful parameters
stream: false

## Bot setup
+ [Go to Disrord Developer Portal](https://discord.com/developers/applications)
+ Generate a URL for the server admin on the OAUTH2 tab in developers panel, in our case we did not select any permissions
+ Admin should restrict access as needed
+ Get a list of users who should have access to the game (or credits, whatever)