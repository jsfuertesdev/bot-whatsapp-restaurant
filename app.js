const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')
require("dotenv").config();

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
// const MockAdapter = require('@bot-whatsapp/database/mock')
const MongoAdapter = require('@bot-whatsapp/database/mongo')
const { delay } = require('@whiskeysockets/baileys')
const path = require('path')
const fs = require('fs')
const chat = require("./chatGPT")
const { handlerAI } = require("./whisper")

const menuPath = path.join(__dirname, "mensajes", "menu.txt")
const menu = fs.readFileSync(menuPath,"utf8")

const pathConsultas = path.join(__dirname, "mensajes", "promptConsultas.txt")
const promptConsultas = fs.readFileSync(pathConsultas,"utf8")

const flowVoice = addKeyword(EVENTS.VOICE_NOTE).addAnswer("Esta es una nota de voz", null, async(ctx, ctxFn) =>{
    const text = await handlerAI(ctx)
    const prompt = promptConsultas
    const consulta = text
    await ctxFn.flowDynamic(text)
    const answer = await chat(prompt, consulta)
    await ctxFn.flowDynamic(answer.content)
})

const flowMenuRest = addKeyword(EVENTS.ACTION)
    .addAnswer('Este es el menu',{
        media: "https://www.crepesywaffles.com/themes/custom/tecsua/pdf/menu_dom_costa.pdf"
    })

const flowReservar = addKeyword(EVENTS.ACTION)
    .addAnswer('Este es el flow reservas: https://servicioalcliente.crepesywaffles.com/es/-ry66ResTq')

const flowConsultas = addKeyword(EVENTS.ACTION)
    .addAnswer('Este es el flow consultas')
    .addAnswer('Haz tu consulta', {capture:true}, async(ctx, ctxFn) => {
        const prompt = promptConsultas
        const consulta = ctx.body
        const answer = await chat(prompt, consulta)
        await ctxFn.flowDynamic(answer.content)
    })

const flowWelcome = addKeyword(EVENTS.WELCOME)
    .addAnswer('Este es el flujo Welcome', {
        delay: 100,
    },
        async(ctx,ctxFn) => {
            console.log(ctx.body)
            if (ctx.body.includes('casas')){
                await ctxFn.flowDynamic('Hola este es el flow dynamic')
            }
            else{
                await ctxFn.flowDynamic('Escribe "Menu"')
            }
        })

const menuFlow = addKeyword("Menu").addAnswer(
    menu,
    { capture: true},
    async (ctx, { gotoFlow, fallBack, flowDynamic}) => {
        if (!["1","2","3","0"].includes(ctx.body)) {
            return fallBack("Respuesta no válida, por favor selecciona una de las opciones.");
        }
        switch (ctx.body) {
            case "1":
                return gotoFlow(flowMenuRest);
            case "2":
                return gotoFlow(flowReservar);
            case "3":
                return gotoFlow(flowConsultas);
            case "0":
                return await flowDynamic("Saliendo...Puedes volver a acceder a este menú escribiendo");
        }
    }
);

const main = async () => {
    const adapterDB = new MongoAdapter({
        dbUri: process.env.MONGO_DB_URI,
        dbName: "BotWhastapp"
    })
    const adapterFlow = createFlow([flowWelcome, menuFlow, flowMenuRest, flowReservar, flowConsultas, flowVoice])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()
