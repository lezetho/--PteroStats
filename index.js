const { Client, GatewayIntentBits, EmbedBuilder, time, ActivityType } = require("discord.js");
const config = require("./handlers/config.js");
const convertUnits = require("./handlers/convertUnits.js");
const getStats = require("./handlers/getStats.js");
const cachePath = require('node:path').join(__dirname, "./cache.json");
const fs = require("node:fs");
const cliColor = require("cli-color");

console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.greenBright("Starting bot..."));
console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("You are using development build! some features may not work."));

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

async function startGetStatus() {
    try {
        const results = await getStats();
        createMessage({
            panel: true,
            nodes: results.nodes,
            servers: results.servers,
            users: results.users,
        });
    } catch {
        console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("Panel is offline"));

        fs.readFile(cachePath, (err, data) => {
            if (err) {
                createMessage({ cache: false, panel: false });
                return console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("Last cache was not found!"));
            }

            try {
                const results = JSON.parse(data);
                createMessage({
                    cache: true,
                    panel: false,
                    nodes: results.nodes,
                    servers: results.servers,
                    users: results.users,
                });
            } catch {
                createMessage({ cache: false, panel: false });
                console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("Something went wrong with cache data..."));
            }
        });
    }
}

client.once("ready", () => {
    console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.greenBright(`${client.user.tag} is online!`));

    if (config.presence.enable) {
        if (config.presence.text && config.presence.type) {
            switch (config.presence.type.toLowerCase()) {
                case "playing":
                    config.presence.type = ActivityType.Playing;
                    break;
                case "listening":
                    config.presence.type = ActivityType.Listening;
                    break;
                case "competing":
                    config.presence.type = ActivityType.Competing;
                    break;
                default:
                    config.presence.type = ActivityType.Watching;
            }

            client.user.setActivity(config.presence.text, {
                type: config.presence.type,
            });
        }

        if (config.presence.status) {
            if (!["idle", "online", "dnd", "invisible"].includes(
                config.presence.status.toLowerCase()
            ))
                config.presence.status = "online";

            client.user.setStatus(config.presence.status);
        }
    }

    startGetStatus();
});

async function createMessage({ cache, panel, nodes, servers, users }) {
    let embed = new EmbedBuilder()
        .setTitle(config.embed.title_nodes)
        .setColor(config.embed.color);

    let embeds = [embed];

    if (config.nodes_settings.details) {
        nodes.forEach((node, index) => {
            if (index % 25 === 0 && index !== 0) {
                embed = new EmbedBuilder().setColor(config.embed.color);
                if (embeds.length < 9) embeds.push(embed);
            }

            embed.addFields({
                name: `${node.attributes.name} - ${node.status ? config.status.online : config.status.offline}`,
                value:
                    "```\n" +
                    `Memory: ${convertUnits(node.attributes.allocated_resources.memory, node.attributes.memory, config.nodes_settings.unit)}\n` +
                    `Disk  : ${convertUnits(node.attributes.allocated_resources.disk, node.attributes.disk, config.nodes_settings.unit)}\n` +
                    `CPU   : ${Math.floor(node.attributes.cpu / node.attributes.allocated_resources.cpu * 100) || 0}%` +
                    "```"
            });
        });
    } else {
        embeds[0].setDescription(nodes.map(node => `**${node.attributes.name}** - ${node.status ? config.status.online : config.status.offline}`).join("\n"));
    }

    let panelEmbed = new EmbedBuilder()
        .setColor(config.embed.color)
        .setTitle(config.embed.title_panel)
        .addFields({
            name: `Panel - ${panel ? config.status.online : config.status.offline}`,
            value:
                "```\n" +
                `Nodes  : ${nodes.length}\n` +
                (config.panel_settings.servers ? `Servers: ${servers || "Unknown"}\n` : "") +
                (config.panel_settings.users ? `Users  : ${users || "Unknown"}\n` : "") +
                "```"
        });

    if (config.panel_settings.status) embeds.unshift(panelEmbed);

    embeds[0]
        .setAuthor(config.embed.title ? { name: config.embed.author } : null)
        .setDescription(
            embeds[0].data.description ? config.embed.description.replace("{{time}}", time(new Date(Date.now() + (config.refresh * 1000) + 1000), "R")) + "\n\n" + embeds[0].data.description : config.embed.description.replace("{{time}}", time(new Date(Date.now() + (config.refresh * 1000) + 1000), "R"))
        );

    embeds[embeds.length - 1]
        .setFooter(config.embed.footer ? { text: config.embed.footer } : null);

    if (config.embed.timestamp) embeds[embeds.length - 1].setTimestamp();

    if (!cache && !panel) {
        embeds[embeds.length - 1].setDescription(
            embeds[embeds.length - 1].data.description ? embeds[embeds.length - 1].data.description + "\n\nThere are no nodes to display!" : "There are no nodes to display!"
        );
    }

    try {
        const channel = await client.channels.fetch(config.channel);
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(msg => msg.author.id === client.user.id);

        console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.greenBright("Panel stats have been posted to the channel!"));

        setTimeout(() => startGetStatus(), config.refresh * 1000);

        if (botMessage) {
            await botMessage.edit({ content: config.message.content || null, embeds });
        } else {
            await channel.send({ content: config.message.content || null, embeds });
        }
    } catch (error) {
        DiscordErrorHandler(error);
    }
}

function DiscordErrorHandler(error) {
    if (error.code === "ENOTFOUND") {
        console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("ENOTFOUND | DNS Error. Ensure your network connection and DNS server are functioning correctly."));
    } else if (error.rawError?.code === 50001) {
        console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("Discord Error | Your discord bot doesn't have access to see/send message/edit message in the channel!"));
    } else if (error.rawError?.errors && Object?.values(error.rawError.errors)[0]._errors[0].code === "MAX_EMBED_SIZE_EXCEEDED") {
        console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("Discord Error | Embed message limit exceeded! Please limit or decrease the nodes that need to be shown in the config!"));
    } else if (error.rawError?.errors && Object?.values(error.rawError.errors)[0]._errors[0].code) {
        console.log(Object.values(error.rawError.errors)[0]._errors[0].message);
    } else {
        console.error(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("Discord Error"), error);
    }
    process.exit();
}

try {
    client.login(config.token);
} catch {
    console.log(cliColor.cyanBright("[PteroStats] ") + cliColor.redBright("Discord Error | Invalid Discord Bot Token! Make sure you have the correct token in the config!"));
    process.exit();
}
