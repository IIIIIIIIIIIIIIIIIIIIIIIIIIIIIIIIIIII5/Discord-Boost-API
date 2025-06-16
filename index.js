const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember]
});

const PREFIX = "!";
const PORT = process.env.PORT || 3000;
const DATA_FILE = "./linkedUsers.json";

let linkedUsers = {};
if (fs.existsSync(DATA_FILE)) {
  linkedUsers = JSON.parse(fs.readFileSync(DATA_FILE));
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "link") {
    if (args.length === 0) {
      return message.reply("Please provide your Roblox UserID, e.g. `!link 12345678`");
    }

    const robloxUserId = args[0];
    if (!/^\d+$/.test(robloxUserId)) {
      return message.reply("Invalid Roblox UserID. It must be numbers only.");
    }

    const member = message.member;
    if (!member.premiumSince) {
      return message.reply("You need to be a server booster to link your Roblox account.");
    }

    const discordId = message.author.id;

    if (!linkedUsers[discordId]) {
      linkedUsers[discordId] = {
        robloxIds: [],
        isBooster: true
      };
    }

    if (!linkedUsers[discordId].robloxIds.includes(robloxUserId)) {
      linkedUsers[discordId].robloxIds.push(robloxUserId);
      linkedUsers[discordId].isBooster = true;
      fs.writeFileSync(DATA_FILE, JSON.stringify(linkedUsers, null, 2));
      return message.reply(`Linked your Discord to Roblox UserID: ${robloxUserId}. Booster perks granted.`);
    } else {
      return message.reply(`Roblox UserID: ${robloxUserId} is already linked.`);
    }
  }
});

app.get("/check-booster/:robloxUserId", (req, res) => {
  const robloxUserId = req.params.robloxUserId;
  let isBooster = false;

  for (const discordId in linkedUsers) {
    const userData = linkedUsers[discordId];
    if (
      userData.robloxIds &&
      userData.robloxIds.includes(robloxUserId) &&
      userData.isBooster
    ) {
      isBooster = true;
      break;
    }
  }

  res.json({ isBooster });
});

app.listen(PORT, () => {
  console.log(`API Server listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
