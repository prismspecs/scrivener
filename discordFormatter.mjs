export default class DiscordFormatter {
    constructor() {
        this.result = "";
    }

    addHeader(text) {
        this.result += `# ${text}\n\n`;
        return this;
    }

    addText(text) {
        this.result += `${text}\n\n`;
        return this;
    }

    addLineBreak() {
        this.result += "\n";
        return this;
    }

    string() {
        return this.result;
    }
}