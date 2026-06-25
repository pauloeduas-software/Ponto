# Design System — Chronos Mono Blue

> Referência de design para qualquer aplicação web ou sistema.
> Coloque em `docs/design-system.md`. Não é específico de domínio — serve para dashboards, sistemas de gestão, ferramentas internas, SaaS, portais, e qualquer interface que exija estética técnica e premium.

---

## Filosofia Visual

**Chronos Mono Blue** é um sistema de design dark mode de alta densidade informacional. Não é decorativo — cada decisão existe para tornar dados legíveis e ações claras.

Cinco princípios guiam todas as decisões:

1. **Um único acento.** Apenas `#0066ff`. Nenhuma segunda cor de destaque. Isso garante que qualquer elemento azul seja imediatamente lido como "acionável" ou "ativo".
2. **Tipografia funcional dupla.** Sans-serif para interface, monospace para dados. O usuário distingue instintivamente o que é navegação e o que é informação.
3. **Superfície, não profundidade.** Glassmorphism contido — translucidez sem blur excessivo. Contraste sempre preservado.
4. **Microinteração em tudo.** Hover, foco, entrada, saída. Nenhum elemento é estático. A interface responde antes do usuário perceber que está esperando.
5. **Mobile por degradação controlada.** No desktop, a experiência é densa. No mobile, remove-se ruído visual (blur, noise, bordas) e reorganiza-se o layout — nunca se reduz funcionalidade.

---

## 1. Fontes

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

| Fonte | Papel | Quando usar |
|---|---|---|
| `Plus Jakarta Sans` | Interface | Títulos, labels, navegação, botões, qualquer texto de UI |
| `Inter` | Corpo | Parágrafos, subtítulos, descrições longas |
| `JetBrains Mono` | Dados | **Exclusivamente** números, códigos, métricas, valores técnicos |

> **Regra crítica:** `JetBrains Mono` nunca aparece em texto de UI — apenas em dados. A distinção visual entre "o que o sistema diz" e "o que o sistema mostra" é intencional.

---

## 2. Tokens de Design

Cole no topo do CSS global. Tudo no projeto referencia estas variáveis — nunca valores hardcoded.

```css
:root {
  /* Acento único */
  --primary:      #0066ff;
  --primary-glow: rgba(0, 102, 255, 0.12);
  --secondary:    #0044cc;

  /* Fundos */
  --bg:       #090b0e;
  --card-bg:  #0f1217;

  /* Hierarquia de texto — 3 níveis */
  --text:       #f3f5f8;  /* principal */
  --text-muted: #8e99a7;  /* secundário */
  --text-dim:   #556070;  /* terciário / desativado */

  /* Semântica */
  --success: #00d084;
  --error:   #ff4a5a;
  --warning: #ffb700;

  /* Superfícies */
  --glass-border:  rgba(255, 255, 255, 0.08);
  --border-focus:  rgba(0, 102, 255, 0.4);
  --surface:       rgba(255, 255, 255, 0.03);
  --surface-light: rgba(255, 255, 255, 0.06);

  /* Espaçamento — escala 8pt */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
  --space-8: 64px;
}
```

---

## 3. CSS Global Base

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
}

html, body {
  height: 100vh;
  width: 100vw;
}

body {
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* Textura de ruído — profundidade sem peso visual */
/* Removida no mobile por performance (ver seção responsivo) */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
  opacity: 0.5;
}

h1, h2, h3 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
}

h1 { font-size: 3rem;   font-weight: 500; line-height: 1.1; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.1rem; font-weight: 600; }

