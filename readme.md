## Ollama setup

I had trouble with the default port, hence changing it to 8888, but whatever works. Oddly enough, I still had to make the request to the default port. I'm using the mistral model.

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral
export OLLAMA_HOST=localhost:8888
```

## Node setup

Install node via npm
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install v18.17.0
npm install
```
Make sure to add the .env file which includes the bot key

## Run Local

```bash
export OLLAMA_HOST=localhost:8888
# ollama serve  # this turns out to not be necessary if ollama is self-starting on computer as a service
node index.mjs
```

(Note that you may need to run the export command for the ollama bug before serving)

## Run Remote

This is not necessary if ollama is running as a service:
```bash
ssh vision@192.168.0.136
cd weird-economies
export OLLAMA_HOST=localhost:8888
screen
ollama serve
```

in another tab
```bash
ssh vision@192.168.0.136
cd weird-economies
screen
node index.mjs
```

CTRL+A, CTRL+D (detaches terminal)
```screen -r``` to reattach

## For reference, requesting a response from terminal looks like this

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "mistral",
  "messages": [
    { "role": "user", "content": "why is the sky blue?" }
  ]
}'
```

## Useful parameters for ollama

+ stream: false (wait until entire text is returned instead of trickling it in a word at a time)

## Bot setup
+ [Go to Disrord Developer Portal](https://discord.com/developers/applications)
+ Generate a URL for the server admin on the OAUTH2 tab in developers panel, in our case we did not select any permissions
+ Admin should restrict access as needed
+ Get a list of users who should have access to the game (or credits, whatever)
+ Create a pinned message which explains the game and/or welcomes players