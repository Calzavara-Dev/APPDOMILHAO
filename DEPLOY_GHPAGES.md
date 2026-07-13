# 🚀 Guia Completo para Publicar no GitHub Pages

O aplicativo foi **totalmente configurado** e testado para rodar no **GitHub Pages** como site estático rápido e otimizado (`output: 'export'`).

Você tem **duas formas** de publicar no GitHub Pages. Escolha a que preferir:

---

## 🟢 Opção 1: Automática via GitHub Actions (Recomendado)

Criamos automaticamente o arquivo de pipeline em [deploy.yml](file:///c:/Users/NEXTSTAGE/Desktop/ERICK/3%20app%20-%20Copia/.github/workflows/deploy.yml). Com ele, sempre que você fizer um `git push`, o GitHub publica seu site sozinho!

### Passo a Passo:

1. **Suba o seu projeto para o GitHub**:
   ```bash
   git add .
   git commit -m "Configura deploy para GitHub Pages"
   git push origin main
   ```

2. **Ative o GitHub Pages nas configurações do seu repositório no GitHub**:
   - Acesse o seu repositório no GitHub.
   - Vá em **Settings** (Configurações) ➔ **Pages** no menu lateral esquerdo.
   - Em **Build and deployment** ➔ **Source**, selecione **GitHub Actions**.
   - Pronto! Em cerca de 1 a 2 minutos, o GitHub vai rodar o build e publicar seu app no endereço `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

> [!TIP]
> **Ajuste de Caminho (Subdiretório):**
> Se o site for publicado em `https://SEU-USUARIO.github.io/NOME-DO-REPO/` (ou seja, dentro do subdiretório do repositório), basta definir a variável `NEXT_PUBLIC_BASE_PATH` com o nome do seu repositório no arquivo [.github/workflows/deploy.yml](file:///c:/Users/NEXTSTAGE/Desktop/ERICK/3%20app%20-%20Copia/.github/workflows/deploy.yml#L27) ou no próprio terminal ao compilar:
> ```bash
> NEXT_PUBLIC_BASE_PATH=/nome-do-seu-repositorio npm run build
> ```

---

## 🟡 Opção 2: Direto pelo Terminal (Comando Único)

Se preferir publicar direto do seu computador usando a ferramenta `gh-pages`:

1. No terminal, dentro da pasta do projeto, execute:
   ```bash
   npm run deploy
   ```
2. Esse comando irá:
   - Compilar o projeto (`npm run build`) gerando a pasta estática `out/`.
   - Incluir o arquivo `.nojekyll` para que o GitHub Pages não ignore os arquivos do Next.js.
   - Publicar automaticamente o conteúdo na branch `gh-pages` do seu repositório.

3. No GitHub, vá em **Settings** ➔ **Pages** e selecione a branch `gh-pages` como origem.

---

## 📦 O que foi modificado e preparado

- [next.config.js](file:///c:/Users/NEXTSTAGE/Desktop/ERICK/3%20app%20-%20Copia/next.config.js): Adicionado `output: 'export'`, suporte a `basePath` dinâmico e `images: { unoptimized: true }`.
- [.github/workflows/deploy.yml](file:///c:/Users/NEXTSTAGE/Desktop/ERICK/3%20app%20-%20Copia/.github/workflows/deploy.yml): Workflow oficial do GitHub Actions para Next.js no Pages.
- [public/.nojekyll](file:///c:/Users/NEXTSTAGE/Desktop/ERICK/3%20app%20-%20Copia/public/.nojekyll): Arquivo necessário para o GitHub Pages não ignorar os arquivos estáticos na pasta `_next/`.
- [package.json](file:///c:/Users/NEXTSTAGE/Desktop/ERICK/3%20app%20-%20Copia/package.json): Adicionado comando facilitador `"deploy": "next build && npx -y gh-pages -d out --dotfiles"`.