::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 8px; }
* { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
```

---

## 4. Layout — Sidebar + Page Shell

Padrão de layout para qualquer sistema com navegação lateral. A sidebar colapsa em ícones por padrão e expande ao clicar.

### Estrutura HTML

```html
<aside class="sidebar">
  <div class="sidebar-top">
    <button class="sidebar-toggle"><!-- ícone hambúrguer --></button>
    <nav class="sidebar-nav">
      <a href="/" class="sidebar-link active">
        <!-- ícone SVG ou componente -->
        <span class="sidebar-text">Início</span>
      </a>
      <a href="/secao" class="sidebar-link">
        <!-- ícone -->
        <span class="sidebar-text">Seção</span>
      </a>
    </nav>
  </div>
  <div class="sidebar-bottom">
    <!-- perfil do usuário, logout, configurações -->
  </div>
</aside>

<div class="page-shell">
  <div class="page-topbar">
    <div class="page-topbar-left">
      <h1 class="page-title">Nome da Seção</h1>
      <p class="page-subtitle">Descrição opcional</p>
    </div>
    <div class="page-topbar-right">
      <!-- ações globais da página: botões, filtros, perfil -->
    </div>
  </div>
  <div class="page-content">
    <main class="page-main">
      <!-- conteúdo -->
    </main>
  </div>
</div>
```

### CSS — Sidebar

```css
.sidebar {
  position: fixed;
  left: 0; top: 0;
  height: 100vh;
  width: 72px;
  background: var(--bg);
  border-right: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  padding: var(--space-5) 0 var(--space-4) 0;
  z-index: 1000;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.expanded { width: 240px; }

.sidebar-top    { display: flex; flex-direction: column; }
.sidebar-nav    { display: flex; flex-direction: column; gap: var(--space-1); }
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--glass-border);
  padding-top: var(--space-3);
}

.sidebar-toggle {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  width: 44px; height: 44px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto var(--space-3) auto;
  transition: all 0.2s ease;
}
.sidebar.expanded .sidebar-toggle {
  width: calc(100% - 28px);
  margin-left: 14px;
  justify-content: flex-start;
  padding-left: 10px;
}
.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.sidebar-link {
  color: var(--text-muted);
  width: 44px; height: 44px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
  text-decoration: none;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.sidebar.expanded .sidebar-link {
  width: calc(100% - 28px);
  margin: 0 14px;
  justify-content: flex-start;
  padding-left: 10px;
}
.sidebar-link:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
}
.sidebar-link.active {
  color: var(--primary);
  background: transparent;
}
/* Indicador de item ativo — linha vertical à esquerda */
.sidebar-link.active::before {
  content: "";
  position: absolute;
  left: -14px; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 20px;
  background: var(--primary);
  border-radius: 0 4px 4px 0;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-text {
  margin-left: 16px;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.sidebar.expanded .sidebar-text {
  opacity: 1;
  transition-delay: 0.1s;
}
```

### CSS — Page Shell

```css
.page-shell {
  width: 100%;
  padding-left: 72px; /* offset da sidebar colapsada */
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 32px 24px;
  flex-shrink: 0;
}
.page-topbar-left  { display: flex; flex-direction: column; gap: 4px; }
.page-topbar-right { display: flex; align-items: center; gap: 16px; }

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.page-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-family: 'Inter', sans-serif;
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.page-main {
  flex: 1;
  padding: 0 32px 32px;
  overflow-y: auto;
}
```

---

## 5. Componentes

### Card

Container padrão para qualquer bloco de conteúdo delimitado.

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: var(--space-5) var(--space-6);
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Variante centralizada — para páginas com formulário único */
.card-centered {
  width: 100%;
  max-width: 580px;
  height: fit-content;
}

/* Variante com glassmorphism — para modais e overlays */
.card-glass {
  background: rgba(15, 18, 23, 0.75);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.1),
    0 20px 50px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

### Header de Seção

```css
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-5);
}
.section-header-actions { display: flex; gap: 12px; }

.section-title {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 8px;
  margin-bottom: 16px;
}
```

### Botões

```css
/* Primário — outline por padrão, fill no hover */
.btn {
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: 1px solid var(--primary);
  background: transparent;
  color: var(--primary);
}
.btn:hover {
  background: var(--primary);
  color: white;
  box-shadow: 0 0 16px var(--primary-glow);
}
.btn:active { opacity: 0.85; transform: scale(0.98); }

/* Variante sólida — para ações de alta prioridade (ex: login, confirmação) */
.btn-solid {
  background: var(--primary);
  color: white;
  border: none;
}
.btn-solid:hover { filter: brightness(1.1); transform: translateY(-1px); }

/* Variante ghost — baixa prioridade */
.btn-ghost {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  color: var(--text);
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

/* Variante destrutiva */
.btn-danger {
  border-color: var(--error);
  color: var(--error);
}
.btn-danger:hover {
  background: var(--error);
  color: white;
  box-shadow: 0 0 16px rgba(255, 74, 90, 0.15);
}

/* Ícone isolado */
.btn-icon {
  width: 40px; height: 40px;
  padding: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  color: var(--text);
}
.btn-icon:hover {
  background: var(--primary);
  border-color: var(--primary);
  transform: translateY(-2px);
}

/* Adicionar / criar — borda tracejada */
.btn-add {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1px dashed var(--glass-border);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s;
}
.btn-add:hover {
  border-color: var(--primary);
  color: var(--primary);
}
```

### Campos de Formulário

```css
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.form-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input,
.select {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--text);
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
  outline: none;
}
.input:focus,
.select:focus {
  border-color: var(--primary);
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.08);
}
.input::placeholder { color: var(--text-dim); }

