const mineflayer = require('mineflayer')
const fs = require('fs');
const cron = require("node-cron");
const config = JSON.parse(fs.readFileSync("config.json"));
const bot = mineflayer.createBot({
    host: config.host,
    port: 25565,
    username: config.username,
    //username: "Bony_Bot", // email and password are required only for
    password: config.password,
    version: false,
    auth: 'mojang'
})

bot.on('chat', function (username, message) {
    if (username === bot.username) return
    console.log(message)
})

// Log errors and kick reasons:
bot.on('kicked', (reason, loggedIn) => console.log(reason, loggedIn))
bot.on('error', err => console.log(err))

bot.once('spawn', () => {
    // mineflayerViewer(bot, { port: 3007, firstPerson: false })
    //bot.chat("こんにちは，Bony_Botです :) 製鉄所でバイトしてます．エラー吐いたらBony_Chopsに教えてくれるとうれしいな☆");
})

bot.on("playerJoined", (player) => {
    if (player.username === bot.username) return
    bot.whisper(player.displayName, `${player.displayName}さんこんにちは， Bony_Botです :) 製鉄所でバイトしてます．エラー吐いたらBony_Chopsに教えてくれるとうれしいな☆`)
})

let mcData
bot.once('inject_allowed', () => {
    mcData = require('minecraft-data')(bot.version)
})

bot.on('experience', () => {
    console.log(`I am level ${bot.experience.level}`)
})

bot.on('chat', (username, message) => {
    const command = message.split(' ');
    if (username === bot.username) return
    switch (true) {
        case /^list$/.test(message):
            sayItems()
            break
        case /^chest$/.test(message):
            bot.chat("Chest eventListener activated");
            watchChest(false, ['chest', 'ender_chest', 'trapped_chest'])
            break
        case /^sleep$/.test(message): {
            sleep();
            break;
        }

        case /^wake$/.test(message): {
            bot.wake();
        }
    }
})

cron.schedule("* * * * * *", () => {
    /* if (bot.time.timeOfDay > 12541 && bot.time.timeOfDay < 23458 && !bot.isSleeping) {
        //sleep();
    } */
})



const sleep = () => {
    const blocks = ["white_bed"];
    bedToSleep = bot.findBlock({
        matching: blocks.map(name => mcData.blocksByName[name].id),
        maxDistance: 6
    })
    bot.sleep(bedToSleep).then(() => {
        bot.chat("寝ます (ｽﾔｧ")
    }).catch(e => {
        bot.chat("無理でした: " + e.toString())
    })
}

function sayItems(items = bot.inventory.items()) {
    const output = items.map(itemToString).join(', ')
    if (output) {
        console.log(output)
    } else {
        console.log('empty')
    }
}

async function watchChest(minecart = false, blocks = []) {
    let chestToOpen

    chestToOpen = bot.findBlock({
        matching: blocks.map(name => mcData.blocksByName[name].id),
        maxDistance: 6
    })
    if (!chestToOpen) {
        console.log('no chest found')
        return
    }
    const chest = await bot.openContainer(chestToOpen)
    console.log(chest.containerItems())
    let wait = false;
    chest.on('updateSlot', async (slot, oldItem, newItem) => {
        const count = chest.containerItems().filter(item => item.type == 579).reduce((acc, item) => (acc + item.count), 0);
        console.log(`chest update: ${itemToString(oldItem)} -> ${itemToString(newItem)} (slot: ${slot})`)
        console.log(count)

        if (!(count >= 9) || wait) {
            //bot.chat("no more ingod then 9");
        } else {
            console.log("job");
            await chest.withdraw(mcData.itemsByName.iron_ingot.id, null, 9);
            await chest.close();
            job(chestToOpen);
        }
    })
    chest.on('close', () => {
        console.log('chest closed')
    })
}

const job = async (chestToOpen) => {
    wait = true;

    //bot.chat("took diamond");
    tableToOpen = bot.findBlock({
        matching: mcData.blocksByName.crafting_table.id,
        maxDistance: 6
    })
    if (!tableToOpen) {
        console.log('no craft table found')
        return
    }
    console.log(tableToOpen);
    const recipe = bot.recipesFor(mcData.itemsByName.iron_block.id, null, 1, tableToOpen)
    console.log(recipe);
    if (!recipe[0]) {
        bot.chat("error: cant make");
        console.log("error: cant make");
        return;
    }
    console.log("ok");
    await bot.craft(recipe[0], 1, tableToOpen)
    const chest2 = await bot.openContainer(chestToOpen)

    await chest2.deposit(mcData.itemsByName.iron_block.id, null, 1);
    console.log("job done");
    await chest2.close();
    watchChest(false, ["chest"]);
    return;
}

function itemToString(item) {
    if (item) {
        return `${item.name} x ${item.count}`
    } else {
        return '(nothing)'
    }
}