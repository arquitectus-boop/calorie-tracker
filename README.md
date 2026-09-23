# Contador de Calorias

PWA (Progressive Web App) para registo pessoal de calorias no iPhone.
Interface em português (Portugal), tema escuro com verde profundo inspirado no Google Keep, funcionamento offline-first.

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm 9+

## Instalação

```bash
cd calorie-tracker
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Abre o URL indicado no terminal (normalmente `http://localhost:5173`).
No iPhone, usa o IP da máquina na mesma rede Wi‑Fi, por exemplo `http://192.168.1.10:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

Os ficheiros ficam em `dist/`. Podes servir esta pasta com qualquer servidor HTTPS estático.

## Adicionar ao ecrã inicial (iPhone Safari)

Para instalar como app (modo standalone):

1. Abre a app no **Safari** (não no Chrome).
2. Toca no botão **Partilhar** (□↑).
3. Escolhe **Adicionar ao Ecrã Principal**.
4. Confirma o nome (**Calorias**) e toca em **Adicionar**.

A app abre sem barra do Safari, com ícone próprio e tema verde escuro.
**Cópias de segurança:** em **Definições → Cópia de segurança**, exporta o JSON e escolhe **Guardar em Ficheiros** (idealmente iCloud Drive). O Safari pode apagar dados locais ao limpar a cache; importa o ficheiro apenas quando quiseres substituir os dados atuais.
**Nota:** o Safari exige HTTPS (ou `localhost`) para service workers / instalação completa. Em rede local, usa um túnel (ex. `npx vite --host`) com HTTPS, ou faz deploy num hosting estático.

## Funcionalidades

- Adicionar registo: kcal, alimento, quantidade (predefinida 1), data (hoje por omissão)
- Vista do dia com total automático
- Histórico de dias anteriores com totais
- Editar e apagar registos
- Atalhos de alimentos recentes / frequentes
- Offline: dados em IndexedDB (com cópia em `localStorage`)
- Importar texto no estilo Google Keep (cabeçalhos de data + linhas de calorias)
- Cópia de segurança: exportar/importar registos, calorias gastas e definições em JSON

### Formato Keep suportado

```
21/09/26
79 iogurte
726 sandes frango ESSO
138 actimel (2x)

20/09/2026 1431 kcal
2x 126 pão pequeno branco
```

## Stack

- Vite + React + TypeScript
- `vite-plugin-pwa` (manifest + service worker)
- IndexedDB via `idb`
- `date-fns` (locale `pt`)

## Estrutura

```
src/
  components/   UI (dia, histórico, formulário, importação, navegação)
  hooks/        estado dos registos
  lib/          storage, datas, parser Keep
```
