Perfekt, tack för klargörandet! Jag sätter igång med att ta fram en fullständig guide för att bygga en MCP-server som använder DataForSEO API, anpassad för Windsurf och GitHub Copilot Agents i VSCode.

Jag kommer att inkludera:
- Hur man bygger en MCP-server steg för steg
- Jämförelse mellan Python och JavaScript (vad som är enklast och bäst)
- Rekommendation om hosting (lokalt vs VPS)
- Specifika krav från Windsurf och Copilot Agents
- Vanliga fel och hur man undviker dem

Jag meddelar dig så snart allt är klart!

# Guide: Bygga en MCP-server med DataForSEO API (för Windsurf & GitHub Copilot Agents)

*En Multi-Command Provider (MCP) server låter AI-verktyg som Windsurf och GitHub Copilot Agents anropa externa tjänster. I denna guide bygger vi en egen MCP-server som kopplar upp mot DataForSEO:s API för SEO-data. Guiden täcker steg-för-steg hur du implementerar servern, val av programmeringsspråk (Python vs JavaScript), rekommendationer kring hosting (lokalt vs VPS), krav från Windsurf/Copilot Agents samt vanliga fallgropar och lösningar.* ([Anthropic Publishes Model Context Protocol Specification for LLM App Integration - InfoQ](https://www.infoq.com/news/2024/12/anthropic-model-context-protocol/#:~:text=Anthropic%20recently%20released%20their%20Model,of%20reference%20implementations%20of%20MCP))

## Steg-för-steg: Bygga MCP-servern med DataForSEO

1. **Förbered API-åtkomst och miljö:** Skaffa **DataForSEO**-inloggningsuppgifter (API-login och lösenord) från ditt konto. Spara dem som miljövariabler (t.ex. `DATAFORSEO_LOGIN` och `DATAFORSEO_PASSWORD`) för att undvika att hårdkoda känsliga uppgifter. Se till att din utvecklingsmiljö har nödvändiga verktyg:
   - **Python:** Installera Python 3 och lägg till det officiella MCP Python SDK:t med `pip install "mcp[cli]"` ([GitHub - modelcontextprotocol/python-sdk: The official Python SDK for Model Context Protocol servers and clients](https://github.com/modelcontextprotocol/python-sdk#:~:text=Then%20add%20MCP%20to%20your,project%20dependencies)). Detta SDK förenklar implementeringen av MCP-servern avsevärt, med färdiga transportlager (STDIO, SSE) och dekoratorer för att definiera verktyg ([GitHub - modelcontextprotocol/python-sdk: The official Python SDK for Model Context Protocol servers and clients](https://github.com/modelcontextprotocol/python-sdk#:~:text=,return%20a%20%2B%20b)).
   - **JavaScript/TypeScript:** Installera Node.js (v18+). Skapa ett nytt Node-projekt (`npm init -y`) och installera nödvändiga paket. Du kan använda en community-implementation för DataForSEO (t.ex. `npm install @skobyn/mcp-dataforseo`) ([GitHub - Skobyn/mcp-dataforseo: Model Context Protocol server for DataForSEO API](https://github.com/skobyn/mcp-dataforseo#:~:text=You%20can%20run%20directly%20with,npx)), eller skriva egen kod med Node:s standardbibliotek eller ett ramverk.

2. **Skapa MCP-serverns struktur:** En MCP-server exponerar *verktyg* (“tools”) – funktioner som AI-agenten kan kalla – via JSON med MCP-protokollet ([GitHub - modelcontextprotocol/python-sdk: The official Python SDK for Model Context Protocol servers and clients](https://github.com/modelcontextprotocol/python-sdk#:~:text=The%20Model%20Context%20Protocol%20,MCP%20servers%20can)). I koden behöver du:
   - **Initiera servern:** ge servern ett namn och starta transporten. (Med Python SDK kan du använda `FastMCP("DataForSEO")` för att skapa serverobjektet ([GitHub - modelcontextprotocol/python-sdk: The official Python SDK for Model Context Protocol servers and clients](https://github.com/modelcontextprotocol/python-sdk#:~:text=,Demo)). I Node/JS kan du starta en process som läser STDIN och skriver STDOUT, eller köra en SSE-webbserver.)
   - **Definiera verktygen:** För varje typ av API-anrop du vill exponera, definiera en funktion. I Python görs detta enkelt med dekoratorn `@mcp.tool()` ([GitHub - modelcontextprotocol/python-sdk: The official Python SDK for Model Context Protocol servers and clients](https://github.com/modelcontextprotocol/python-sdk#:~:text=,return%20a%20%2B%20b)), medan du i Node kan definiera en hanterare baserat på ett fält i inkommande JSON (`"type": "...")` ([GitHub - Skobyn/mcp-dataforseo: Model Context Protocol server for DataForSEO API](https://github.com/skobyn/mcp-dataforseo#:~:text=echo%20%27%7B,config%20%27%7B%22username%22%3A%22your_username%22%2C%22password%22%3A%22your_password)) ([GitHub - Skobyn/mcp-dataforseo: Model Context Protocol server for DataForSEO API](https://github.com/skobyn/mcp-dataforseo#:~:text=SERP%20API)). Till exempel kan vi skapa ett verktyg för att hämta sökvolym på nyckelord:
     ```python
     import os, requests
     from mcp.server.fastmcp import FastMCP

     mcp = FastMCP("DataForSEO")
     @mcp.tool()
     def get_search_volume(keywords: list[str], location_code: int = 2840, language_code: str = "en") -> dict:
         """Hämtar Google Ads-sökvolym för en lista av nyckelord."""
         username = os.environ["DATAFORSEO_LOGIN"]; password = os.environ["DATAFORSEO_PASSWORD"]
         payload = {
             "keywords": keywords,
             "location_code": location_code,
             "language_code": language_code,
             "device": "desktop"
         }
         resp = requests.post(
             "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
             auth=(username, password), json=payload
         )
         return resp.json()
     ```
     I exemplet ovan anropas DataForSEO:s **Keyword Data API** för sökvolym genom en HTTPS-POST (med Basic Auth innehållande login och lösenord i headern ([A Kickstart Guide to Using DataForSEO APIs – DataForSEO](https://dataforseo.com/blog/a-kickstart-guide-to-using-dataforseo-apis#:~:text=2%20Regardless%20of%20the%20programming,request%20in%20the%20following%20format))). Funktionen returnerar API:ets JSON-svar direkt. På liknande sätt kan du lägga till verktyg för SERP-data, backlink-analys m.m. Genom att dokumentera funktionen (docstring) beskriver du verktygets syfte – denna beskrivning kan visas i AI-agentens verktygslista.

3. **Starta och testa servern lokalt:** Kör din MCP-server lokalt för att säkerställa att den fungerar innan integrering i IDE:
   - **Python:** Starta servern via SDK: `mcp dev server.py` (om du använder `FastMCP`) vilket kör servern i utvecklingsläge. Alternativt kan du köra ditt Python-script direkt – SDK:n lyssnar då på STDIN/SSE beroende på konfiguration.
   - **Node:** Om du använder en paketerad server (t.ex. skobyns paket) kan du köra `npx @skobyn/mcp-dataforseo --config '{"username":"...","password":"..."}'` för att testa ett enkelt anrop ([GitHub - Skobyn/mcp-dataforseo: Model Context Protocol server for DataForSEO API](https://github.com/skobyn/mcp-dataforseo#:~:text=You%20can%20run%20directly%20with,npx)) ([GitHub - Skobyn/mcp-dataforseo: Model Context Protocol server for DataForSEO API](https://github.com/skobyn/mcp-dataforseo#:~:text=Send%20JSON%20requests%20to%20stdin,receive%20JSON%20responses%20from%20stdout)). Om du skrivit egen Node-kod, starta den (`node server.js`) och skicka in ett JSON-kommando via terminalen för att verifiera responsen:
     ```bash
     echo '{"type": "dataforseo_keywords_data", "keywords": ["example"], "location_code": 2840, "language_code": "en"}' | node server.js 
     ```
     Du bör få ett JSON-svar på stdout med data (eller felmeddelande) från DataForSEO. Kontrollera att API-nycklarna fungerar (API-svaret kan innehålla `status_message` och `status_code` som bekräftar om anropet lyckades ([A Kickstart Guide to Using DataForSEO APIs – DataForSEO](https://dataforseo.com/blog/a-kickstart-guide-to-using-dataforseo-apis#:~:text=Alongside%20general%20HTTP%20status%20codes%2C,g))).

4. **Konfigurera MCP-servern i Windsurf och/eller VS Code:** När servern är testad lägger du till den i din AI-utvecklingsmiljö:
   - **Windsurf (Cascade):** Gå till *Settings > Cascade (MCP)* i Windsurf och välj “Add custom server +”. Ange kommando och argument för att starta servern. Windsurf stödjer både STDIO (lokal process) och SSE (HTTP) transporter ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=Windsurf%20supports%20two%20transport%20types,sse)). För en lokal Node-server anger du t.ex:
     ```json
     {
       "mcpServers": {
         "seo-tools": {
           "command": "npx",
           "args": ["@skobyn/mcp-dataforseo"],
           "env": {
             "DATAFORSEO_LOGIN": "<DIN_LOGIN>",
             "DATAFORSEO_PASSWORD": "<DITT_L\u00D6SENORD>"
           }
         }
       }
     }
     ``` 
     I ovan config startar Windsurf din server via `npx` och injectar miljövariablerna med API-uppgifter ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=%7B%20%22mcpServers%22%3A%20%7B%20%22google,maps%22%20%5D%2C%20%22env%22%3A)). Efter att du sparat konfigurationen, klicka på **Refresh**-knappen i MCP-inställningarna för att ladda in verktygen ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=Make%20sure%20to%20press%20the,add%20a%20new%20MCP%20server)). Serverns tillgängliga verktyg bör nu visas under “Available Tools” i Windsurf; om de inte syns, kontrollera sökvägar och försök igen ([GitHub - yeakub108/mcp-server: MCP Server for Windsurf](https://github.com/yeakub108/mcp-server#:~:text=,js%20file)).
   - **VS Code (GitHub Copilot Agents):** Skapa filen `.vscode/mcp.json` i ditt projekt (eller lägg till i VS Code settings) med MCP-konfiguration. Exempel:
     ```json
     {
       "servers": {
         "seo-tools": {
           "command": "uvx",
           "args": ["mcp-dataforseo"]
         }
       },
       "inputs": [
         { "type": "promptString" }
       ]
     }
     ```
     Här använder `uvx` (en verktygskörningsmotor i MCP-ekosystemet) för att starta servern. `"inputs": [{ "type": "promptString" }]` kan användas om servern behöver interaktiv inmatning (t.ex. om du vill att VS Code ska fråga efter lösenord vid start) ([Extending Copilot Chat with the Model Context Protocol (MCP) - GitHub Docs](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp#:~:text=%7B%20,)) ([Extending Copilot Chat with the Model Context Protocol (MCP) - GitHub Docs](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp#:~:text=,fetch%22%5D%20%7D%20%7D)). Spara filen och klicka på **Start**-knappen som visas ovanför serverlistan i VS Code för att initiera servern ([Extending Copilot Chat with the Model Context Protocol (MCP) - GitHub Docs](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp#:~:text=3.%20A%20,then%20stored%20for%20later%20sessions)). Öppna Copilot Chat-panelen, växla till **Agent**-läge, och klicka på verktygsikonen för att se att din server och dess verktyg har laddats ([Extending Copilot Chat with the Model Context Protocol (MCP) - GitHub Docs](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp#:~:text=Image%3A%20Screenshot%20of%20the%20Copilot,is%20outlined%20in%20dark%20orange)).

5. **Använd MCP-verktygen via AI-agenten:** Nu kan du använda DataForSEO-verktygen i dina kodassistentsessioner. Be agenten att utföra SEO-relaterade kommandon, t.ex.: *“Hämta sökvolymen för \`Node.js tutorial\`”* eller *“Analysera backlink-profiler för example.com”*. AI-agenten kommer att identifiera att detta kräver DataForSEO-verktyg och be om tillåtelse att köra dem. **Observera:** Du måste vanligtvis godkänna verktygsanropet första gången det sker, för säkerhets skull ([GitHub - yeakub108/mcp-server: MCP Server for Windsurf](https://github.com/yeakub108/mcp-server#:~:text=%2A%20,Read%20multiple%20files)). Efter godkännande kör agenten verktyget, MCP-servern anropar DataForSEO API i bakgrunden, och resultatet returneras i chatten. Exempel på svar kan vara en sammanfattning av sökvolymer eller topplistan av organiska sökresultat, beroende på vilket verktyg som använts.

## Jämförelse: Python vs JavaScript för MCP-utveckling

Både **Python** och **JavaScript/TypeScript** är populära val för att bygga en MCP-server, men de erbjuder olika fördelar:

- **Python:** Rekommenderas för snabb prototypning och enkelhet. Anthropic erbjuder ett officiellt Python SDK för MCP ([Anthropic Publishes Model Context Protocol Specification for LLM App Integration - InfoQ](https://www.infoq.com/news/2024/12/anthropic-model-context-protocol/#:~:text=The%20MCP%20is%20intended%20to,According%20to%20Anthropic)) som hanterar mycket av infrastrukturen (transport, JSON-RPC-protokoll etc.) åt dig. Med dekorator-baserade funktioner (`@mcp.tool`, `@mcp.resource`) kan du definiera MCP-verktyg med minimal kod ([GitHub - modelcontextprotocol/python-sdk: The official Python SDK for Model Context Protocol servers and clients](https://github.com/modelcontextprotocol/python-sdk#:~:text=,return%20a%20%2B%20b)). Python har också kraftfulla HTTP-bibliotek (`requests`, `httpx`) vilket underlättar integrering mot DataForSEO. Om du föredrar Python kan du dra nytta av tydlig syntax och ett stort ekosystem av databehandling- och JSON-hanteringsbibliotek. Nackdelen kan vara prestanda – Python är inte lika snabb som Node.js när det gäller parallell hantering av många simultana förfrågningar, men för de flesta MCP-ändamål (som oftast är I/O-bundna API-anrop) är detta sällan ett problem.

- **JavaScript/TypeScript:** Passar bra om du redan arbetar mycket i Node.js-miljö eller vill ha stark typkontroll med TypeScript. MCP-specifikationen är ursprungligen definierad i TypeScript, och det finns en officiell referensimplementation i TS ([Anthropic Publishes Model Context Protocol Specification for LLM App Integration - InfoQ](https://www.infoq.com/news/2024/12/anthropic-model-context-protocol/#:~:text=The%20MCP%20is%20intended%20to,According%20to%20Anthropic)). Communityn har tagit fram flera färdiga MCP-servrar i Node – t.ex. en komplett DataForSEO MCP-server skriven i TypeScript finns öppen källkod ([DataForSEO MCP server for AI agents](https://playbooks.com/mcp/skobyn-dataforseo-seo#:~:text=Language)). Att använda Node innebär att du kan publicera din MCP-server som ett NPM-paket och enkelt dela den. Node är också väl lämpat för SSE (Server-Sent Events) om du planerar att köra servern på en extern server. Å andra sidan kan den initiala implementeringen kräva lite mer grundarbete än i Python (om du inte använder en färdig mall), eftersom du behöver sätta upp STDIN/SSE-hantering själv eller med hjälp av ett ramverk. För HTTP-anrop till DataForSEO finns utmärkta bibliotek som `axios` eller inbyggda `fetch`/`https` moduler att använda. 

**Vad är enklast och bäst?** Det beror på din bakgrund och mål. Python med MCP SDK är sannolikt **enklast att komma igång med** – “lödkolvsfritt” då mycket är abstraherat, vilket *Kenny Vaneetvelde* (skaparen av Atomic Agents) påpekar: att skapa en MCP-server är **löjligt enkelt** med Python SDK:t. JavaScript/TypeScript är däremot **bäst lämpat** om du vill integrera i en Node-baserad stack eller bidra till det växande TS-baserade MCP-ekosystemet. Båda språken kan uppnå samma funktionalitet – i praktiken kan valet kokas ned till vilket ekosystem du är mest bekväm med och om du värdesätter Pythons enkelhet framför TypeScripts struktur. Många utvecklare väljer Python för prototyper och byter till en TypeScript-implementation för produktion när kraven på struktur och paketering ökar. 

*(Notera: Det finns även MCP-implementationer i andra språk, t.ex. C#/.NET, men Python och Node är de mest stödda/plattformsoberoende vid skrivande stund.)*

## Rekommendation: Köra servern lokalt eller på en VPS?

En MCP-server kan antingen köras **lokalt på din dator** (t.ex. startas av editorn) eller **på en extern server (VPS/cloud)** som du ansluter till via nätverk (SSE). Båda alternativen har för- och nackdelar:

- **Lokal drift (på utvecklingsdatorn):** Detta innebär att MCP-servern startas som en subprocess av editorn (STDIO-transport). Fördelar inkluderar låg **latens** (ingen nätverksfördröjning – allt sker internt) och enkel **åtkomst till lokala resurser** (om verktygen behöver läsa filer eller interagera med lokala program). Dessutom slipper du exponera servern över internet, vilket minskar attackytan. Lokal drift passar bra under utveckling och för personligt bruk. Nackdelar är att servern bara är igång när din editor/dator är igång, samt potentiella **säkerhetsrisker** – att köra okända MCP-servrar lokalt kan vara farligt om de kör illasinnad kod ([Which MCP Server Transport is Better? Comparing STDIO and SSE : r/modelcontextprotocol](https://www.reddit.com/r/modelcontextprotocol/comments/1k0doby/which_mcp_server_transport_is_better_comparing/#:~:text=especially%20given%20current%20MCP%20Host,risks%20that%20can%27t%20be%20ignored)). Eftersom du i detta fall litar på din egen kod är det mindre orosmoment, men kom ihåg att MCP-verktyg har tillgång till din miljö med samma rättigheter som du har. Om du utvecklar i t.ex. VS Code, så är lokal STDIO oftast standardvalet (via `uvx` eller direkt kommandokörning i konfigurationen).

- **VPS/Extern drift (cloud/server):** Här körs MCP-servern som en fristående tjänst på t.ex. en molnserver. Editorn kopplar upp via **HTTP SSE**-transport (genom att ange serverns URL, t.ex. `https://din-server.com/sse` ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=Windsurf%20supports%20two%20transport%20types,sse))). Fördelar: Servern kan **vara igång dygnet runt**, oberoende av din egen dator – bra för team som vill dela på en MCP-tjänst eller om du vill utnyttja en servers prestanda. Det är också mer **skalbart och säkert** på sikt; SSE över HTTPS innebär att kommunikationen är krypterad och kan enklare begränsas/brandväggas. Faktum är att SSE (HTTP streaming) generellt rekommenderas som framtidens väg för MCP p.g.a. bättre säkerhet och skalbarhet ([Which MCP Server Transport is Better? Comparing STDIO and SSE : r/modelcontextprotocol](https://www.reddit.com/r/modelcontextprotocol/comments/1k0doby/which_mcp_server_transport_is_better_comparing/#:~:text=SSE%20offers%20a%20more%20secure,the%20preferred%20option%20moving%20forward)). Nackdelar: **Latency** ökar något (data ska över nätverket), så snabba verktygsanrop kan bli några hundra millisekunder långsammare. Du måste hantera **hostingkostnad och underhåll** av servern (uppdateringar, uptime, loggning). Dessutom krävs att du säkrar servern – minst via API-nyckel eller annan autentisering om den är publikt nåbar, så att inte vem som helst kan ansluta. Lyckligtvis stöder MCP-protokollet inbyggt att klienten först skickar någon form av autentisering eller att du kan implementera en simpel token-check i din SSE endpoint. I praktiken kan du också hålla SSE-servern privat inom ett VPN eller med IP-begränsning om den bara ska användas av dig själv. 

**Rekommendation:** För börja– använd *lokal drift* under utveckling eftersom det är enklare att debugga. När allt fungerar, överväg om du behöver ständig åtkomst eller delning – då kan du migrera till en VPS med SSE. Om du kör tung datahämtning via DataForSEO (som kan generera stora svar) kan en server med bättre bandbredd och prestanda ge fördelar. Tänk också på att DataForSEO API-anrop drar krediter oavsett var servern körs; en fördel med en central server kan vara att implementera caching av vanliga frågor för att spara på API-kvotan. Sammanfattningsvis: **lokalt** är bäst för enkelhet och lägsta latency för en enskild utvecklare, medan **VPS** är bäst för robusthet, delning och säker produktion **(SSE rekommenderas då)** ([Which MCP Server Transport is Better? Comparing STDIO and SSE : r/modelcontextprotocol](https://www.reddit.com/r/modelcontextprotocol/comments/1k0doby/which_mcp_server_transport_is_better_comparing/#:~:text=SSE%20offers%20a%20more%20secure,the%20preferred%20option%20moving%20forward)).

## Krav från Windsurf & Copilot Agents på MCP-servrar

Både Windsurf (Codeium Cascade) och GitHub Copilot Agents (VS Code) följer MCP-standarden, men det finns praktiska krav att känna till för att din server ska fungera smidigt:

- **Transport och endpoints:** Som nämnt stöds två transportlägen – STDIO och SSE. En **STDIO-server** startas av klienten (editorn) via ett kommando. Här förväntas servern kommunicera via standard in/ut (stdin/stdout) med JSON-meddelanden. En **SSE-server** ska exponera en HTTP-endpoint på `/sse` för att klienten ska kunna ansluta ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=Windsurf%20supports%20two%20transport%20types,sse)). I SSE-läget håller klienten en långlivad HTTP-anslutning (event stream) där servern skickar data. Se till att SSE-endpointen svarar med korrekt content-type (`text/event-stream`) och hanterar eventuella sessioner enligt MCP-specifikationen. De flesta ramverk (t.ex. Starlette/FastAPI för Python eller Express + `eventsource`-middleware för Node) har stöd för SSE. *Tips:* Kontrollera att din Windsurf/VSCode-konfiguration matchar servertypen – om du anger en URL kommer klienten försöka SSE, om du anger ett kommando körs STDIO. Mismatch här är en vanlig orsak att inget händer. Windsurf kräver t.ex. att SSE-URL:en **explicit innehåller `/sse`** i config ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=Windsurf%20supports%20two%20transport%20types,sse)).

- **Autentisering och inputs:** MCP-protokollet i sig hanterar inte autentisering mot servern (utöver att klient och server utbyter capabilities), men miljöer som VS Code erbjuder *“inputs”* i konfigurationen för att t.ex. fråga användaren om API-nycklar ([Extending Copilot Chat with the Model Context Protocol (MCP) - GitHub Docs](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp#:~:text=,servers%20you%20want%20to%20use)). Windsurf låter dig ange miljövariabler i JSON-filen ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=%7B%20%22mcpServers%22%3A%20%7B%20%22google,maps%22%20%5D%2C%20%22env%22%3A)). Om din MCP-server kräver en API-nyckel eller inloggning (som DataForSEO gör) måste detta förmedlas vid uppstart. **Lösning:** använd miljövariabler i config (säkert och enkelt), eller låt servern läsa från en konfigfil som användaren själv redigerar. Undvik att hårdkoda hemligheter i koden. I exempelkonfigurationen för Windsurf ovan injectades `DATAFORSEO_LOGIN/PASSWORD` via `env`-fältet ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=%7B%20%22mcpServers%22%3A%20%7B%20%22google,maps%22%20%5D%2C%20%22env%22%3A)). I VS Code-exemplet användes `promptString` – vilket innebär att när du klickar **Start** på servern kommer en prompt där du kan klistra in lösenord (detta är praktiskt om du vill undvika att spara det lokalt). **Sammanfattning:** Se till att servern har tillgång till nödvändiga credentials vid runtime, annars kommer verktygsanropen förstås att misslyckas (t.ex. 401 Unauthorized från DataForSEO API).

- **Verktygsgränssnitt (specifikation):** Din MCP-server måste deklarera sina verktyg på ett sätt som klienten förstår. Lyckligtvis hanterar SDK:er och referensimplementationer detta automatiskt genom att skicka en **offer/manifest**-meddelande vid anslutning, som listar verktygsnamn, parametrar och beskrivningar. Om du implementerar manuellt, följ MCP-specen för `listOfferings` eller motsvarande – klienten kommer be om verktygslistan i början. Codeium Cascade har noterat att de **endast stödjer “tools”**-primitiven, inte MCP-resurser eller prompts ännu ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=MCP%20tool%20calls%20will%20consume,regardless%20of%20success%20or%20failure)). Så fokusera på verktyg (funktioner som exekverar och returnerar resultat). Ge verktygen unika namn och beskrivningar. Undvik att definiera grafik-/bild-utdata, eftersom vissa klienter (Cascade) inte stödjer bildreturer alls ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=,support%20tools%20that%20output%20images)). I praktiken, om du höll dig till text/JSON-data från DataForSEO är du inom ramarna.

- **Latency/prestanda-krav:** Användaren förväntar sig svar inom rimlig tid när agenten kör ett verktyg. Copilot Agents har en inbyggd timeout (ej offentligt dokumenterad exakt, men räkna med ~30 sekunder som en rimlig övre gräns). Windsurf/Cascade noterar att **verktygsanrop drar token-krediter oavsett om anropet lyckas eller ej** ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=,To%20reiterate)), vilket indirekt antyder att onödigt långa eller felaktiga körningar är slöseri. **Best Practice:** Håll dina verktygsfunktioner så snabba och effektiva som möjligt. DataForSEO:s *live*-endpoints brukar ge svar inom ett par sekunder; om någon begäran tar väldigt lång tid (t.ex. tunga batch-jobb via task-post), överväg att returnera ett meddelande om att det kommer ta tid eller gör den asynkron (dock stöds inte långa bakgrundsjobb väl av nuvarande MCP-klienter utan specialhantering). Testa typiska användningsfall och mät svarstider. Om latensen är hög, kan användaren bli otålig eller tro att inget händer. I SSE-läge kan du skicka *progress events* (MCP har stöd för partial responses) men enklast är att optimera för snabba svar.

- **Stabilitet och felhantering:** Se till att din server hanterar fel graciöst. Om DataForSEO API t.ex. returnerar ett fel (felaktig parameter, ingen data, osv.), fånga detta och skicka ett begripligt felmeddelande tillbaka till agenten. Agenten kommer oftast bara presentera att verktyget misslyckades, men tydliga fel i JSON (t.ex. `"error": "Invalid keyword"` etc.) kan i vissa fall hjälpa agenten att förmedla vad som gick snett. Undvik att servern kraschar vid undantag – en krasch bryter MCP-anslutningen. Testa också kantfall (ingen internetanslutning, fel login) för att se att servern inte hänger sig. 

- **Säkerhet:** För SSE-servrar, använd HTTPS och någon form av auth (även om det är så enkelt som en hemlig token i en header som klienten kan sätta). För STDIO-servrar, var medveten om att de kör med dina lokala rättigheter. MCP-protokollet självt försöker isolera verktygskörningar till definierade kommandon, men det är du som implementerare som ansvarar för att inte exponera farlig funktionalitet. Håll dig därför till att enbart anropa DataForSEO och bearbeta dess svar. Kör inga godtyckliga skalkommandon i verktygen om det inte är absolut nödvändigt, och om du gör det, dokumentera noga och överväg säkerhetsimplikationerna.

## API-anrop: Känslighet för encoding och format

DataForSEO:s API är känsligt för både teckenkodning och format på de data du skickar. Här är några viktiga punkter att tänka på för att undvika vanliga problem:

### ✅ Rätt teckenkodning: Använd alltid UTF-8

All data som skickas till DataForSEO:s API måste vara i **UTF-8**-format. Detta gäller särskilt för fält som `keyword` och `keywords`. Om du använder andra teckenkodningar (som ISO-8859-1 eller Windows-1252) kan det leda till att vissa tecken tolkas felaktigt eller att förfrågningar misslyckas.

### ⚠️ Undvik otillåtna tecken i nyckelord

Vissa tecken är inte tillåtna i `keyword`-fältet och kan orsaka fel:
- **Emojis och vissa Unicode-symboler** kan leda till fel vid inlämning.
- **Specialtecken** som `<`, `>`, `|`, `\\`, `"`, `-`, `+`, `=`, `~`, `!`, `:`, `*`, `(`, `)`, `[`, `]`, `{`, `}` är inte tillåtna i vissa endpoints.
- **Kommatecken** i nyckelord tas bort och ignoreras av API:et.

Validera dina nyckelord innan du skickar dem till API:et.

### 🧱 JSON-format: Strikt struktur krävs

Alla POST-förfrågningar måste ha korrekt JSON-struktur:
- **Felaktiga datatyper** (t.ex. skicka sträng istället för lista).
- **Saknade obligatoriska fält** som `location_code` eller `language_code`.
- **Felaktig JSON-syntax** (saknade kommatecken eller felaktiga citattecken).

Använd verktyg som Postman eller JSON-validatorer.

### 🧪 Tips för felsökning

- **Testa med Postman**.
- **Granska API-responsen** (`status_code` och `status_message`).
- **Validera nyckelord och kontrollera UTF-8-kodning**.

Genom att följa dessa riktlinjer minskar du risken för vanliga fel.

## Vanliga problem och lösningar

Trots noggranna förberedelser kan det uppstå vanliga problem när man integrerar MCP-servern med Windsurf eller Copilot Agents. Här är en lista på vanliga fel och hur man åtgärdar dem:

- **MCP-servern syns inte eller startar inte:** Om dina verktyg inte dyker upp under *Available Tools* i IDE:n, eller om inget händer när du försöker använda dem, är första steget att kontrollera konfigurationen. En vanlig miss är fel filväg eller kommando. I Windsurf, se till att sökvägen till ditt server-skript är korrekt – man kan behöva ange absolut sökväg till filen ([GitHub - yeakub108/mcp-server: MCP Server for Windsurf](https://github.com/yeakub108/mcp-server#:~:text=)). I VS Code, kontrollera att `.vscode/mcp.json` är giltig JSON (inga kommatecken fel). **Lösning:** Korrigera config och tryck alltid på **Refresh/Uppdatera** efter att du ändrat eller lagt till en server ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=Make%20sure%20to%20press%20the,add%20a%20new%20MCP%20server)). Vid SSE, prova öppna `http://localhost:PORT/sse` i en webbläsare för att se om servern svarar (du bör få en heldragen anslutning). Vid STDIO, kör kommandot manuellt i terminal för att se eventuella felmeddelanden.

- **Fel: “Failed to connect” eller “SSE connection not established”:** Detta indikerar oftast transport-mismatch eller nätverksproblem. Exempel: Om du avser en lokal server men angav en URL i config försöker klienten SSE och misslyckas. Eller tvärtom, du angav ett kommando men servern försöker göra SSE-specifika handskakningar. **Lösning:** Säkerställ att du specificerat **rätt transport** i konfigurationen. För SSE, URL måste peka på din server + `/sse`-endpoint ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=Windsurf%20supports%20two%20transport%20types,sse)), och servern måste köra faktiskt SSE-server. För STDIO, använd `command`-fältet och låt bli att ange URL. Om du kör via VS Code `uvx`, se till att `uv` är installerat (en del av Astral-verktygen för MCP). Kontrollera även brandvägg – om VS Code försöker nå en extern URL, måste den vara åtkomlig (ingen lokal brandvägg som blockerar porten).

- **Servern startar men verktyg saknas eller felaktiga:** Ibland startar servern utan problem men agenten rapporterar att verktyget inte finns när du försöker använda det. Detta kan inträffa om verktygsdefinitionerna inte skickats korrekt vid initiering. **Lösning:** Dubbelkolla att du registrerat verktygen i serverkoden. Om du använt Python SDK, se till att du anropar t.ex. `mcp.run()` eller motsvarande för att faktiskt starta lyssningen efter att ha definierat verktygen – annars kanske scriptet avslutas innan servern körts. I Node, se till att du skickar ett **offer** (erbjudande om verktyg) initialt. Community-servrar brukar sköta detta, men om du implementerar själv, kan du behöva skicka ett `{"jsonrpc":"2.0","method":"offer","params":{...}}` med verktygslistan. Använd gärna en befintlig implementation som mall för formatet. När verktygen väl är korrekt exponerade bör de synas i verktygslistan (VS Code har en verktygsikon i chatten för att lista dem ([Extending Copilot Chat with the Model Context Protocol (MCP) - GitHub Docs](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp#:~:text=Image%3A%20Screenshot%20of%20the%20Copilot,is%20outlined%20in%20dark%20orange))). 

- **Miljövariabler saknas (authentication error):** Om du får svar som tyder på att DataForSEO nekade anropet (t.ex. 401 Unauthorized eller liknande), eller om server-loggen klagar på saknat login, så har troligen inte API-credentials förts vidare. **Lösning:** Kontrollera att du satte `DATAFORSEO_LOGIN`/`PASSWORD` antingen som globala env. variabler innan du startade editorn, eller i konfigurationsfilen. I Windsurf, edita `mcp_config.json` och lägg till under `"env"` för servern ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=%7B%20%22mcpServers%22%3A%20%7B%20%22google,maps%22%20%5D%2C%20%22env%22%3A)). I VS Code, om du använde `promptString`, se till att du verkligen matade in rätt värde när du startade servern (du kan behöva stoppa och starta om för att få prompten igen). Ett annat tips är att testa servern fristående med samma miljö – kör ex. `npm start` manuellt – för att säkerställa att den kan läsa variablerna i den kontext du tror. Efter fix, starta om MCP-servern.

- **Verktygsanrop fastnar eller tar för lång tid:** Om agenten verkar hänga sig när den kör ett verktyg (ingen respons i chatten under lång tid), kan orsaken vara att DataForSEO-anropet tar lång tid eller att ett undantag inte hanteras. **Lösning:** Kolla serverns loggar (om du har debug-utskrifter). DataForSEO:s *standard*-metoder (task-post) levererar inte resultat direkt utan kräver ett uppföljande GET – se till att du använder *live*-endpoints för att få direktresultat om möjligt, annars kan din funktion behöva polla efter task-resultat (vilket inte är trivialt inom en enkel verktygskörning). För långa operationer, överväg att begränsa omfattningen – t.ex. hämta färre resultat. Ibland kan AI-agenten också skicka orealistiskt breda förfrågningar (t.ex. “hämta alla bakåtlänkar för hela webben”) – du kan bygga in försvar genom att validera parametrar och returnera ett fel/förklaring i sådana fall, snarare än att försöka utföra något omöjligt. Som en riktlinje, designa verktygen för att slutföras inom kanske **5–10 sekunder**; allt över ~30 sek riskerar timeout i agenten. 

- **Konflikter med flera MCP-servrar:** Om du har konfigurerat många MCP-servrar samtidigt kan det bli rörigt. Windsurf har en gräns på 50 verktyg totalt ([Cascade MCP Integration](https://docs.codeium.com/windsurf/mcp#:~:text=servers%20at%20one%20time%20is,limited%20to%2050)), så om din DataForSEO-server tillsammans med andra servrar överskrider det kan den sista servern ignoreras. **Lösning:** Ta bort onödiga/duplikata servrar, eller inaktivera några verktyg (om din server har modulär konfiguration kan du kanske stänga av vissa). Generellt är det bäst att börja med en server i taget. 

- **Agenten frågar inte om verktyget:** I vissa fall kan AI-agenten *låta bli* att använda verktyget även om det vore relevant, eller inte fråga om tillåtelse. Detta kan vara bero på agentens prompt/historik. Copilot Agenten behöver ofta en hint. **Lösning:** Du kan explicit fråga agenten i chatten: *“Kan du använda verktyget X för detta?”* eller nämna verktygsnamnet. I Cursor/Windsurf kan man även uppdatera en `.cursorrules`-fil med hintar för när verktygen ska användas ([GitHub - yeakub108/mcp-server: MCP Server for Windsurf](https://github.com/yeakub108/mcp-server#:~:text=The%20agent%20will%20ask%20for,before%20making%20any%20tool%20calls)). Detta är mer av AI-styrningsproblem än tekniskt fel – men värt att nämna. Testa ge agenten tydliga uppmaningar.

Slutligen, att bygga en MCP-server med DataForSEO-integrering kan verka komplext, men genom att följa stegen ovan och vara medveten om språkskillnader, hosting-alternativ och integrationens krav blir det hanterbart. Du får då en kraftfull skräddarsydd “SEO-assistent” direkt i din utvecklingsmiljö – som med naturligt språk kan dra nytta av DataForSEO:s rika data ([DataForSEO MCP server for AI agents](https://playbooks.com/mcp/skobyn-dataforseo-seo#:~:text=This%20MCP%20server%20for%20SEO,more%20through%20natural%20language%20interactions)). Lycka till med implementationen! Skulle problem uppstå, finns en aktiv community kring MCP (t.ex. Anthropic’s forum, GitHub-repo för MCP-servrar ([Extending Copilot Chat with the Model Context Protocol (MCP) - GitHub Docs](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp#:~:text=server%20allows%20you%20to%20use,customize%20and%20enhance%20your%20experience))) där du kan få support och idéer. Med tiden kan du även bygga ut din MCP-server med fler verktyg eller koppla fler API:er – möjligheterna är stora när AI-agenten kan agera över flera kommandon (därav namnet Multi-Command Provider).🚀

