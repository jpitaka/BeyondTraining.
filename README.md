# BeyondTraining ⚽

BeyondTraining é um protótipo de jogo narrativo sobre a carreira de um jogador de futebol.

O objetivo é viver momentos-chave dentro e fora de campo, tomando decisões que influenciam:
- Resultado dos jogos
- Moral
- Forma
- Evolução da carreira

Neste protótipo inicial, jogas o **primeiro jogo oficial** da tua carreira, com:
- Criação simples de jogador (nome + posição)
- Atributos base diferentes consoante a posição
- 3 destaques importantes do jogo (momentos de decisão)
- Resultado final e impacto em moral/forma

---

## Como correr o jogo

1. Faz download/clona este repositório.
2. Abre a pasta `BeyondTraining` no teu editor (ex.: VS Code).
3. Abre o ficheiro `index.html` num navegador (Chrome, Edge, Firefox, etc.)
   - Podes simplesmente arrastar o ficheiro `index.html` para o navegador
   - Ou usar uma extensão tipo **Live Server** no VS Code

---

## Estrutura do projeto

- `index.html`  
  Estrutura base da página e layout do jogo (painel do jogador + painel da história).

- `style.css`  
  Estilos visuais: cores, layout, responsividade, tipografia.

- `game.js`  
  Lógica do jogo:
  - Criação de jogador
  - Atributos e estado (stamina, moral, forma)
  - Fases do episódio:
    - Pré-jogo no balneário
    - Destaques do jogo (minutos 18, 55 e 82)
    - Resultado final

---

## Próximos passos planeados

Algumas ideias para evoluir o BeyondTraining:

- Guardar a carreira em `localStorage` (continuar de onde se parou)
- Vários jogos por época e tabela classificativa
- Sistema de treino entre jogos (melhorar atributos)
- Eventos fora de campo (imprensa, empresário, redes sociais, família)
- Lesões e gestão de risco

---

## Licença

Projeto pessoal em desenvolvimento.  
Por agora, uso apenas para estudo e prototipagem.
