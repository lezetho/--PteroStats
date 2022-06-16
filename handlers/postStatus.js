const { MessageEmbed, Formatters, MessageActionRow, MessageButton } = require('discord.js')
const chalk = require('chalk')

module.exports = async function postStatus(client, panel, nodes) {

    if (client.guilds.cache.size === 0) return console.log(chalk.cyan('[PteroStats]') + chalk.red(' This bot is not on any discord servers'))

    const channel = await client.channels.cache.get(client.config.channel)

    if (!channel) return console.log(chalk.cyan('[PteroStats]') + chalk.red(' Invalid Channel ID'))

    let messages = await channel.messages.fetch({ limit: 10 })
    messages = messages.filter(m => m.author.id === client.user.id).last();
    if (messages && messages.embeds.length === 0) {
        messages.delete()
        messages = null
    }

    const format = await Formatters.time(new Date(Date.now() + client.config.refresh * 1000), 'R')
    const embed = new MessageEmbed()

    let text = ''
    let desc = ''

    if (client.config.embed.title) embed.setTitle(client.config.embed.title)
    if (client.config.embed.description) desc = client.config.embed.description.replaceAll('{{time}}', format) + '\n'
    if (client.config.embed.color) embed.setColor(client.config.embed.color)
    if (client.config.embed.footer) embed.setFooter({ text: client.config.embed.footer })
    if (client.config.embed.thumbnail) embed.setThumbnail(client.config.embed.thumbnail)
    if (client.config.embed.image) embed.setImage(client.config.embed.image)

    panel.total_users = panel.total_users.toLocaleString()
    panel.total_servers = panel.total_servers.toLocaleString()

    const stats = new Promise((resolve, reject) => {
        if (nodes.length !== 0) {
            nodes.forEach((data, i) => {
                const title = data.name + ': ' + String(data.status).replace('true', client.config.status.online).replace('false', client.config.status.offline)
                let description = '```'
                switch (client.config.resource.unit) {
                    case 'gb':
                        description = description +
                            '\nMemory : ' + Math.floor(data.memory_min / 1000).toLocaleString() + ' GB / ' + Math.floor(data.memory_max / 1000).toLocaleString() + ' GB' +
                            '\nDisk : ' + Math.floor(data.disk_min / 1000).toLocaleString() + ' GB / ' + Math.floor(data.disk_max / 1000).toLocaleString() + ' GB'
                        break;
                    case 'percent':
                        description = description +
                            '\nMemory : ' + Math.floor(data.memory_min / data.memory_max * 100) + ' %' +
                            '\nDisk : ' + Math.floor(data.disk_min / data.disk_max * 100) + ' %'
                        break;
                    default:
                        description = description +
                            '\nMemory : ' + data.memory_min.toLocaleString() + ' MB / ' + data.memory_max.toLocaleString() + ' MB' +
                            '\nDisk : ' + data.disk_min.toLocaleString() + ' MB / ' + data.disk_max.toLocaleString() + ' MB'
                }

                if (client.config.resource.servers) description = description + '\nServers : ' + data.total_servers.toLocaleString()
                if (client.config.resource.location) description = description + '\nLocation : ' + data.location
                if (client.config.resource.allocations) description = description + '\nAllocations : ' + data.allocations.toLocaleString()

                description = description + '\n```'

                if (client.config.resource.enable) {
                    text = text + '\n**' + title.replace(':', ':**') + '\n' + description
                } else {
                    text = text + '\n**' + title.replace(':', ':**')
                }

                if (i + 1 === nodes.length) resolve()
            })
        } else if (nodes.length === 0) {
            if (!messages) {
                text = 'There is no nodes to display'
                resolve()
            } else {
                text = messages.embeds[0].description.replaceAll(client.config.status.online, client.config.status.offline)
                if (!panel.status && String(String(messages.embeds[0].fields[0].value).split('\n')[2]).split('')[String(String(messages.embeds[0].fields[0].value).split('\n')[2]).length - 1] !== '`') {
                    panel.total_users = String(String(messages.embeds[0].fields[0].value).split('\n')[2]).split('')[String(String(messages.embeds[0].fields[0].value).split('\n')[2]).length - 1]
                    panel.total_servers = String(String(messages.embeds[0].fields[0].value).split('\n')[3]).split('')[String(String(messages.embeds[0].fields[0].value).split('\n')[3]).length - 1]
                }
                resolve()
            }
        }
    })

    stats.then(async () => {

        embed.setDescription(desc + '\n**Nodes Stats [' + nodes.length + ']**' + text)

        if (client.config.panel_resource.enable) {
            let stats = '**Status:** ' + String(panel.status).replace('true', client.config.status.online).replace('false', client.config.status.offline) + '\n\n'

            if (client.config.panel_resource.users) stats = stats + 'Users: ' + String(panel.total_users).replace('-1', '`Unknown`') + '\n'
            if (client.config.panel_resource.servers) stats = stats + 'Servers: ' + String(panel.total_servers).replace('-1', '`Unknown`')

            embed.addField('Panel Stats', stats)
        }

        if (client.config.embed.field.enable) {
            embed.addField(client.config.embed.field.title, client.config.embed.field.description.replaceAll('{{time}}', format))
        }

        embed.setTimestamp()

        const row = []

        if (client.config.button.enable) {
            const button = new MessageActionRow
            if (client.config.button.btn1.label.length !== 0 && client.config.button.btn1.url.length !== 0) {
                button.addComponents(
                    new MessageButton()
                        .setLabel(client.config.button.btn1.label)
                        .setStyle('LINK')
                        .setURL(client.config.button.btn1.url)
                )
            }
            if (client.config.button.btn2.label.length !== 0 && client.config.button.btn2.url.length !== 0) {
                button.addComponents(
                    new MessageButton()
                        .setLabel(client.config.button.btn2.label)
                        .setStyle('LINK')
                        .setURL(client.config.button.btn2.url)
                )
            }
            if (client.config.button.btn3.label.length !== 0 && client.config.button.btn3.url.length !== 0) {
                button.addComponents(
                    new MessageButton()
                        .setLabel(client.config.button.btn3.label)
                        .setStyle('LINK')
                        .setURL(client.config.button.btn3.url)
                )
            }
            if (client.config.button.btn4.label.length !== 0 && client.config.button.btn4.url.length !== 0) {
                button.addComponents(
                    new MessageButton()
                        .setLabel(client.config.button.btn4.label)
                        .setStyle('LINK')
                        .setURL(client.config.button.btn4.url)
                )
            }
            if (client.config.button.btn5.label.length !== 0 && client.config.button.btn5.url.length !== 0) {
                button.addComponents(
                    new MessageButton()
                        .setLabel(client.config.button.btn5.label)
                        .setStyle('LINK')
                        .setURL(client.config.button.btn5.url)
                )
            }

            row.push(button)
        }

        if (!messages) channel.send({ embeds: [embed], components: row })
        else messages.edit({ embeds: [embed], components: row })
        console.log(chalk.cyan('[PteroStats]') + chalk.green(' Stats posted!'))
    })
}