/* Input com ícone prefixado */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-wrapper .input-icon {
  position: absolute;
  left: 16px;
  color: var(--text-muted);
  pointer-events: none;
  transition: color 0.2s;
}
.input-wrapper:focus-within .input-icon { color: var(--primary); }
.input-wrapper .input { padding-left: 48px; }

.select { appearance: none; cursor: pointer; }
```

### Dados e Métricas

> Para exibição de qualquer valor numérico em destaque — KPIs, estatísticas, totais.

```css
/* Grid de métricas */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.metric-card {
  background: var(--surface);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s;
}
.metric-card:hover {
  background: var(--surface-light);
  transform: translateY(-2px);
}

.metric-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

/* Variante com glow — para o valor principal da tela */
.metric-value-hero {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--text);
  text-shadow: 0 0 20px var(--primary-glow), 0 0 40px rgba(0, 102, 255, 0.06);
}

.metric-value.positive { color: var(--success); }
.metric-value.negative { color: var(--error); }
.metric-value.accent   { color: var(--primary); }
```

### Badges e Tags

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.badge-primary { background: rgba(0, 102, 255, 0.12);  color: var(--primary); border: 1px solid rgba(0, 102, 255, 0.2); }
.badge-success { background: rgba(0, 208, 132, 0.12);  color: var(--success); border: 1px solid rgba(0, 208, 132, 0.2); }
.badge-error   { background: rgba(255, 74, 90, 0.12);  color: var(--error);   border: 1px solid rgba(255, 74, 90, 0.2); }
.badge-warning { background: rgba(255, 183, 0, 0.12);  color: var(--warning); border: 1px solid rgba(255, 183, 0, 0.2); }
.badge-neutral { background: transparent; color: var(--text-dim); border: 1px solid var(--glass-border); }

/* Tag de valor positivo/negativo — usa JetBrains Mono */
.tag-value {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}
.tag-value.positive { background: rgba(0, 208, 132, 0.12); color: var(--success); border: 1px solid rgba(0, 208, 132, 0.2); }
.tag-value.negative { background: rgba(255, 74, 90, 0.12);  color: var(--error);   border: 1px solid rgba(255, 74, 90, 0.2); }
```

### Info Box

> Exibe um dado isolado com label + valor. Elevação no hover indica interatividade.

```css
.info-box {
  background: var(--surface);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s;
}
.info-box:hover {
  background: var(--surface-light);
  border-color: rgba(255, 255, 255, 0.14);
  transform: translateY(-2px);
}
.info-box-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.info-box-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  font-family: 'JetBrains Mono', monospace;
}
```

### Nota / Destaque com Borda Lateral

> Para observações, avisos, citações ou qualquer conteúdo que mereça atenção sem interromper o fluxo.

```css
.callout {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.015);
  border-left: 3px solid var(--primary);
  border-radius: 0 8px 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.callout.warning { border-left-color: var(--warning); }
.callout.error   { border-left-color: var(--error); }
.callout.success { border-left-color: var(--success); }

.callout-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
}
.callout-text {
  font-size: 0.9rem;
  color: rgba(243, 245, 248, 0.85);
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}
```

### Feedback — Banners

```css
.banner {
  padding: 12px 16px;
  border-radius: 8px;
  display: flex; align-items: center; gap: 10px;
  font-size: 0.85rem;
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.3s ease;
}
.banner-error   { background: rgba(255, 74, 90, 0.1);   border: 1px solid rgba(255, 74, 90, 0.2);   color: #fca5a5; }
.banner-success { background: rgba(0, 208, 132, 0.1);   border: 1px solid rgba(0, 208, 132, 0.2);   color: #6ee7b7; }
.banner-warning { background: rgba(255, 183, 0, 0.1);   border: 1px solid rgba(255, 183, 0, 0.2);   color: #fcd34d; }
.banner-info    { background: rgba(0, 102, 255, 0.08);  border: 1px solid rgba(0, 102, 255, 0.15);  color: #93c5fd; }
```

