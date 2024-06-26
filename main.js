require('dotenv').config();
const { promises: fs } = require('fs');
const path = require('path');
const { Client: DiscordClient, Collection, GatewayIntentBits } = require('discord.js');
const { connectToDatabase } = require('./db.js');
const strings = require('./util/strings.js');

class Client extends DiscordClient {
    constructor(options) {
        super(options);
        this.commands = new Collection();
    }
}

async function main() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions
        ]
    });

    client.once('ready', async () => {
        console.log(strings.main.logged(client.user.tag));   

        const foldersPath = path.join(__dirname, 'commands');
        const commandFolders = await fs.readdir(foldersPath);

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    command.execute = command.execute.bind(client);
                    client.commands.set(command.data.name, command);
                } else {
                    console.log(strings.main.warning(filePath));
                }
            }
        }

        const eventsPath = path.join(__dirname, 'events');
        const eventFiles = (await fs.readdir(eventsPath)).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute.apply(event, args));
            } else {
                client.on(event.name, (...args) => event.execute.apply(event, args));
            }
        }
    });

    client.login(process.env.TOKEN).catch(console.error);
    await connectToDatabase();
}

main().catch(console.error);