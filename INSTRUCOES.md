# 🚀 Instruções para Executar o App

## Passo a Passo Completo

### 1. Instalar Dependências
```bash
npm install
```

### 2. Executar o Projeto
```bash
npm run dev
```

### 3. Acessar no Navegador
Abra: `http://localhost:3000`

### 4. Testar no Smartphone
1. Descubra o IP da sua máquina:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`
2. Acesse no smartphone: `http://SEU_IP:3000`
3. Adicione à tela inicial para usar como app

## 📱 Funcionalidades do App

✅ **Análise de Pares de Ações**
- Seleção de duas ações brasileiras
- Cálculo automático do spread
- Análise de Z-Score em tempo real

✅ **Sinais de Trading**
- Alertas automáticos quando Z-Score > 2 ou < -2
- Som de notificação
- Indicadores visuais coloridos

✅ **Gráficos Interativos**
- Preços históricos das ações
- Evolução do spread
- Análise de Z-Score com limites

✅ **Otimizado para Mobile**
- Design responsivo
- Touch gestures otimizados
- PWA (Progressive Web App)
- Funciona offline após primeiro carregamento

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar versão de produção
npm start

# Verificar código
npm run lint
```

## 📊 Como Usar

1. **Selecionar Ações**: Use o menu hambúrguer para escolher duas ações
2. **Aguardar Carregamento**: Os dados históricos serão carregados automaticamente
3. **Monitorar Sinais**: Observe os alertas quando aparecerem sinais de trading
4. **Analisar Gráficos**: Use os gráficos para entender a evolução dos preços

## ⚠️ Importante

- O app usa dados reais da API Alpha Vantage
- Atualização automática a cada 60 segundos
- Funciona melhor com conexão à internet
- Compatível com iOS e Android

## 🆘 Solução de Problemas

**App não carrega?**
- Verifique se todas as dependências foram instaladas
- Confirme se a porta 3000 está livre

**Dados não aparecem?**
- Verifique sua conexão com a internet
- A API Alpha Vantage pode ter limites de uso

**Gráficos não funcionam?**
- Atualize a página
- Verifique se o JavaScript está habilitado

## 📞 Suporte

Se encontrar problemas, verifique:
1. Console do navegador (F12)
2. Logs do terminal onde executou `npm run dev`
3. Conexão com a internet