---

## 6. Modal

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 10, 0.55);
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal {
  background: rgba(15, 18, 23, 0.75);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 32px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.1),
    0 20px 50px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: modalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}
.modal.large { max-width: 700px; }
.modal.small { max-width: 360px; }

.modal-close {
  position: absolute;
  top: 24px; right: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-close:hover {
  background: rgba(255, 74, 90, 0.12);
  color: var(--error);
  border-color: rgba(255, 74, 90, 0.25);
  transform: rotate(90deg);
}

.modal-header { margin-bottom: 24px; }
.modal-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  display: flex; align-items: center; gap: 12px;
  letter-spacing: -0.01em;
}

@media (max-width: 600px) {
  .modal-overlay { padding: 0; }
  .modal {
    height: 100dvh;
    max-height: 100dvh;
    max-width: 100%;
    border-radius: 0;
    border: none;
    padding: 60px 16px 24px;
    background: var(--bg);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
  }
  .modal-close { top: 16px; right: 16px; }
}
```

---

## 7. Página de Login / Autenticação

```css
.auth-container {
  min-height: 100vh;
  width: 100%;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: rgba(17, 24, 39, 0.6);
  border: 1px solid var(--glass-border);
  padding: 48px 40px;
  border-radius: 8px;
  animation: modalIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.auth-header { text-align: center; margin-bottom: 40px; }

.auth-logo {
  width: 64px; height: 64px;
  background: var(--primary);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
  color: white;
}

.auth-header h1 { font-size: 2rem; margin-bottom: 8px; }
.auth-header p  { color: var(--text-muted); font-size: 0.9rem; }

.auth-form { display: flex; flex-direction: column; gap: 20px; }

.auth-submit {
  height: 56px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  transition: all 0.3s;
  margin-top: 8px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.auth-submit:hover    { transform: translateY(-2px); filter: brightness(1.1); }
.auth-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

.auth-footer { margin-top: 32px; text-align: center; }
.auth-footer button {
  background: none; border: none;
  color: var(--text-muted);
  font-size: 0.9rem; cursor: pointer;
  transition: color 0.2s;
}
.auth-footer button:hover { color: var(--primary); text-decoration: underline; }
```

---

## 8. Animações

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

.animate-spin   { animation: spin 1s linear infinite; }
.animate-pulse  { animation: pulse 2s ease infinite; }
.animate-fadein { animation: fadeIn 0.3s ease forwards; }
```

| Curva | Valor | Contexto |
|---|---|---|
| Bounce — entrada com impacto | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Modais, cards de autenticação |
| Layout — transições de estrutura | `cubic-bezier(0.4, 0, 0.2, 1)` | Sidebar expand, page transitions |
| UI — microinterações rápidas | `cubic-bezier(0.16, 1, 0.3, 1)` | Botões, inputs, hovers |

---

## 9. Responsivo — Mobile

Breakpoint principal: `800px`. Breakpoint de modal: `600px`.

```css
@media (max-width: 800px) {

  /* Sidebar lateral → bottom navigation bar */
  .sidebar {
    top: auto; bottom: 0; left: 0; right: 0;
    flex-direction: row !important;
    width: 100% !important;
    height: auto !important;
    padding: 10px 16px !important;
    padding-bottom: calc(10px + env(safe-area-inset-bottom)) !important;
    border-top: 1px solid var(--glass-border);
    border-right: none;
    justify-content: space-between !important;
  }
  .sidebar-top    { flex-direction: row !important; flex: 1; align-items: center; }
  .sidebar-nav    { flex-direction: row !important; flex: 1; justify-content: space-around; gap: 0 !important; }
  .sidebar-bottom { flex-direction: row !important; border-top: none !important; padding-top: 0 !important; align-items: center; }
  .sidebar-toggle { display: none !important; }
  .sidebar-text   { display: none !important; }
  .sidebar-link   { width: 44px !important; height: 44px !important; margin: 0 !important; }

  /* Indicador ativo: linha horizontal em cima no bottom nav */
  .sidebar-link.active::before {
    left: 50% !important;
    top: -10px !important;
    transform: translateX(-50%) !important;
    width: 20px !important;
    height: 3px !important;
    border-radius: 0 0 4px 4px !important;
  }

  .page-shell  { padding-left: 0; }
  .page-topbar { padding: 24px 20px 16px; }
  .page-main   { padding: 0 20px 96px; } /* 96px = espaço do bottom nav */

  /* Cards ficam sem borda/radius no mobile — integram com o fundo */
  .card {
    border: none;
    border-radius: 0;
    box-shadow: none;
    backdrop-filter: none;
    padding: 20px 16px;
  }

  /* Remove efeitos pesados por performance */
  body::before      { display: none; }
  .card-glass       { backdrop-filter: none; -webkit-backdrop-filter: none; }

  h1      { font-size: 1.4rem; }
  .metrics-grid { grid-template-columns: 1fr 1fr; }
}
```

---

## 10. Referência Rápida

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#0066ff` | Todo elemento ativo, acionável ou em foco |
| `--primary-glow` | `rgba(0,102,255,0.12)` | Sombra de brilho — botões, números hero |
| `--bg` | `#090b0e` | Fundo da aplicação |
| `--card-bg` | `#0f1217` | Cards, painéis, áreas de conteúdo |
| `--text` | `#f3f5f8` | Texto principal |
| `--text-muted` | `#8e99a7` | Labels, subtítulos, ícones inativos |
| `--text-dim` | `#556070` | Texto desativado, títulos de seção interna |
| `--success` | `#00d084` | Positivo, concluído, aprovado |
| `--error` | `#ff4a5a` | Erro, negativo, rejeitado |
| `--warning` | `#ffb700` | Alerta, pendente, atenção |
| `--glass-border` | `rgba(255,255,255,0.08)` | Bordas de cards e divisores |
| `--surface` | `rgba(255,255,255,0.03)` | Camada interna mais escura |
| `--surface-light` | `rgba(255,255,255,0.06)` | Camada interna levemente mais clara |

### Hierarquia Tipográfica

| Nível | Tamanho | Peso | Fonte | Uso |
|---|---|---|---|---|
| Display / Hero | `3rem` | 500 | Plus Jakarta Sans | Título principal de uma página centralizada |
| Topbar | `1.25rem` | 700 | Plus Jakarta Sans | Título uppercase da seção atual |
| Modal / H2 | `1.35rem` | 700 | Plus Jakarta Sans | Título de modal ou card |
| H3 / Subtítulo | `1.1rem` | 600 | Plus Jakarta Sans | — |
| Label de campo | `0.75rem` | 600 | Plus Jakarta Sans | Uppercase + letter-spacing |
| Label de métrica | `0.65rem` | 700 | Plus Jakarta Sans | Uppercase |
| Corpo | `1rem` | 400 | Inter | Parágrafos, descrições |
| Corpo menor | `0.85–0.9rem` | 400 | Inter | Legendas, notas, rodapés |
| Dado numérico | qualquer | 700 | **JetBrains Mono** | Sempre que for um número significativo |

### Espaçamento (8pt)

| Token | Valor | Uso típico |
|---|---|---|
| `--space-1` | `8px` | Gap mínimo entre elementos |
| `--space-2` | `16px` | Gap interno de componentes |
| `--space-3` | `24px` | Padding de seções compactas |
| `--space-4` | `32px` | Padding padrão de página |
| `--space-5` | `40px` | Margin-bottom de cabeçalhos |
| `--space-6` | `48px` | Padding de cards grandes |
| `--space-8` | `64px` | Separação entre blocos maiores |

### Regras Inegociáveis

| Decisão | Regra |
|---|---|
| Cor de acento | Somente `--primary`. Nenhuma segunda cor de destaque. |
| Números | Sempre `JetBrains Mono`. Nunca misturar com fonte de UI. |
| Botão principal | Outline por padrão. Fill somente no hover ou em ações de máxima prioridade. |
| Bordas | `1px solid var(--glass-border)`. Nunca borda mais espessa ou mais opaca. |
| Glassmorphism | Translucidez nas superfícies. Blur apenas em overlays e modais. |
| Foco | Borda `--primary` + `box-shadow` de glow sutil. Nunca outline padrão do browser. |
| Badges e tags | Bg translúcido da cor semântica + borda da mesma cor com 20% de opacidade. |
| Modal no mobile | Fullscreen (`100dvh`). Sem blur, sem borda, sem border-radius. |
| Sidebar no mobile | Bottom nav. Toggle e labels de links desaparecem. |
| Performance mobile | Remove `backdrop-filter`, noise e `background-image` pesados. |
