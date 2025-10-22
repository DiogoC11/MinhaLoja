# Minha Loja (versão estática)

Uma loja simples em página única (SPA) feita com HTML, CSS e JavaScript puro. Não precisa de Node ou servidor – basta abrir o arquivo `index.html` no navegador.

## Recursos
 - Página Admin para adicionar produtos, exportar JSON e importar JSON

## Como executar
1. Abra a pasta do projeto: `c:\Users\admin\Desktop\minha-loja`
2. Clique duas vezes em `index.html` para abrir no seu navegador (Chrome, Edge ou Firefox)

Opcionalmente, você pode usar a extensão "Live Server" do VS Code para recarregar automaticamente ao salvar.

## Estrutura
   - Inclui a página `#/admin` para cadastrar produtos e exportar/importar JSON

## Próximos passos (opcional)
Se quiser evoluir para uma stack moderna com build, recomendo:

1. Instalar o Node.js (LTS) no Windows:
   - Acesse https://nodejs.org/ e baixe a versão LTS
   - Instale com o instalador padrão (Next → Next → Finish)
   - Reinicie o terminal e confirme:
     - `node -v`
     - `npm -v`

2. Migrar para React + Vite + TypeScript:
   - Criaremos páginas e componentes equivalentes (Home, Produtos, Carrinho)
   - Usaremos Context API para o carrinho
   - Tailwind CSS para estilização
   - Integração futura com gateway de pagamento (ex.: Stripe)

Se quiser que eu faça essa migração automaticamente assim que o Node estiver instalado, me avise que eu cuido de tudo por aqui.

## Limites do navegador e arquivo JSON
Browsers não podem gravar diretamente em arquivos do seu disco sem um servidor. Por isso, a página Admin salva os produtos no `localStorage` e oferece:
- Exportar JSON: baixa um arquivo `produtos.json` com todos os produtos (mock + cadastrados).
- Importar JSON: seleciona um arquivo `.json` e carrega os produtos de volta para o app.

Se você precisa salvar automaticamente em um arquivo `.json` local sem intervenção, precisamos de um pequeno servidor (por exemplo, Node/Express). Posso montar isso para você quando o Node estiver instalado.
