const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const CitizenRepository = require('./src/repositories/citizenRepository');

let mainWindow;
let registerWindow;
let listWindow;

// Configuração da porta serial (ajuste para Windows, se necessário)
const port = new SerialPort({ path: "/dev/ttyUSB0", baudRate: 9600 }, (err) => {
    if (err) {
        console.error("Erro ao abrir a porta serial:", err.message);
    } else {
        console.log("Porta serial aberta com sucesso!");
    }
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

// Função para criar a janela principal
app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: __dirname + "/preload.js",
            contextIsolation: true,
        },
    });

    mainWindow.loadFile("./src/views/index.html");
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    parser.on("data", (data) => {
        console.log("Recebido:", data.trim());
        if (mainWindow) {
            mainWindow.webContents.send("serial-data", data.trim());
        }
    });

    port.on("error", (err) => console.error("Erro na porta serial:", err.message));
});

const janelaListagem = () => {
    if (listWindow) return;

    listWindow = new BrowserWindow({
        width: 640,
        height: 480,
        autoHideMenuBar: true,
        resizable: false,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            preload: __dirname + "/preload.js",
            contextIsolation: true,
        },
    });

    listWindow.loadFile("./src/views/list/list.html");

    listWindow.on("closed", () => {
        listWindow = null;
    });
};

const janelaCadastro = () => {
    if (registerWindow) return;  

    registerWindow = new BrowserWindow({
        width: 640,
        height: 480,
        autoHideMenuBar: true,
        resizable: false,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            preload: __dirname + "/preload.js",
            contextIsolation: true,
        },
    });

    registerWindow.loadFile("./src/views/register/register.html");

    registerWindow.on("closed", () => {
        registerWindow = null; 
    });
};

// Evento para salvar cidadão e fechar janela
ipcMain.on("save-citizen", async (event, formData) => {
    try {
        console.log("Novo cidadão cadastrado:", formData);
        const savedCitizen = await CitizenRepository.save(formData);
        console.log("Cidadão salvo no banco:", savedCitizen);
        event.reply("citizen-saved", savedCitizen);

        if (registerWindow) {
            console.log("Fechando a janela de cadastro...");
            registerWindow.close();
            registerWindow = null; 
        }
    } catch (error) {
        console.error("Erro ao salvar cidadão:", error.message);
        event.reply("citizen-save-error", error.message);
    }
});

ipcMain.on("close-register-window", () => {
    if (registerWindow) {
        console.log("Fechando janela de cadastro...");
        registerWindow.close();
        registerWindow = null;
    }
});

ipcMain.on("list-citizens", async (event) => {
    try {
        const citizens = await CitizenRepository.listAll();
        console.log("Cidadãos recebidos:", citizens);

        if (listWindow) {
            // Aguarda a janela estar completamente carregada antes de enviar os dados
            listWindow.webContents.on("did-finish-load", () => {
                listWindow.webContents.send("citizens-list", citizens);
            });
        } else {
            console.error("Janela de listagem não encontrada.");
        }
    } catch (error) {
        console.error("Erro ao listar cidadãos:", error.message);
        event.reply("citizens-list-error", error.message);
    }
});

// Menu da aplicação
const menuTemplate = [
    {
        label: "Cadastrar",
        click: () => janelaCadastro(),
    },
    {
        label: "Listar",
        click: () => {
            janelaListagem();
            // Aqui, chamamos diretamente a função de listagem
            ipcMain.emit("list-citizens", { }); 
        }
    },
    {
        label: "Exibir",
        submenu: [
            { label: "Recarregar", role: "reload" },
            { label: "Ferramentas do desenvolvedor", role: "toggleDevTools" },
        ],
    },
];

app.on("window-all-closed", () => {
    app.quit();
});
